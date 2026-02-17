const logger = require('../../utils/logger');
const os = require('os');

/**
 * System Controller - Health checks, metrics, and system operations
 */
class SystemController {
  /**
   * GET /api/system/health - Health check endpoint
   */
  static async health(req, res) {
    const uptime = process.uptime();

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: `${Math.floor(uptime)}s`,
      environment: process.env.NODE_ENV || 'development',
      version: '4.0.0'
    });
  }

  /**
   * GET /api/system/metrics - System metrics
   */
  static async metrics(req, res, next) {
    try {
      const orders = req.app.locals.orders || [];
      const couriers = req.app.locals.couriers || [];
      const queueManager = req.app.locals.queueManager;

      // Order statistics
      const orderStats = {
        total: orders.length,
        pending: orders.filter(o => o.status === 'pending').length,
        assigned: orders.filter(o => o.status === 'assigned').length,
        pickedUp: orders.filter(o => o.status === 'picked_up').length,
        inTransit: orders.filter(o => o.status === 'in_transit').length,
        delivered: orders.filter(o => o.status === 'delivered').length,
        cancelled: orders.filter(o => o.status === 'cancelled').length,
        queueSize: queueManager.getQueueSize()
      };

      // Courier statistics
      const courierStats = {
        total: couriers.length,
        free: couriers.filter(c => c.isFree()).length,
        busy: couriers.filter(c => !c.isFree()).length,
        byTransport: {
          walker: couriers.filter(c => c.transportType.name === 'walker').length,
          bicycle: couriers.filter(c => c.transportType.name === 'bicycle').length,
          scooter: couriers.filter(c => c.transportType.name === 'scooter').length,
          car: couriers.filter(c => c.transportType.name === 'car').length
        },
        totalCompletedToday: couriers.reduce((sum, c) => sum + c.completedOrdersToday, 0)
      };

      // System statistics
      const systemStats = {
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          unit: 'MB'
        },
        cpu: {
          loadAverage: os.loadavg(),
          cores: os.cpus().length
        },
        uptime: Math.floor(process.uptime())
      };

      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        data: {
          orders: orderStats,
          couriers: courierStats,
          system: systemStats
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/system/auto-assign - Auto-assign pending orders
   */
  static async autoAssign(req, res, next) {
    try {
      const queueManager = req.app.locals.queueManager;
      const assignmentService = req.app.locals.assignmentService;
      const couriers = req.app.locals.couriers || [];
      const orders = req.app.locals.orders || [];
      const dataService = req.app.locals.dataService;

      const results = [];
      const queueSize = queueManager.getQueueSize();

      if (queueSize === 0) {
        return res.json({
          success: true,
          message: 'No pending orders in queue',
          assigned: 0,
          results: []
        });
      }

      // Try to assign orders from queue
      while (queueManager.getQueueSize() > 0) {
        const order = queueManager.peekNext();
        if (!order) break;

        try {
          const result = assignmentService.assignOrder(order, couriers);

          if (result.assigned) {
            // Assignment successful
            queueManager.removeOrder(order.id);
            results.push({
              orderId: order.id,
              courierId: result.courier.id,
              distance: result.distance,
              reason: result.reason,
              success: true
            });

            logger.info('Order auto-assigned', {
              orderId: order.id,
              courierId: result.courier.id,
              distance: result.distance
            });
          } else {
            // No suitable courier found
            results.push({
              orderId: order.id,
              success: false,
              reason: result.reason || 'No suitable courier available'
            });
            break; // Stop trying if no courier is available
          }
        } catch (error) {
          results.push({
            orderId: order.id,
            success: false,
            reason: error.message
          });
          logger.error('Failed to auto-assign order', { orderId: order.id, error: error.message });
        }
      }

      // Save updated state
      await Promise.all([
        dataService.saveOrders(orders),
        dataService.saveCouriers(couriers)
      ]);

      const assignedCount = results.filter(r => r.success).length;

      res.json({
        success: true,
        message: `Auto-assigned ${assignedCount} order(s)`,
        assigned: assignedCount,
        remaining: queueManager.getQueueSize(),
        results
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/system/reset - Reset all data (for testing)
   */
  static async reset(req, res, next) {
    try {
      const dataService = req.app.locals.dataService;
      const queueManager = req.app.locals.queueManager;

      // Clear orders
      req.app.locals.orders = [];
      await dataService.saveOrders([]);

      // Clear queue
      while (queueManager.getQueueSize() > 0) {
        const order = queueManager.peekNext();
        if (order) queueManager.removeOrder(order.id);
      }

      // Reset courier counters
      const couriers = req.app.locals.couriers || [];
      couriers.forEach(c => {
        if (!c.isFree()) {
          c._currentOrderId = null;
          c._status = 'Free';
        }
        c.resetDailyCounter();
      });

      await dataService.saveCouriers(couriers);

      logger.warn('System reset performed');

      res.json({
        success: true,
        message: 'System reset successfully',
        data: {
          ordersCleared: true,
          queueCleared: true,
          couriersReset: couriers.length
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/system/info - System information
   */
  static async info(req, res) {
    const cityMap = req.app.locals.cityMap;

    res.json({
      success: true,
      data: {
        service: 'Vibe Delivery System',
        stage: '4 - Production Ready',
        version: '4.0.0',
        features: [
          'REST API',
          'Order Lifecycle Management',
          'JSON Persistence',
          'Winston Logging',
          'Health & Metrics',
          'ENV Configuration',
          'Automated Tests',
          'Error Handling',
          'Input Validation'
        ],
        map: {
          size: cityMap ? `${cityMap.width}x${cityMap.height}` : 'N/A',
          walkableCells: cityMap ? cityMap.countWalkable() : 0
        },
        config: {
          port: process.env.PORT || 3000,
          nodeEnv: process.env.NODE_ENV || 'development',
          logLevel: process.env.LOG_LEVEL || 'info',
          pathfinding: process.env.USE_PATHFINDING !== 'false'
        }
      }
    });
  }
}

module.exports = SystemController;

