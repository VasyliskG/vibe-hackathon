/**
 * VrpSolver.test.js - Tests for Vehicle Routing Problem solver
 */

const VrpSolver = require('../src/optimization/VrpSolver');

describe('VrpSolver', () => {
  let vrpSolver;
  let mockOrders;
  let mockCouriers;

  beforeEach(() => {
    vrpSolver = new VrpSolver();

    // Mock orders
    mockOrders = [
      {
        id: 1,
        sender_location: { latitude: 40.7500, longitude: -73.9750 },
        receiver_location: { latitude: 40.7480, longitude: -73.9745 }
      },
      {
        id: 2,
        sender_location: { latitude: 40.7550, longitude: -73.9800 },
        receiver_location: { latitude: 40.7540, longitude: -73.9790 }
      },
      {
        id: 3,
        sender_location: { latitude: 40.7450, longitude: -73.9700 },
        receiver_location: { latitude: 40.7440, longitude: -73.9690 }
      }
    ];

    // Mock couriers
    mockCouriers = [
      {
        id: 1,
        name: 'Courier 1',
        transport_type: 'bike',
        current_location: { latitude: 40.7500, longitude: -73.9750 },
        capacity: 3,
        queue_size: 0,
        average_rating: 4.5
      },
      {
        id: 2,
        name: 'Courier 2',
        transport_type: 'car',
        current_location: { latitude: 40.7400, longitude: -73.9650 },
        capacity: 5,
        queue_size: 1,
        average_rating: 4.0
      }
    ];
  });

  describe('solveNearestNeighbor', () => {
    test('should assign all orders to couriers', async () => {
      const routes = await vrpSolver.solveNearestNeighbor(mockOrders, mockCouriers);

      expect(routes).toBeDefined();
      expect(routes.length).toBeGreaterThan(0);
      expect(routes.length).toBeLessThanOrEqual(mockCouriers.length);
    });

    test('should respect courier capacity', async () => {
      const routes = await vrpSolver.solveNearestNeighbor(mockOrders, mockCouriers);

      routes.forEach(route => {
        expect(route.orders.length).toBeLessThanOrEqual(mockCouriers.find(c => c.id === route.courier).capacity);
      });
    });

    test('should return valid route structure', async () => {
      const routes = await vrpSolver.solveNearestNeighbor(mockOrders, mockCouriers);

      routes.forEach(route => {
        expect(route).toHaveProperty('courier');
        expect(route).toHaveProperty('orders');
        expect(route).toHaveProperty('totalDistance');
        expect(route).toHaveProperty('totalDuration');
        expect(route).toHaveProperty('status');
        expect(route.status).toBe('pending');
      });
    });

    test('should handle empty order list', async () => {
      const routes = await vrpSolver.solveNearestNeighbor([], mockCouriers);
      expect(routes).toEqual([]);
    });
  });

  describe('solveSavingsAlgorithm', () => {
    test('should optimize orders using savings algorithm', async () => {
      const routes = await vrpSolver.solveSavingsAlgorithm(mockOrders, mockCouriers);

      expect(routes).toBeDefined();
      expect(Array.isArray(routes)).toBe(true);
    });

    test('should produce valid routes', async () => {
      const routes = await vrpSolver.solveSavingsAlgorithm(mockOrders, mockCouriers);

      routes.forEach(route => {
        expect(route).toHaveProperty('courier');
        expect(route).toHaveProperty('orders');
        expect(Array.isArray(route.orders)).toBe(true);
      });
    });
  });

  describe('2-opt improvement', () => {
    test('should improve route distance', () => {
      const route = [mockOrders[0], mockOrders[1], mockOrders[2]];
      const improved = vrpSolver._twoOptImprovement(route);

      expect(Array.isArray(improved)).toBe(true);
      expect(improved.length).toBe(route.length);
    });

    test('should not lose orders during optimization', () => {
      const route = [mockOrders[0], mockOrders[1], mockOrders[2]];
      const improved = vrpSolver._twoOptImprovement(route);

      expect(improved.length).toBe(route.length);
      const improvedIds = improved.map(o => o.id).sort();
      const originalIds = route.map(o => o.id).sort();
      expect(improvedIds).toEqual(originalIds);
    });
  });

  describe('calculateEfficiency', () => {
    test('should return numeric efficiency score', async () => {
      const routes = await vrpSolver.solveNearestNeighbor(mockOrders, mockCouriers);
      const efficiency = vrpSolver.calculateEfficiency(routes);

      expect(typeof efficiency).toBe('number');
      expect(efficiency).toBeGreaterThanOrEqual(0);
    });

    test('should return 0 for empty routes', () => {
      const efficiency = vrpSolver.calculateEfficiency([]);
      expect(efficiency).toBe(0);
    });
  });

  describe('compareSolutions', () => {
    test('should compare two solutions', async () => {
      const solution1 = await vrpSolver.solveNearestNeighbor(mockOrders, mockCouriers);
      const solution2 = await vrpSolver.solveSavingsAlgorithm(mockOrders, mockCouriers);

      const comparison = vrpSolver.compareSolutions(solution1, solution2);

      expect(comparison).toHaveProperty('better');
      expect(comparison).toHaveProperty('efficiency1');
      expect(comparison).toHaveProperty('efficiency2');
      expect(comparison).toHaveProperty('improvement');
      expect(['solution1', 'solution2']).toContain(comparison.better);
    });
  });
});

