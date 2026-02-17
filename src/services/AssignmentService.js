const PathFinder = require('../utils/PathFinder');

/**
 * AssignmentService — Stage 1 MVP з алгоритмом Дейкстри
 * Призначення замовлень найближчим вільним кур'єрам з урахуванням реального шляху
 */
class AssignmentService {
  constructor(couriers = [], cityMap = null) {
    this._couriers = couriers;
    this._cityMap = cityMap;
  }

  /**
   * Встановити карту міста
   */
  setMap(cityMap) {
    this._cityMap = cityMap;
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
   * Stage 1 MVP: Призначити замовлення з алгоритмом Дейкстри
   *
   * @param {Order} order - Замовлення для призначення
   * @returns {Object} JSON з результатом
   */
  assign(order) {
    if (!order) {
      throw new Error('Order is required');
    }

    if (order.isAssigned()) {
      throw new Error(`Order ${order.id} is already assigned`);
    }

    // 1. Знайти всіх кур'єрів зі статусом Free
    const freeCouriers = this._couriers.filter(c => c.isFree());

    if (freeCouriers.length === 0) {
      return {
        message: "No couriers available"
      };
    }

    // 2. Якщо є карта - використовувати Дейкстру, інакше - Евклідову відстань
    let nearestCourier = null;
    let minDistance = Infinity;
    let foundPath = null;

    if (this._cityMap) {
      // Використовуємо алгоритм Дейкстри для реального шляху
      console.log(`   🗺️  Використання алгоритму Дейкстри...`);

      // Оптимізація: знайти відстані до всіх кур'єрів за один прохід
      const targetLocations = freeCouriers.map(c => c.location);
      const distances = PathFinder.findDistancesToMultiple(
          this._cityMap,
          order.restaurantLocation,
          targetLocations
      );

      for (const courier of freeCouriers) {
        const key = `${courier.location.x},${courier.location.y}`;
        const distance = distances.get(key);

        if (distance !== undefined && distance < minDistance) {
          minDistance = distance;
          nearestCourier = courier;
        }
      }

      // Знайти повний шлях для найближчого кур'єра
      if (nearestCourier) {
        const pathResult = PathFinder.findPath(
            this._cityMap,
            order.restaurantLocation,
            nearestCourier.location
        );

        if (pathResult) {
          foundPath = pathResult.path;
          minDistance = pathResult.distance;
        }
      }

    } else {
      // Fallback: використовувати Евклідову відстань
      console.warn('   ⚠️  Карта не встановлена, використовується Евклідова відстань');

      const DistanceCalculator = require('../utils/DistanceCalculator');

      for (const courier of freeCouriers) {
        const distance = DistanceCalculator.calculate(
            order.restaurantLocation,
            courier.location
        );

        if (distance < minDistance) {
          minDistance = distance;
          nearestCourier = courier;
        }
      }
    }

    if (!nearestCourier) {
      return {
        message: "No couriers available"
      };
    }

    // 3. Призначити найближчого
    order.assignToCourier(nearestCourier.id);

    // 4. Змінити його статус на Busy
    nearestCourier.markAsBusy();

    // 5. Повернути результат
    const result = {
      orderId: order.id,
      assignedCourierId: nearestCourier.id,
      distance: minDistance
    };

    // Додати шлях якщо знайдено
    if (foundPath) {
      result.path = foundPath;
      result.pathLength = foundPath.length;
    }

    return result;
  }

  /**
   * Отримати статистику кур'єрів
   */
  getStats() {
    const free = this._couriers.filter(c => c.isFree()).length;
    const busy = this._couriers.filter(c => !c.isFree()).length;

    return {
      total: this._couriers.length,
      free: free,
      busy: busy
    };
  }
}

module.exports = AssignmentService;