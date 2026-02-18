/**
 * VrpSolver - Vehicle Routing Problem solver
 * Implements multiple algorithms:
 * - Nearest Neighbor (greedy)
 * - Savings Algorithm (Clarke-Wright)
 * - 2-opt local improvement
 */

const DistanceCalculator = require('../utils/DistanceCalculator');
const logger = require('../utils/logger');

class VrpSolver {
  constructor() {
    this.distanceCalculator = new DistanceCalculator();
  }

  /**
   * Solve VRP using Savings Algorithm (Clarke-Wright)
   * Best for multiple deliveries per courier
   */
  async solveSavingsAlgorithm(orders, couriers) {
    if (!orders || orders.length === 0) {
      return [];
    }

    logger.debug(`VRP Savings Algorithm: ${orders.length} orders, ${couriers.length} couriers`);

    // 1. Initial routes: each order has its own route
    const routes = orders.map((order, idx) => ({
      orderId: order.id,
      orders: [order],
      courier: null,
      totalDistance: 0,
      totalDuration: 0
    }));

    // 2. Calculate savings for combining routes
    const savings = [];
    for (let i = 0; i < routes.length; i++) {
      for (let j = i + 1; j < routes.length; j++) {
        const route1 = routes[i];
        const route2 = routes[j];

        const order1 = route1.orders[route1.orders.length - 1];
        const order2 = route2.orders[0];

        // Savings = distance(depot->order1) + distance(order2->depot) - distance(order1->order2)
        const dist1To2 = this._calculateDistance(order1.receiver_location, order2.sender_location);
        const saving = 100 - dist1To2; // Simplified: assume equal depot distance

        if (saving > 0) {
          savings.push({
            route1: i,
            route2: j,
            saving,
            distance: dist1To2
          });
        }
      }
    }

    // 3. Sort savings in descending order
    savings.sort((a, b) => b.saving - a.saving);

    // 4. Combine routes based on savings
    const mergedRoutes = new Set();
    const routeMap = new Map(); // maps old index to current route array

    for (let i = 0; i < routes.length; i++) {
      routeMap.set(i, [i]);
    }

    for (const save of savings) {
      const indices1 = routeMap.get(save.route1);
      const indices2 = routeMap.get(save.route2);

      if (indices1 && indices2 && indices1 !== indices2) {
        // Merge routes
        const newIndices = [...indices1, ...indices2];
        for (const idx of newIndices) {
          routeMap.set(idx, newIndices);
        }
      }
    }

    // 5. Get unique merged routes
    const finalRoutes = [];
    const seen = new Set();

    for (const indices of routeMap.values()) {
      const key = indices.sort().join(',');
      if (!seen.has(key)) {
        seen.add(key);
        const mergedOrders = indices.flatMap(idx => routes[idx].orders);
        finalRoutes.push(mergedOrders);
      }
    }

    // 6. Optimize each route with 2-opt
    const optimizedRoutes = finalRoutes.map(routeOrders =>
      this._twoOptImprovement(routeOrders)
    );

    // 7. Assign couriers to routes
    return this._assignCourierToRoutes(optimizedRoutes, couriers);
  }

  /**
   * Solve VRP using Nearest Neighbor (fast greedy algorithm)
   */
  async solveNearestNeighbor(orders, couriers) {
    if (!orders || orders.length === 0) {
      return [];
    }

    logger.debug(`VRP Nearest Neighbor: ${orders.length} orders, ${couriers.length} couriers`);

    const unassignedOrders = [...orders];
    const routes = [];

    // For each courier, build greedy route
    for (const courier of couriers) {
      if (unassignedOrders.length === 0) break;

      const route = [unassignedOrders.shift()]; // Start with first unassigned
      let currentLocation = route[0].receiver_location;

      // Greedily add nearest order
      while (unassignedOrders.length > 0 && route.length < courier.capacity) {
        let nearestIdx = 0;
        let nearestDist = Infinity;

        for (let i = 0; i < unassignedOrders.length; i++) {
          const dist = this._calculateDistance(currentLocation, unassignedOrders[i].sender_location);
          if (dist < nearestDist) {
            nearestDist = dist;
            nearestIdx = i;
          }
        }

        const order = unassignedOrders.splice(nearestIdx, 1)[0];
        route.push(order);
        currentLocation = order.receiver_location;
      }

      routes.push({
        courier: courier.id,
        orders: route,
        totalDistance: this._calculateRouteTotalDistance(route),
        totalDuration: this._estimateRouteDuration(route),
        status: 'pending'
      });
    }

    // Handle remaining orders
    if (unassignedOrders.length > 0) {
      logger.warn(`${unassignedOrders.length} orders could not be assigned (courier capacity exceeded)`);
    }

    return routes;
  }

