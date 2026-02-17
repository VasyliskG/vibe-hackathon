const PathFinder = require('../utils/PathFinder');
const DistanceCalculator = require('../utils/DistanceCalculator');

/**
 * AssignmentService — призначення замовлень з урахуванням ваги та транспорту
 */
class AssignmentService {
  constructor(couriers = [], cityMap = null, usePathfinding = true) {
    this._couriers = couriers;
    this._cityMap = cityMap;
    this._usePathfinding = usePathfinding;  // true = Dijkstra, false = Manhattan/Euclidean
  }

  setMap(cityMap) {
    this._cityMap = cityMap;
  }

  getCouriers() {
    return [...this._couriers];
  }

  addCourier(courier) {
    this._couriers.push(courier);
  }

  /**
   * Призначити замовлення з урахуванням ваги та типу транспорту
   */
  assign(order) {
    if (!order) {
      throw new Error('Order is required');
    }

    if (order.isAssigned()) {
      throw new Error(`Order ${order.id} is already assigned`);
    }

    // 1. Знайти всіх вільних кур'єрів
    const freeCouriers = this._couriers.filter(c => c.isFree());

    if (freeCouriers.length === 0) {
      return {
        message: "No couriers available",
        reason: "all_busy"
      };
    }

    // ⬇️ НОВА ЛОГІКА: Фільтрувати кур'єрів за можливістю перевезти вагу
    const suitableCouriers = freeCouriers.filter(c => c.canCarryWeight(order.weight));

    if (suitableCouriers.length === 0) {
      // ⬇️ ДЕТАЛЬНА ПОМИЛКА
      return {
        message: "No couriers available",
        reason: "weight_too_heavy",
        orderWeight: order.weight,
        availableCouriers: freeCouriers.map(c => ({
          id: c.id,
          transportType: c.transportType.name,
          maxWeight: c.transportType.maxWeight
        }))
      };
    }

    // 2. Знайти найближчого підходящого кур'єра
    let nearestCourier = null;
    let minDistance = Infinity;
    let foundPath = null;

    if (this._usePathfinding && this._cityMap) {
      // Використовуємо алгоритм Дейкстри
      const targetLocations = suitableCouriers.map(c => c.location);
      const distances = PathFinder.findDistancesToMultiple(
          this._cityMap,
          order.restaurantLocation,
          targetLocations
      );

      for (const courier of suitableCouriers) {
        const key = `${courier.location.x},${courier.location.y}`;
        const distance = distances.get(key);

        if (distance !== undefined && distance < minDistance) {
          minDistance = distance;
          nearestCourier = courier;
        }
      }

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
      // Fallback: Manhattan або Euclidean відстань
      const method = this._cityMap ? 'manhattan' : 'euclidean';

      for (const courier of suitableCouriers) {
        const distance = DistanceCalculator.calculate(
            order.restaurantLocation,
            courier.location,
            method
        );

        if (distance < minDistance) {
          minDistance = distance;
          nearestCourier = courier;
        }
      }
    }

    if (!nearestCourier) {
      return {
        message: "No couriers available",
        reason: "no_path_found"
      };
    }

    // 3. Призначити найближчого
    order.assignToCourier(nearestCourier.id);

    // 4. Змінити його статус на Busy
    nearestCourier.markAsBusy();

    // ⬇️ РОЗШИРЕНИЙ РЕЗУЛЬТАТ
    const result = {
      orderId: order.id,
      assignedCourierId: nearestCourier.id,
      courierTransportType: nearestCourier.transportType.name,
      courierMaxWeight: nearestCourier.transportType.maxWeight,
      orderWeight: order.weight,
      distance: Math.round(minDistance * 100) / 100,
      distanceType: this._usePathfinding && this._cityMap ? 'pathfinding' : 'straight'
    };

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

    // ⬇️ НОВА СТАТИСТИКА ПО ТРАНСПОРТУ
    const byTransport = {};
    this._couriers.forEach(c => {
      const type = c.transportType.name;
      if (!byTransport[type]) {
        byTransport[type] = { total: 0, free: 0, busy: 0 };
      }
      byTransport[type].total++;
      if (c.isFree()) {
        byTransport[type].free++;
      } else {
        byTransport[type].busy++;
      }
    });

    return {
      total: this._couriers.length,
      free: free,
      busy: busy,
      byTransport: byTransport  // ⬅️ ДОДАНО
    };
  }
}

module.exports = AssignmentService;