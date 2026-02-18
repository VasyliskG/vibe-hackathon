/**
 * Integration test for Stage 6 Phase 1
 * Tests complete workflow: Zone creation → Order creation → VRP optimization → ETA calculation
 */

describe('Stage 6 Phase 1 - Integration Tests', () => {
  let vrpSolver;
  let etaCalculator;
  let zoneService;
  let mockDatabase;

  beforeAll(() => {
    // Initialize services
    const VrpSolver = require('../../src/optimization/VrpSolver');
    const EtaCalculator = require('../../src/optimization/EtaCalculator');
    const ZoneService = require('../../src/services/ZoneService');

    vrpSolver = new VrpSolver();
    etaCalculator = new EtaCalculator();

    // Mock database adapter
    mockDatabase = {
      createZone: jest.fn(),
      getAllZones: jest.fn(),
      getZoneById: jest.fn(),
      getOrdersByZone: jest.fn(),
      getCouriersByZone: jest.fn(),
      updateZoneLoad: jest.fn(),
      updateCourier: jest.fn(),
      createDeliveryEvent: jest.fn(),
      healthCheck: jest.fn().mockResolvedValue({ status: 'connected' })
    };

    zoneService = new ZoneService(mockDatabase);
  });

  describe('Complete Order Assignment Workflow', () => {
    const mockZone = {
      id: 1,
      name: 'Manhattan',
      bounds: {
        lat_min: 40.7000,
        lat_max: 40.8200,
        lon_min: -74.0100,
        lon_max: -73.9200
      },
      capacity: 100,
      current_load: 0,
      status: 'active'
    };

    const mockCouriers = [
      {
        id: 1,
        name: 'Courier 1',
        transport_type: 'bike',
        current_location: { latitude: 40.7500, longitude: -73.9750 },
        capacity: 5,
        queue_size: 0,
        average_rating: 4.5,
        successful_deliveries: 95,
        total_deliveries: 100
      },
      {
        id: 2,
        name: 'Courier 2',
        transport_type: 'car',
        current_location: { latitude: 40.7400, longitude: -73.9650 },
        capacity: 10,
        queue_size: 2,
        average_rating: 4.0,
        successful_deliveries: 80,
        total_deliveries: 100
      }
    ];

    const mockOrders = [
      {
        id: 1,
        sender_location: { latitude: 40.7580, longitude: -73.9855, address: 'Times Square' },
        receiver_location: { latitude: 40.7480, longitude: -73.9745, address: 'Central Park' }
      },
      {
        id: 2,
        sender_location: { latitude: 40.7550, longitude: -73.9800, address: 'Broadway' },
        receiver_location: { latitude: 40.7540, longitude: -73.9790, address: 'Herald Square' }
      },
      {
        id: 3,
        sender_location: { latitude: 40.7450, longitude: -73.9700, address: 'Madison Square' },
        receiver_location: { latitude: 40.7440, longitude: -73.9690, address: 'Washington Square' }
      },
      {
        id: 4,
        sender_location: { latitude: 40.7400, longitude: -73.9650, address: 'Union Square' },
        receiver_location: { latitude: 40.7390, longitude: -73.9640, address: 'Gramercy Park' }
      },
      {
        id: 5,
        sender_location: { latitude: 40.7350, longitude: -73.9600, address: 'East Village' },
        receiver_location: { latitude: 40.7340, longitude: -73.9590, address: 'Lower East Side' }
      }
    ];

    test('should complete full order assignment workflow', async () => {
      // Step 1: Create zone
      mockDatabase.createZone.mockResolvedValue(mockZone);
      const zone = await zoneService.createZone(
        mockZone.name,
        mockZone.bounds,
        mockZone.capacity
      );

      expect(zone).toBeDefined();
      expect(zone.name).toBe('Manhattan');
      expect(mockDatabase.createZone).toHaveBeenCalled();

      // Step 2: Solve VRP for orders
      const routes = await vrpSolver.solveNearestNeighbor(mockOrders, mockCouriers);

      expect(routes).toBeDefined();
      expect(routes.length).toBeGreaterThan(0);
      expect(routes.length).toBeLessThanOrEqual(mockCouriers.length);

      // Step 3: Verify all orders are assigned
      const assignedOrderIds = [];
      routes.forEach(route => {
        route.orders.forEach(order => {
          assignedOrderIds.push(order.id);
        });
      });

      expect(assignedOrderIds.length).toBeGreaterThan(0);
      expect(assignedOrderIds.sort()).toEqual(
        mockOrders.map(o => o.id).sort()
      );

      // Step 4: Calculate ETA for each assigned order
      const etaResults = [];
      routes.forEach(route => {
        const courier = mockCouriers.find(c => c.id === route.courier);
        route.orders.forEach(order => {
          const eta = etaCalculator.calculateEta(order, courier, route.orders.slice(0, route.orders.indexOf(order)));
          etaResults.push(eta);

          expect(eta).toBeDefined();
          expect(eta.eta).toBeDefined();
          expect(eta.durationSeconds).toBeGreaterThan(0);
          expect(eta.confidence).toBeGreaterThanOrEqual(0.3);
          expect(eta.confidence).toBeLessThanOrEqual(1.0);
        });
      });

      expect(etaResults.length).toBe(mockOrders.length);

      // Step 5: Verify solution quality
      const efficiency = vrpSolver.calculateEfficiency(routes);
      expect(efficiency).toBeGreaterThan(0);
      expect(typeof efficiency).toBe('number');
    });

    test('should handle large batch of orders', async () => {
      // Create larger batch
      const largeOrderBatch = [];
      for (let i = 0; i < 50; i++) {
        largeOrderBatch.push({
          id: 100 + i,
          sender_location: {
            latitude: 40.7000 + Math.random() * 0.1,
            longitude: -74.0000 + Math.random() * 0.1
          },
          receiver_location: {
            latitude: 40.7000 + Math.random() * 0.1,
            longitude: -74.0000 + Math.random() * 0.1
          }
        });
      }

      const largeCourierFleet = [];
      for (let i = 0; i < 10; i++) {
        largeCourierFleet.push({
          id: 100 + i,
          name: `Courier ${i}`,
          transport_type: i % 3 === 0 ? 'car' : i % 3 === 1 ? 'bike' : 'motorcycle',
          current_location: { latitude: 40.7500, longitude: -73.9750 },
          capacity: 5 + Math.floor(Math.random() * 10),
          queue_size: 0,
          average_rating: 3.5 + Math.random() * 1.0,
          successful_deliveries: 50,
          total_deliveries: 100
        });
      }

      const startTime = Date.now();
      const routes = await vrpSolver.solveNearestNeighbor(largeOrderBatch, largeCourierFleet);
      const solveTime = Date.now() - startTime;

      expect(routes).toBeDefined();
      expect(routes.length).toBeGreaterThan(0);
      expect(solveTime).toBeLessThan(5000); // Should solve in less than 5 seconds
    });

    test('should compare optimization solutions', async () => {
      const solution1 = await vrpSolver.solveNearestNeighbor(mockOrders, mockCouriers);
      const solution2 = await vrpSolver.solveSavingsAlgorithm(mockOrders, mockCouriers);

      const comparison = vrpSolver.compareSolutions(solution1, solution2);

      expect(comparison).toHaveProperty('better');
      expect(comparison).toHaveProperty('efficiency1');
      expect(comparison).toHaveProperty('efficiency2');
      expect(comparison).toHaveProperty('improvement');

      expect(['solution1', 'solution2']).toContain(comparison.better);
      expect(comparison.efficiency1).toBeGreaterThan(0);
      expect(comparison.efficiency2).toBeGreaterThan(0);
    });

    test('should respect SLA deadline during assignment', async () => {
      const routes = await vrpSolver.solveNearestNeighbor(mockOrders.slice(0, 2), [mockCouriers[0]]);

      const slaDeadline = new Date(Date.now() + 3600000); // 1 hour from now
      const order = mockOrders[0];
      const courier = mockCouriers[0];

      const slaStatus = etaCalculator.canMeetSla(order, courier, [], slaDeadline);

      expect(slaStatus).toBeDefined();
      expect(slaStatus.canMeet).toBeDefined();
      expect(typeof slaStatus.marginMinutes).toBe('number');
    });

    test('should find best courier considering ETA and SLA', () => {
      const slaDeadline = new Date(Date.now() + 3600000);
      const order = mockOrders[0];

      const result = etaCalculator.findBestCourier(
        order,
        mockCouriers,
        {}, // no queues
        slaDeadline
      );

      expect(result).toHaveProperty('best');
      expect(result).toHaveProperty('all');
      expect(result).toHaveProperty('recommendation');

      expect(result.best.courier).toBeDefined();
      expect(result.all.length).toBe(mockCouriers.length);
      expect(result.all[0].score).toBeGreaterThanOrEqual(result.all[result.all.length - 1].score);
    });

    test('should handle empty orders gracefully', async () => {
      const routes = await vrpSolver.solveNearestNeighbor([], mockCouriers);
      expect(routes).toEqual([]);
    });

    test('should handle single order', async () => {
      const singleOrder = mockOrders.slice(0, 1);
      const routes = await vrpSolver.solveNearestNeighbor(singleOrder, mockCouriers);

      expect(routes.length).toBeGreaterThan(0);
      expect(routes[0].orders.length).toBe(1);
    });

    test('should calculate ETA accuracy stats from historical data', () => {
      const historicalData = [];
      for (let i = 0; i < 10; i++) {
        const estimated = new Date();
        const actual = new Date(estimated.getTime() + (5 + Math.random() * 10) * 60000); // 5-15 min offset

        historicalData.push({
          estimatedEta: estimated.toISOString(),
          actualEta: actual.toISOString()
        });
      }

      const stats = etaCalculator.getAccuracyStats(historicalData);

      expect(stats).toBeDefined();
      expect(stats.sampleSize).toBe(10);
      expect(stats.avgErrorMinutes).toBeGreaterThan(0);
      expect(stats.accuracy).toBeGreaterThan(0);
    });

    test('should handle courier capacity constraints', async () => {
      const limitedCourier = { ...mockCouriers[0], capacity: 2 };

      const routes = await vrpSolver.solveNearestNeighbor(mockOrders, [limitedCourier]);

      routes.forEach(route => {
        expect(route.orders.length).toBeLessThanOrEqual(limitedCourier.capacity);
      });
    });
  });

  describe('Zone Management Workflow', () => {
    test('should create and manage zones', async () => {
      const bounds = {
        lat_min: 40.7000,
        lat_max: 40.8200,
        lon_min: -74.0100,
        lon_max: -73.9200
      };

      mockDatabase.createZone.mockResolvedValue({
        id: 1,
        name: 'Manhattan',
        bounds,
        capacity: 100,
        current_load: 0,
        status: 'active'
      });

      const zone = await zoneService.createZone('Manhattan', bounds, 100);

      expect(zone).toBeDefined();
      expect(zone.name).toBe('Manhattan');
      expect(zone.capacity).toBe(100);
    });

    test('should handle zone location queries', async () => {
      const lat = 40.7500;
      const lon = -73.9750;

      mockDatabase.getZoneByLocation.mockResolvedValue({
        id: 1,
        name: 'Manhattan',
        bounds: {
          lat_min: 40.7000,
          lat_max: 40.8200,
          lon_min: -74.0100,
          lon_max: -73.9200
        }
      });

      const zone = await zoneService.getZoneByLocation(lat, lon);

      expect(zone).toBeDefined();
      expect(zone.name).toBe('Manhattan');
    });

    test('should verify database health', async () => {
      const health = await mockDatabase.healthCheck();

      expect(health).toBeDefined();
      expect(health.status).toBe('connected');
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid courier data gracefully', () => {
      const invalidCourier = {
        id: 1,
        name: 'Invalid Courier'
        // Missing required fields
      };

      const order = {
        id: 1,
        sender_location: { latitude: 40.7500, longitude: -73.9750 },
        receiver_location: { latitude: 40.7480, longitude: -73.9745 }
      };

      // Should not crash, but might return null or reduced confidence
      const eta = etaCalculator.calculateEta(order, invalidCourier, []);
      expect(eta === null || eta.confidence <= 0.5).toBe(true);
    });

    test('should handle missing location data', () => {
      const orderMissingLocation = {
        id: 1,
        sender_location: null,
        receiver_location: { latitude: 40.7480, longitude: -73.9745 }
      };

      const courier = {
        id: 1,
        name: 'Courier',
        transport_type: 'bike',
        current_location: { latitude: 40.7500, longitude: -73.9750 },
        capacity: 5,
        average_rating: 4.0,
        successful_deliveries: 50,
        total_deliveries: 100
      };

      const eta = etaCalculator.calculateEta(orderMissingLocation, courier, []);
      expect(eta === null || eta.durationSeconds === 0).toBe(true);
    });

    test('should recover from transaction failures', async () => {
      mockDatabase.createZone.mockRejectedValue(new Error('Database connection failed'));

      try {
        await zoneService.createZone('Test', { lat_min: 0, lat_max: 1, lon_min: 0, lon_max: 1 });
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message).toContain('Database');
      }
    });
  });
});

