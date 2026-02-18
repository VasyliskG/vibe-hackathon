const { Courier, CourierStatus } = require('../../domain/Courier');
const Location = require('../../domain/Location');
const logger = require('../../utils/logger');
const eventBus = require('../../realtime/eventBus/EventBus');

/**
 * Courier Controller - Handles all courier-related endpoints
 */
class CourierController {
  /**
   * GET /api/couriers - Get all couriers
   */
  static async getAllCouriers(req, res, next) {
    try {
      const couriers = req.app.locals.couriers || [];
      const { status } = req.query;

      let filteredCouriers = couriers;
      if (status) {
        filteredCouriers = couriers.filter(c => c.status === status);
      }

      res.json({
        success: true,
        count: filteredCouriers.length,
        data: filteredCouriers.map(c => c.toJSON())
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/couriers/:id - Get courier by ID
   */
  static async getCourierById(req, res, next) {
    try {
      const { id } = req.params;
      const couriers = req.app.locals.couriers || [];
      const courier = couriers.find(c => c.id === id);

      if (!courier) {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: `Courier ${id} not found`
        });
      }

      res.json({
        success: true,
        data: courier.toJSON()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/couriers - Create new courier
   */
  static async createCourier(req, res, next) {
    try {
      const { id, x, y, transportType } = req.body;
      const couriers = req.app.locals.couriers || [];
      const dataService = req.app.locals.dataService;
      const cityMap = req.app.locals.cityMap;

      // Check if courier ID already exists
      if (couriers.some(c => c.id === id)) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: `Courier with ID ${id} already exists`
        });
      }

      // Validate location is walkable
      if (!cityMap.isWalkable(x, y)) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: `Location (${x}, ${y}) is not walkable`
        });
      }

      // Create courier
      const courier = new Courier(
        id,
        new Location(x, y),
        transportType,
        CourierStatus.FREE
      );

      // Add to couriers list
      couriers.push(courier);
      req.app.locals.couriers = couriers;

      // Save to persistence
      await dataService.saveCouriers(couriers);

      logger.info('Courier created', { courierId: id, transportType });

      eventBus.publish({
        type: 'COURIER_STATUS_CHANGED',
        data: { courierId: id, status: CourierStatus.FREE }
      });

      res.status(201).json({
        success: true,
        message: 'Courier created successfully',
        data: courier.toJSON()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/couriers/:id/location - Update courier location
   */
  static async updateLocation(req, res, next) {
    try {
      const { id } = req.params;
      const { x, y } = req.body;
      const couriers = req.app.locals.couriers || [];
      const dataService = req.app.locals.dataService;
      const cityMap = req.app.locals.cityMap;

      const courier = couriers.find(c => c.id === id);
      if (!courier) {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: `Courier ${id} not found`
        });
      }

      // Validate location is walkable
      if (!cityMap.isWalkable(x, y)) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: `Location (${x}, ${y}) is not walkable`
        });
      }

      courier.updateLocation(new Location(x, y));
      await dataService.saveCouriers(couriers);

      eventBus.publish({
        type: 'COURIER_STATUS_CHANGED',
        data: { courierId: id, status: courier.status, location: { x, y } }
      });

      logger.info('Courier location updated', { courierId: id, x, y });

      res.json({
        success: true,
        message: 'Courier location updated successfully',
        data: courier.toJSON()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/couriers/:id/status - Update courier status
   */
  static async updateStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const couriers = req.app.locals.couriers || [];
      const dataService = req.app.locals.dataService;

      const courier = couriers.find(c => c.id === id);
      if (!courier) {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: `Courier ${id} not found`
        });
      }

      if (status === CourierStatus.BUSY) {
        courier.markAsBusy();
      } else if (status === CourierStatus.FREE) {
        courier.markAsFree();
      } else {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: `Invalid status: ${status}`
        });
      }

      await dataService.saveCouriers(couriers);
      logger.info('Courier status updated', { courierId: id, newStatus: status });

      eventBus.publish({
        type: 'COURIER_STATUS_CHANGED',
        data: { courierId: id, status }
      });

      res.json({
        success: true,
        message: 'Courier status updated successfully',
        data: courier.toJSON()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/couriers/:id/reset-counter - Reset daily counter
   */
  static async resetDailyCounter(req, res, next) {
    try {
      const { id } = req.params;
      const couriers = req.app.locals.couriers || [];
      const dataService = req.app.locals.dataService;

      const courier = couriers.find(c => c.id === id);
      if (!courier) {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: `Courier ${id} not found`
        });
      }

      courier.resetDailyCounter();
      await dataService.saveCouriers(couriers);

      logger.info('Courier daily counter reset', { courierId: id });

      res.json({
        success: true,
        message: 'Daily counter reset successfully',
        data: courier.toJSON()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/couriers/:id - Delete courier
   */
  static async deleteCourier(req, res, next) {
    try {
      const { id } = req.params;
      const couriers = req.app.locals.couriers || [];
      const dataService = req.app.locals.dataService;

      const courierIndex = couriers.findIndex(c => c.id === id);
      if (courierIndex === -1) {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: `Courier ${id} not found`
        });
      }

      const courier = couriers[courierIndex];

      // Can't delete busy courier
      if (!courier.isFree()) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: `Courier ${id} is busy and cannot be deleted`
        });
      }

      couriers.splice(courierIndex, 1);
      req.app.locals.couriers = couriers;

      await dataService.saveCouriers(couriers);
      logger.info('Courier deleted', { courierId: id });

      res.json({
        success: true,
        message: 'Courier deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = CourierController;

