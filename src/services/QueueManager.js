const logger = require('../utils/logger');
const eventBus = require('../realtime/eventBus/EventBus');

/**
 * QueueManager - Manages FIFO order queue
 */
class QueueManager {
  constructor() {
    this._queue = [];
  }

  /**
   * Add order to queue
   */
  addOrder(order) {
    if (!order || !order.id) {
      throw new Error('Invalid order');
    }

    // Check if order already in queue
    if (this._queue.some(o => o.id === order.id)) {
      logger.warn('Order already in queue', { orderId: order.id });
      return false;
    }

    this._queue.push(order);
    logger.info('Order added to queue', {
      orderId: order.id,
      queueSize: this._queue.length
    });
    eventBus.publish({
      type: 'ORDER_QUEUED',
      data: { orderId: order.id, queueSize: this._queue.length }
    });
    eventBus.publish({
      type: 'QUEUE_UPDATED',
      data: { queueSize: this._queue.length }
    });
    return true;
  }

  /**
   * Remove order from queue
   */
  removeOrder(orderId) {
    const index = this._queue.findIndex(o => o.id === orderId);

    if (index === -1) {
      return false;
    }

    this._queue.splice(index, 1);
    logger.info('Order removed from queue', {
      orderId,
      queueSize: this._queue.length
    });
    eventBus.publish({
      type: 'QUEUE_UPDATED',
      data: { queueSize: this._queue.length }
    });
    return true;
  }

  /**
   * Get next order from queue (FIFO)
   */
  getNext() {
    if (this._queue.length === 0) {
      return null;
    }

    const order = this._queue.shift();
    logger.info('Order dequeued', {
      orderId: order.id,
      remainingQueueSize: this._queue.length
    });
    return order;
  }

  /**
   * Peek at next order without removing it
   */
  peekNext() {
    return this._queue.length > 0 ? this._queue[0] : null;
  }

  /**
   * Get all orders in queue
   */
  getQueue() {
    return [...this._queue];
  }

  /**
   * Get queue size
   */
  getQueueSize() {
    return this._queue.length;
  }

  /**
   * Check if queue is empty
   */
  isEmpty() {
    return this._queue.length === 0;
  }

  /**
   * Clear the entire queue
   */
  clear() {
    const previousSize = this._queue.length;
    this._queue = [];
    logger.info('Queue cleared', { previousSize });
    eventBus.publish({
      type: 'QUEUE_UPDATED',
      data: { queueSize: 0 }
    });
  }

  /**
   * Get order by ID from queue
   */
  getOrderById(orderId) {
    return this._queue.find(o => o.id === orderId) || null;
  }
}

module.exports = QueueManager;