  /**
   * 2-opt local search improvement
   * Swaps order pairs to reduce total distance
   */
  _twoOptImprovement(orders, maxIterations = 100) {
    let bestRoute = [...orders];
    let improved = true;
    let iteration = 0;

    while (improved && iteration < maxIterations) {
      improved = false;
      iteration++;

      for (let i = 0; i < bestRoute.length - 1; i++) {
        for (let j = i + 2; j < bestRoute.length; j++) {
          // Calculate distances for current and swapped order
          const currentDist = this._calculateDistance(
            bestRoute[i].receiver_location,
            bestRoute[i + 1].sender_location
          ) + this._calculateDistance(
            bestRoute[j].receiver_location,
            bestRoute[(j + 1) % bestRoute.length].sender_location
          );

          const newDist = this._calculateDistance(
            bestRoute[i].receiver_location,
            bestRoute[j].sender_location
          ) + this._calculateDistance(
            bestRoute[i + 1].receiver_location,
            bestRoute[(j + 1) % bestRoute.length].sender_location
          );

          if (newDist < currentDist) {
            // Reverse segment between i+1 and j
            const newRoute = [
              ...bestRoute.slice(0, i + 1),
              ...bestRoute.slice(i + 1, j + 1).reverse(),
              ...bestRoute.slice(j + 1)
            ];
            bestRoute = newRoute;
            improved = true;
          }
        }
      }
    }

    return bestRoute;
  }

  /**
   * Calculate total distance of a route
   */
  _calculateRouteTotalDistance(orders) {
    let totalDistance = 0;

    for (let i = 0; i < orders.length - 1; i++) {
      totalDistance += this._calculateDistance(
        orders[i].receiver_location,
        orders[i + 1].sender_location
      );
    }

    return totalDistance;
  }

  /**
   * Estimate route duration (distance * speed + stops)
   */
  _estimateRouteDuration(orders, avgSpeedKmh = 30) {
    const totalDistance = this._calculateRouteTotalDistance(orders);
    const distanceHours = (totalDistance / 1000) / avgSpeedKmh;
    const stopsMinutes = orders.length * 5; // 5 min per stop

    return distanceHours * 3600 + stopsMinutes * 60; // Convert to seconds
  }

  /**
   * Calculate distance between two locations
   */
  _calculateDistance(location1, location2) {
    if (!location1 || !location2) return 0;
    return this.distanceCalculator.calculateDistance(location1, location2);
  }

  /**
   * Assign couriers to routes based on capacity and location
   */
  _assignCourierToRoutes(optimizedRoutes, couriers) {
    const assignedRoutes = [];

    for (const orderRoute of optimizedRoutes) {
      // Find best courier for this route
      let bestCourier = null;
      let bestScore = -Infinity;

      for (const courier of couriers) {
        if (courier.queue_size + orderRoute.length <= courier.capacity) {
          // Score: prefer closer couriers
          const distance = orderRoute.length > 0
            ? this._calculateDistance(courier.current_location, orderRoute[0].sender_location)
            : 0;

          const score = courier.average_rating * 10 - (distance / 1000);

          if (score > bestScore) {
            bestScore = score;
            bestCourier = courier;
          }
        }
      }

      if (bestCourier) {
        assignedRoutes.push({
          courier: bestCourier.id,
          orders: orderRoute,
          totalDistance: this._calculateRouteTotalDistance(orderRoute),
          totalDuration: this._estimateRouteDuration(orderRoute),
          status: 'pending'
        });
      }
    }

    return assignedRoutes;
  }

  /**
   * Calculate efficiency score of a solution
   */
  calculateEfficiency(routes) {
    if (routes.length === 0) return 0;

    const totalDistance = routes.reduce((sum, r) => sum + r.totalDistance, 0);
    const totalOrders = routes.reduce((sum, r) => sum + r.orders.length, 0);
    const routeCount = routes.length;

    // Lower distance per order = better efficiency
    return totalOrders / (totalDistance / 1000); // orders per km
  }

  /**
   * Compare two solutions and return the best
   */
  compareSolutions(solution1, solution2) {
    const eff1 = this.calculateEfficiency(solution1);
    const eff2 = this.calculateEfficiency(solution2);

    return {
      better: eff1 > eff2 ? 'solution1' : 'solution2',
      efficiency1: eff1,
      efficiency2: eff2,
      improvement: Math.abs((eff2 - eff1) / eff1 * 100)
    };
  }
}

module.exports = VrpSolver;

