const eventBus = require('../realtime/eventBus/EventBus');
const logger = require('../utils/logger');
const { Order } = require('../domain/Order');
const Location = require('../domain/Location');
const { Courier, CourierStatus } = require('../domain/Courier');

class SimulationService {
  constructor({ cityMap, dataService, queueManager, ordersProvider, couriersProvider, config }) {
    this._cityMap = cityMap;
    this._dataService = dataService;
    this._queueManager = queueManager;
    this._ordersProvider = ordersProvider;
    this._couriersProvider = couriersProvider;
    this._config = config;
    this._running = false;
    this._stats = {
      startedAt: null,
      finishedAt: null,
      generatedOrders: 0,
      generatedCouriers: 0
    };
  }

  start({ ordersCount = 100, couriersCount = 10 }) {
    if (this._running) {
      return { running: true };
    }

    if (ordersCount > this._config.simulationMaxOrders || couriersCount > this._config.simulationMaxCouriers) {
      throw new Error('Simulation limits exceeded');
    }

    this._running = true;
    this._stats = {
      startedAt: Date.now(),
      finishedAt: null,
      generatedOrders: 0,
      generatedCouriers: 0
    };

    this._generateCouriers(couriersCount);
    this._generateOrders(ordersCount);

    this._stats.finishedAt = Date.now();
    this._running = false;

    logger.info('Simulation completed', this._stats);
    return { running: false, stats: this._stats };
  }

  stop() {
    this._running = false;
    return { running: false };
  }

  status() {
    return {
      running: this._running,
      stats: this._stats
    };
  }

  _generateOrders(count) {
    const orders = this._ordersProvider();

    for (let i = 0; i < count; i++) {
      const location = this._randomWalkableLocation();
      const order = new Order(`sim-order-${Date.now()}-${i}`, location, this._randomWeight());
      orders.push(order);
      this._queueManager.addOrder(order);
      eventBus.publish({ type: 'ORDER_CREATED', data: { orderId: order.id } });
      eventBus.publish({ type: 'ORDER_QUEUED', data: { orderId: order.id } });
      this._stats.generatedOrders += 1;
    }

    this._dataService.saveOrders(orders).catch(err => logger.error('Simulation save orders failed', { error: err.message }));
  }

  _generateCouriers(count) {
    const couriers = this._couriersProvider();
    const types = ['walker', 'bicycle', 'scooter', 'car'];

    for (let i = 0; i < count; i++) {
      const location = this._randomWalkableLocation();
      const courier = new Courier(`sim-courier-${Date.now()}-${i}`, location, types[i % types.length], CourierStatus.FREE);
      couriers.push(courier);
      this._stats.generatedCouriers += 1;
    }

    this._dataService.saveCouriers(couriers).catch(err => logger.error('Simulation save couriers failed', { error: err.message }));
  }

  _randomWalkableLocation() {
    const cells = this._cityMap.getWalkableCells();
    const cell = cells[Math.floor(Math.random() * cells.length)];
    return new Location(cell.x, cell.y);
  }

  _randomWeight() {
    return Math.round((Math.random() * 9 + 1) * 10) / 10;
  }
}

module.exports = SimulationService;

