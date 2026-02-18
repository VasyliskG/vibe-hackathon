const { Order, OrderStatus } = require('../../domain/Order');
const Location = require('../../domain/Location');
const logger = require('../../utils/logger');
const eventBus = require('../../realtime/eventBus/EventBus');

/**
 * Order Controller - Handles all order-related endpoints
 */
class OrderController {
  /**
   * GET /api/orders - Get all orders
   */
  static async getAllOrders(req, res, next) {
    try {
      const orders = req.app.locals.orders || [];
      const { status } = req.query;

      let filteredOrders = orders;
      if (status) {
        filteredOrders = orders.filter(o => o.status === status);
      }

      res.json({
        success: true,
        count: filteredOrders.length,
        data: filteredOrders.map(o => o.toJSON())
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/orders/:id - Get order by ID
   */
  static async getOrderById(req, res, next) {
    try {
      const { id } = req.params;
      const orders = req.app.locals.orders || [];
      const order = orders.find(o => o.id === id);

      if (!order) {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: `Order ${id} not found`
        });
      }

      res.json({
        success: true,
        data: order.toJSON()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/orders - Create new order
   */
  static async createOrder(req, res, next) {
    try {
      const { id, restaurantX, restaurantY, weight } = req.body;
      const orders = req.app.locals.orders || [];
      const queueManager = req.app.locals.queueManager;
      const dataService = req.app.locals.dataService;
      const cityMap = req.app.locals.cityMap;

      // Check if order ID already exists
      if (orders.some(o => o.id === id)) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: `Order with ID ${id} already exists`
        });
      }

      // Validate location is walkable
      if (!cityMap.isWalkable(restaurantX, restaurantY)) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: `Location (${restaurantX}, ${restaurantY}) is not walkable`
        });
      }

      // Create order
      const order = new Order(
        id,
        new Location(restaurantX, restaurantY),
        weight || 1
      );

      // Add to orders list
      orders.push(order);
      req.app.locals.orders = orders;

      // Add to queue
      queueManager.addOrder(order);

      // Save to persistence
      await dataService.saveOrders(orders);

      eventBus.publish({
        type: 'ORDER_CREATED',
        data: { orderId: id, weight: order.weight }
      });

      logger.info('Order created', { orderId: id, weight, status: order.status });

      res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: order.toJSON()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/orders/:id/assign - Manually assign order to courier
   */
  static async assignOrder(req, res, next) {
    try {
      const { id } = req.params;
      const { courierId } = req.body;
      const orders = req.app.locals.orders || [];
      const couriers = req.app.locals.couriers || [];
      const queueManager = req.app.locals.queueManager;
      const dataService = req.app.locals.dataService;

      const order = orders.find(o => o.id === id);
      if (!order) {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: `Order ${id} not found`
        });
      }

      const courier = couriers.find(c => c.id === courierId);
      if (!courier) {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: `Courier ${courierId} not found`
        });
      }

      // Check if courier is free
      if (!courier.isFree()) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: `Courier ${courierId} is not available`
        });
      }

      // Check if courier can carry weight
      if (!courier.canCarryWeight(order.weight)) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: `Courier ${courierId} cannot carry weight ${order.weight}kg`
        });
      }

      // Assign order
      order.assignToCourier(courierId);
      courier.assignOrder(order.id);

      // Remove from queue if it was there
      queueManager.removeOrder(order.id);

      // Save changes
      await Promise.all([
        dataService.saveOrders(orders),
        dataService.saveCouriers(couriers)
      ]);

      eventBus.publish({
        type: 'ORDER_ASSIGNED',
        data: { orderId: id, courierId }
      });

      logger.info('Order assigned', { orderId: id, courierId });

      res.json({
        success: true,
        message: 'Order assigned successfully',
        data: {
          order: order.toJSON(),
          courier: courier.toJSON()
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/orders/:id/status - Update order status
   */
  static async updateOrderStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const orders = req.app.locals.orders || [];
      const couriers = req.app.locals.couriers || [];
      const dataService = req.app.locals.dataService;

      const order = orders.find(o => o.id === id);
      if (!order) {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: `Order ${id} not found`
        });
      }

      // Update status based on transition
      switch (status) {
        case OrderStatus.PICKED_UP:
          order.markAsPickedUp();
          break;
        case OrderStatus.IN_TRANSIT:
          order.markAsInTransit();
          break;
        case OrderStatus.DELIVERED:
          order.markAsDelivered();
          // Free up courier
          const courier = couriers.find(c => c.id === order.assignedCourierId);
          if (courier) {
            courier.completeOrder();
            await dataService.saveCouriers(couriers);
          }
          eventBus.publish({
            type: 'ORDER_COMPLETED',
            data: { orderId: id, courierId: order.assignedCourierId }
          });
          break;
        case OrderStatus.CANCELLED:
          order.cancel();
          // Free up courier if assigned
          const assignedCourier = couriers.find(c => c.id === order.assignedCourierId);
          if (assignedCourier && !assignedCourier.isFree()) {
            assignedCourier._currentOrderId = null;
            assignedCourier.markAsFree();
            await dataService.saveCouriers(couriers);
          }
          eventBus.publish({
            type: 'ORDER_CANCELLED',
            data: { orderId: id }
          });
          break;
        default:
          return res.status(400).json({
            success: false,
            error: 'Bad Request',
            message: `Invalid status: ${status}`
          });
      }

      await dataService.saveOrders(orders);
      logger.info('Order status updated', { orderId: id, newStatus: status });

      res.json({
        success: true,
        message: 'Order status updated successfully',
        data: order.toJSON()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/orders/:id - Delete/cancel order
   */
  static async deleteOrder(req, res, next) {
    try {
      const { id } = req.params;
      const orders = req.app.locals.orders || [];
      const queueManager = req.app.locals.queueManager;
      const dataService = req.app.locals.dataService;

      const orderIndex = orders.findIndex(o => o.id === id);
      if (orderIndex === -1) {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: `Order ${id} not found`
        });
      }

      const order = orders[orderIndex];

      // Try to cancel if possible
      if (order.canBeCancelled()) {
        order.cancel();
        await dataService.saveOrders(orders);
        queueManager.removeOrder(id);

        eventBus.publish({
          type: 'ORDER_CANCELLED',
          data: { orderId: id }
        });

        logger.info('Order cancelled', { orderId: id });

        res.json({
          success: true,
          message: 'Order cancelled successfully',
          data: order.toJSON()
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: `Order ${id} cannot be cancelled in status ${order.status}`
        });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/orders/queue - Get current order queue
   */
  static async getQueue(req, res, next) {
    try {
      const queueManager = req.app.locals.queueManager;
      const queue = queueManager.getQueue();

      res.json({
        success: true,
        count: queue.length,
        data: queue.map(o => o.toJSON())
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = OrderController;

