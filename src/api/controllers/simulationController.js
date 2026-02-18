const SimulationService = require('../../simulation/SimulationService');

class SimulationController {
  static init(app) {
    if (!app.locals.simulationService) {
      app.locals.simulationService = new SimulationService({
        cityMap: app.locals.cityMap,
        dataService: app.locals.dataService,
        queueManager: app.locals.queueManager,
        ordersProvider: () => app.locals.orders || [],
        couriersProvider: () => app.locals.couriers || [],
        config: app.locals.config
      });
    }
  }

  static start(req, res, next) {
    try {
      SimulationController.init(req.app);
      const { ordersCount, couriersCount } = req.body;
      const result = req.app.locals.simulationService.start({
        ordersCount,
        couriersCount
      });

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static stop(req, res, next) {
    try {
      SimulationController.init(req.app);
      const result = req.app.locals.simulationService.stop();
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static status(req, res, next) {
    try {
      SimulationController.init(req.app);
      const result = req.app.locals.simulationService.status();
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = SimulationController;

