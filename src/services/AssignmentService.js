const PathFinder = require('../utils/PathFinder');
const DistanceCalculator = require('../utils/DistanceCalculator');
const OrderQueue = require('../domain/OrderQueue');

/**
 * AssignmentService — Stage 3 з пріоритетами та чергою
 */
class AssignmentService {
  constructor(couriers = [], cityMap = null, usePathfinding = true) {
    this._couriers = couriers;
    this._cityMap = cityMap;
    this._usePathfinding = usePathfinding;
    this._orderQueue = new OrderQueue();  // ⬅️ НОВА ЧЕРГА
    this._distanceThreshold = 1.0;  // ⬅️ ПОРІГ ВІДСТАНІ ДЛЯ ПРІОРИТЕТУ
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

  // ⬇️ НОВИЙ GETTER
  getQueue() {
    return this._orderQueue;
  }

  // ⬇️ НОВИЙ МЕТОД: Встановити поріг відстані
  setDistanceThreshold(threshold) {
    if (typeof threshold !== 'number' || threshold < 0) {
      throw new Error('Distance threshold must be a non-negative number');
    }
    this._distanceThreshold = threshold;
  }

  /**
   * Stage 3: Призначити замовлення з урахуванням пріоритетів
   */
  assign(order, autoQueueIfUnavailable = true) {
    if (!order) {
      throw new Error('Order is required');
    }

    if (order.isAssigned()) {
      throw new Error(`Order ${order.id} is already assigned`);
    }

    // 1. Знайти всіх вільних кур'єрів
    const freeCouriers = this._couriers.filter(c => c.isFree());

    if (freeCouriers.length === 0) {
      if (autoQueueIfUnavailable) {
        this._orderQueue.enqueue(order);
        return {
          message: "No couriers available, order queued",
          reason: "all_busy",
          queueSize: this._orderQueue.size(),
          queued: true
        };
      }
      return {
        message: "No couriers available",
        reason: "all_busy",
        queued: false
      };
    }

    // 2. Фільтрувати за можливістю перевезти вагу
    const suitableCouriers = freeCouriers.filter(c => c.canCarryWeight(order.weight));

    if (suitableCouriers.length === 0) {
      if (autoQueueIfUnavailable) {
        this._orderQueue.enqueue(order);
        return {
          message: "No couriers available, order queued",
          reason: "weight_too_heavy",
          orderWeight: order.weight,
          queueSize: this._orderQueue.size(),
          queued: true,
          availableCouriers: freeCouriers.map(c => ({
            id: c.id,
            transportType: c.transportType.name,
            maxWeight: c.transportType.maxWeight
          }))
        };
      }
      return {
        message: "No couriers available",
        reason: "weight_too_heavy",
        orderWeight: order.weight,
        queued: false
      };
    }

    // 3. Обчислити відстані до всіх підходящих кур'єрів
    const couriersWithDistances = this._calculateDistances(order, suitableCouriers);

    if (couriersWithDistances.length === 0) {
      if (autoQueueIfUnavailable) {
        this._orderQueue.enqueue(order);
        return {
          message: "No path found, order queued",
          reason: "no_path_found",
          queueSize: this._orderQueue.size(),
          queued: true
        };
      }
      return {
        message: "No path found",
        reason: "no_path_found",
        queued: false
      };
    }

    // ⬇️ НОВА ЛОГІКА Stage 3: Пріоритет за навантаженням
    // 4. Відсортувати за відстанню
    couriersWithDistances.sort((a, b) => a.distance - b.distance);

    // 5. Якщо різниця у відстані < threshold, вибрати того, хто виконав менше замовлень
    const nearest = couriersWithDistances[0];
    let selectedCourier = nearest.courier;
    let selectedDistance = nearest.distance;
    let selectedPath = nearest.path;

    for (let i = 1; i < couriersWithDistances.length; i++) {
      const current = couriersWithDistances[i];
      const distanceDiff = current.distance - nearest.distance;

      // Якщо відстань майже однакова (різниця < threshold)
      if (distanceDiff <= this._distanceThreshold) {
        // Порівняти кількість виконаних замовлень
        if (current.courier.completedOrdersToday < selectedCourier.completedOrdersToday) {
          selectedCourier = current.courier;
          selectedDistance = current.distance;
          selectedPath = current.path;
        }
      } else {
        // Відстань занадто велика, зупинити пошук
        break;
      }
    }

    // 6. Призначити замовлення
    order.assignToCourier(selectedCourier.id);
    selectedCourier.assignOrder(order.id);

    // 7. Повернути результат
    const result = {
      orderId: order.id,
      assignedCourierId: selectedCourier.id,
      courierTransportType: selectedCourier.transportType.name,
      courierMaxWeight: selectedCourier.transportType.maxWeight,
      courierCompletedToday: selectedCourier.completedOrdersToday,  // ⬅️ ДОДАНО
      orderWeight: order.weight,
      distance: Math.round(selectedDistance * 100) / 100,
      distanceType: this._usePathfinding && this._cityMap ? 'pathfinding' : 'straight',
      queued: false
    };

    if (selectedPath) {
      result.path = selectedPath;
      result.pathLength = selectedPath.length;
    }

    return result;
  }

  /**
   * Обчислити відстані до кур'єрів
   */
  _calculateDistances(order, couriers) {
    const results = [];

    if (this._usePathfinding && this._cityMap) {
      // Використовуємо Dijkstra
      const targetLocations = couriers.map(c => c.location);
      const distances = PathFinder.findDistancesToMultiple(
          this._cityMap,
          order.restaurantLocation,
          targetLocations
      );

      for (const courier of couriers) {
        const key = `${courier.location.x},${courier.location.y}`;
        const distance = distances.get(key);

        if (distance !== undefined) {
          results.push({
            courier: courier,
            distance: distance,
            path: null
          });
        }
      }

      // Знайти шлях для найближчих
      if (results.length > 0) {
        results.sort((a, b) => a.distance - b.distance);
        for (let i = 0; i < Math.min(3, results.length); i++) {
          const pathResult = PathFinder.findPath(
              this._cityMap,
              order.restaurantLocation,
              results[i].courier.location
          );
          if (pathResult) {
            results[i].path = pathResult.path;
            results[i].distance = pathResult.distance;
          }
        }
      }
    } else {
      // Fallback: Manhattan або Euclidean
      const method = this._cityMap ? 'manhattan' : 'euclidean';

      for (const courier of couriers) {
        const distance = DistanceCalculator.calculate(
            order.restaurantLocation,
            courier.location,
            method
        );

        results.push({
          courier: courier,
          distance: distance,
          path: null
        });
      }
    }

    return results;
  }

  // ⬇️ НОВИЙ МЕТОД: Завершити замовлення та призначити наступне з черги
  /**
   * Stage 3: Завершити замовлення кур'єром та автоматично призначити з черги
   */
  completeOrder(courierId) {
    const courier = this._couriers.find(c => c.id === courierId);

    if (!courier) {
      throw new Error(`Courier ${courierId} not found`);
    }

    if (courier.isFree()) {
      throw new Error(`Courier ${courierId} is not busy`);
    }

    // Завершити поточне замовлення
    const completedOrderId = courier.completeOrder();

    const result = {
      courierId: courier.id,
      completedOrderId: completedOrderId,
      completedOrdersToday: courier.completedOrdersToday,
      queuedOrderAssigned: null
    };

    // Спробувати призначити замовлення з черги
    if (!this._orderQueue.isEmpty()) {
      const queuedOrder = this._orderQueue.peek();

      // Перевірити чи кур'єр може взяти це замовлення
      if (courier.canCarryWeight(queuedOrder.weight)) {
        this._orderQueue.dequeue();

        const assignResult = this.assign(queuedOrder, false);

        if (!assignResult.message) {
          result.queuedOrderAssigned = {
            orderId: assignResult.orderId,
            assignedCourierId: assignResult.assignedCourierId,
            distance: assignResult.distance
          };
        } else {
          // Повернути в чергу, якщо не вдалося призначити
          this._orderQueue.enqueue(queuedOrder);
        }
      }
    }

    return result;
  }

  // ⬇️ НОВИЙ МЕТОД: Обробити всю чергу
  /**
   * Спробувати призначити всі замовлення з черги
   */
  processQueue() {
    const results = [];
    const queueSize = this._orderQueue.size();

    for (let i = 0; i < queueSize; i++) {
      if (this._orderQueue.isEmpty()) {
        break;
      }

      const order = this._orderQueue.dequeue();
      const result = this.assign(order, false);

      if (result.message) {
        // Повернути в чергу
        this._orderQueue.enqueue(order);
      }

      results.push({
        orderId: order.id,
        success: !result.message,
        result: result
      });
    }

    return {
      processed: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      remainingQueue: this._orderQueue.size()
    };
  }

  getStats() {
    const free = this._couriers.filter(c => c.isFree()).length;
    const busy = this._couriers.filter(c => !c.isFree()).length;

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

    // ⬇️ ДОДАНО СТАТИСТИКУ НАВАНТАЖЕННЯ
    const completedOrders = this._couriers.map(c => c.completedOrdersToday);
    const totalCompleted = completedOrders.reduce((a, b) => a + b, 0);
    const avgCompleted = completedOrders.length > 0
        ? (totalCompleted / completedOrders.length).toFixed(2)
        : 0;

    return {
      total: this._couriers.length,
      free: free,
      busy: busy,
      byTransport: byTransport,
      queueSize: this._orderQueue.size(),  // ⬅️ ДОДАНО
      completedOrdersToday: {  // ⬅️ ДОДАНО
        total: totalCompleted,
        average: parseFloat(avgCompleted),
        min: completedOrders.length > 0 ? Math.min(...completedOrders) : 0,
        max: completedOrders.length > 0 ? Math.max(...completedOrders) : 0
      }
    };
  }
}

module.exports = AssignmentService;