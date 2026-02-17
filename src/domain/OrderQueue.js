/**
 * OrderQueue — черга замовлень з пріоритетами
 */
class OrderQueue {
  constructor() {
    this._queue = []; // Масив замовлень у черзі
  }

  /**
   * Додати замовлення в чергу
   */
  enqueue(order) {
    if (!order || !order.id) {
      throw new Error('Invalid order');
    }

    // Перевірити чи замовлення вже в черзі
    if (this._queue.find(o => o.id === order.id)) {
      throw new Error(`Order ${order.id} is already in queue`);
    }

    this._queue.push({
      order: order,
      enqueuedAt: Date.now()
    });
  }

  /**
   * Взяти перше замовлення з черги (FIFO)
   */
  dequeue() {
    if (this._queue.length === 0) {
      return null;
    }

    const item = this._queue.shift();
    return item.order;
  }

  /**
   * Подивитися перше замовлення без видалення
   */
  peek() {
    if (this._queue.length === 0) {
      return null;
    }

    return this._queue[0].order;
  }

  /**
   * Отримати розмір черги
   */
  size() {
    return this._queue.length;
  }

  /**
   * Перевірити чи черга порожня
   */
  isEmpty() {
    return this._queue.length === 0;
  }

  /**
   * Отримати всі замовлення в черзі
   */
  getAll() {
    return this._queue.map(item => ({
      order: item.order,
      enqueuedAt: item.enqueuedAt,
      waitingTime: Date.now() - item.enqueuedAt
    }));
  }

  /**
   * Видалити замовлення з черги за ID
   */
  remove(orderId) {
    const index = this._queue.findIndex(item => item.order.id === orderId);
    if (index !== -1) {
      const item = this._queue.splice(index, 1)[0];
      return item.order;
    }
    return null;
  }

  /**
   * Очистити чергу
   */
  clear() {
    this._queue = [];
  }

  /**
   * Отримати статистику черги
   */
  getStats() {
    if (this._queue.length === 0) {
      return {
        size: 0,
        avgWaitingTime: 0,
        maxWaitingTime: 0
      };
    }

    const now = Date.now();
    const waitingTimes = this._queue.map(item => now - item.enqueuedAt);
    const avgWaitingTime = waitingTimes.reduce((a, b) => a + b, 0) / waitingTimes.length;
    const maxWaitingTime = Math.max(...waitingTimes);

    return {
      size: this._queue.length,
      avgWaitingTime: Math.round(avgWaitingTime),
      maxWaitingTime: Math.round(maxWaitingTime)
    };
  }

  /**
   * Експорт у JSON
   */
  toJSON() {
    return {
      size: this._queue.length,
      orders: this._queue.map(item => ({
        orderId: item.order.id,
        weight: item.order.weight,
        enqueuedAt: item.enqueuedAt,
        waitingTime: Date.now() - item.enqueuedAt
      }))
    };
  }
}

module.exports = OrderQueue;