const DistanceCalculator = require('../utils/DistanceCalculator');

/**
 * AssignmentService — призначення замовлень найближчим кур'єрам
 */
class AssignmentService {
  constructor(couriers = []) {
    this._couriers = couriers;
  }

  /**
   * Отримати всіх кур'єрів
   */
  getCouriers() {
    return [...this._couriers];
  }

  /**
   * Додати кур'єра
   */
  addCourier(courier) {
    this._couriers.push(courier);
  }

  /**
   * Призначити замовлення найближчому доступному кур'єру
   */
  assign(order) {
    if (!order) {
      throw new Error('Order is required');
    }

    if (order.isAssigned()) {
      throw new Error(`Order ${order.id} is already assigned`);
    }

    // Фільтруємо доступних кур'єрів
    const availableCouriers = this._couriers.filter(c => c.isAvailable);

    if (availableCouriers.length === 0) {
      throw new Error('No available couriers found');
    }

    // Знаходимо найближчого кур'єра
    let nearestCourier = null;
    let minDistance = Infinity;

    for (const courier of availableCouriers) {
      const distance = DistanceCalculator.calculate(
        order.location,
        courier.location
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestCourier = courier;
      }
    }

    if (!nearestCourier) {
      throw new Error('Could not find suitable courier');
    }

    // Призначаємо замовлення
    order.assignToCourier(nearestCourier.id);
    nearestCourier.assignOrder(order.id);

    return {
      orderId: order.id,
      courierId: nearestCourier.id,
      distance: minDistance
    };
  }

  /**
   * Отримати статистику
   */
  getStats() {
    return {
      totalCouriers: this._couriers.length,
      availableCouriers: this._couriers.filter(c => c.isAvailable).length,
      busyCouriers: this._couriers.filter(c => !c.isAvailable).length
    };
  }
}

module.exports = AssignmentService;