const eventBus = require('../realtime/eventBus/EventBus');
const logger = require('../utils/logger');

class SlaMonitor {
  constructor({ queueManager, ordersProvider, config, metrics }) {
    this._queueManager = queueManager;
    this._ordersProvider = ordersProvider;
    this._config = config;
    this._metrics = metrics;
    this._interval = null;
  }

  start(intervalMs = 10000) {
    if (this._interval) {
      return;
    }

    this._interval = setInterval(() => this._check(), intervalMs);
  }

  stop() {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }
  }

  _check() {
    const now = Date.now();

    const queue = this._queueManager.getQueue();
    queue.forEach(order => {
      const waitMs = now - order.createdAt;
      if (waitMs > this._config.slaQueueWaitMs) {
        this._emitViolation('QUEUE_WAIT', order.id, waitMs);
      }
    });

    const orders = this._ordersProvider();
    orders.forEach(order => {
      if (order.status === 'delivered') {
        const deliveryMs = order.updatedAt - order.createdAt;
        if (deliveryMs > this._config.slaDeliveryMs) {
          this._emitViolation('DELIVERY_TIME', order.id, deliveryMs);
        }
      }
    });
  }

  _emitViolation(kind, orderId, durationMs) {
    eventBus.publish({
      type: 'SLA_VIOLATION',
      data: {
        kind,
        orderId,
        durationMs
      }
    });

    if (this._metrics) {
      this._metrics.recordSlaViolation();
    }

    logger.warn('SLA violation detected', { kind, orderId, durationMs });
  }
}

module.exports = SlaMonitor;

