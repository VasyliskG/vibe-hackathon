/**
 * EtaCalculator.test.js - Tests for ETA (Estimated Time of Arrival) calculator
 */

const EtaCalculator = require('../src/optimization/EtaCalculator');

describe('EtaCalculator', () => {
  let etaCalculator;
  let mockOrder;
  let mockCourier;
  let mockQueue;

  beforeEach(() => {
    etaCalculator = new EtaCalculator();

    mockOrder = {
      id: 1,
      sender_location: { latitude: 40.7500, longitude: -73.9750 },
      receiver_location: { latitude: 40.7480, longitude: -73.9745 }
    };

    mockCourier = {
      id: 1,
      name: 'John Doe',
      transport_type: 'bike',
      current_location: { latitude: 40.7500, longitude: -73.9750 },
      status: 'active',
      average_rating: 4.5,
      successful_deliveries: 95,
      total_deliveries: 100
    };

    mockQueue = [];
  });

  describe('calculateEta', () => {
    test('should return valid ETA object', () => {
      const eta = etaCalculator.calculateEta(mockOrder, mockCourier, mockQueue);

      expect(eta).toBeDefined();
      expect(eta).toHaveProperty('eta');
      expect(eta).toHaveProperty('durationSeconds');
      expect(eta).toHaveProperty('confidence');
      expect(eta).toHaveProperty('breakdown');
    });

    test('should handle queue size', () => {
      const queueOrders = [
        { id: 2, receiver_location: { latitude: 40.7510, longitude: -73.9760 } },
        { id: 3, receiver_location: { latitude: 40.7490, longitude: -73.9740 } }
      ];

      const etaWithQueue = etaCalculator.calculateEta(mockOrder, mockCourier, queueOrders);
      const etaWithoutQueue = etaCalculator.calculateEta(mockOrder, mockCourier, []);

      expect(etaWithQueue.durationSeconds).toBeGreaterThan(etaWithoutQueue.durationSeconds);
    });

    test('should consider transport type', () => {
      const bikeCourier = { ...mockCourier, transport_type: 'bike' };
      const carCourier = { ...mockCourier, transport_type: 'car' };

      const etaBike = etaCalculator.calculateEta(mockOrder, bikeCourier, []);
      const etaCar = etaCalculator.calculateEta(mockOrder, carCourier, []);

      // Car should be faster for same distance
      expect(etaCar.durationSeconds).toBeLessThan(etaBike.durationSeconds);
    });

    test('should calculate confidence score', () => {
      const eta = etaCalculator.calculateEta(mockOrder, mockCourier, []);

      expect(eta.confidence).toBeGreaterThanOrEqual(0.3);
      expect(eta.confidence).toBeLessThanOrEqual(1.0);
    });

    test('should return ISO timestamp for ETA', () => {
      const eta = etaCalculator.calculateEta(mockOrder, mockCourier, []);
      const etaDate = new Date(eta.eta);

      expect(etaDate instanceof Date).toBe(true);
      expect(etaDate.getTime()).toBeGreaterThan(Date.now());
    });

    test('should handle null order/courier', () => {
      const etaNoOrder = etaCalculator.calculateEta(null, mockCourier, []);
      const etaNoCourier = etaCalculator.calculateEta(mockOrder, null, []);

      expect(etaNoOrder).toBeNull();
      expect(etaNoCourier).toBeNull();
    });
  });

  describe('calculateMultipleEta', () => {
    test('should calculate ETAs for multiple orders', () => {
      const orders = [mockOrder, { ...mockOrder, id: 2 }, { ...mockOrder, id: 3 }];
      const etas = etaCalculator.calculateMultipleEta(orders, mockCourier, []);

      expect(Array.isArray(etas)).toBe(true);
      expect(etas.length).toBe(3);
    });

    test('should return sorted by ETA', () => {
      const orders = [mockOrder, { ...mockOrder, id: 2 }, { ...mockOrder, id: 3 }];
      const etas = etaCalculator.calculateMultipleEta(orders, mockCourier, []);

      for (let i = 0; i < etas.length - 1; i++) {
        const eta1 = new Date(etas[i].eta).getTime();
        const eta2 = new Date(etas[i + 1].eta).getTime();
        expect(eta1).toBeLessThanOrEqual(eta2);
      }
    });
  });

  describe('canMeetSla', () => {
    test('should check SLA compliance', () => {
      const slaDeadline = new Date(Date.now() + 3600000); // 1 hour from now
      const slaStatus = etaCalculator.canMeetSla(mockOrder, mockCourier, mockQueue, slaDeadline);

      expect(slaStatus).toHaveProperty('canMeet');
      expect(slaStatus).toHaveProperty('marginMinutes');
      expect(typeof slaStatus.canMeet).toBe('boolean');
    });

    test('should return negative margin if SLA violated', () => {
      const slaDeadline = new Date(Date.now() - 3600000); // 1 hour ago (in past)
      const slaStatus = etaCalculator.canMeetSla(mockOrder, mockCourier, mockQueue, slaDeadline);

      expect(slaStatus.canMeet).toBe(false);
      expect(slaStatus.marginMinutes).toBeLessThan(0);
    });
  });

  describe('findBestCourier', () => {
    test('should find best courier among options', () => {
      const couriers = [mockCourier, { ...mockCourier, id: 2, average_rating: 3.5 }];
      const result = etaCalculator.findBestCourier(mockOrder, couriers);

      expect(result).toHaveProperty('best');
      expect(result).toHaveProperty('all');
      expect(result).toHaveProperty('recommendation');
      expect(result.best.courier.id).toBe(1); // Higher rating
    });

    test('should rank couriers by score', () => {
      const couriers = [
        { ...mockCourier, id: 1, average_rating: 4.5 },
        { ...mockCourier, id: 2, average_rating: 3.0 }
      ];
      const result = etaCalculator.findBestCourier(mockOrder, couriers);

      expect(result.all[0].score).toBeGreaterThanOrEqual(result.all[1].score);
    });

    test('should return correct recommendation', () => {
      const couriers = [mockCourier];
      const result = etaCalculator.findBestCourier(mockOrder, couriers);

      expect(result.recommendation).toBe(mockCourier.id);
    });
  });

  describe('getAccuracyStats', () => {
    test('should calculate accuracy from historical data', () => {
      const historicalData = [
        {
          estimatedEta: new Date().toISOString(),
          actualEta: new Date(Date.now() + 300000).toISOString() // 5 min later
        },
        {
          estimatedEta: new Date().toISOString(),
          actualEta: new Date(Date.now() + 600000).toISOString() // 10 min later
        }
      ];

      const stats = etaCalculator.getAccuracyStats(historicalData);

      expect(stats).toHaveProperty('sampleSize');
      expect(stats).toHaveProperty('avgErrorMinutes');
      expect(stats).toHaveProperty('accuracy');
      expect(stats.sampleSize).toBe(2);
    });

    test('should return null for empty data', () => {
      const stats = etaCalculator.getAccuracyStats([]);
      expect(stats).toBeNull();
    });

    test('should handle missing eta data', () => {
      const historicalData = [
        { actualEta: new Date().toISOString() } // Missing estimatedEta
      ];
      const stats = etaCalculator.getAccuracyStats(historicalData);
      expect(stats).toBeNull();
    });
  });

  describe('traffic multiplier', () => {
    test('should apply traffic multipliers for rush hours', () => {
      // Morning rush: 8 AM
      const earlyMorning = new Date();
      earlyMorning.setHours(8);

      const etaMorning = etaCalculator.calculateEta(mockOrder, mockCourier, [], earlyMorning);

      // Off-peak: 2 AM
      const earlyNight = new Date();
      earlyNight.setHours(2);

      const etaNight = etaCalculator.calculateEta(mockOrder, mockCourier, [], earlyNight);

      // Morning should have higher duration due to traffic
      expect(etaMorning.durationSeconds).toBeGreaterThan(etaNight.durationSeconds);
    });
  });

  describe('confidence scoring', () => {
    test('should reduce confidence for high queue', () => {
      const highQueue = new Array(10).fill({ receiver_location: { latitude: 40.7500, longitude: -73.9750 } });

      const etaSmallQueue = etaCalculator.calculateEta(mockOrder, mockCourier, []);
      const etaLargeQueue = etaCalculator.calculateEta(mockOrder, mockCourier, highQueue);

      expect(etaSmallQueue.confidence).toBeGreaterThan(etaLargeQueue.confidence);
    });

    test('should reduce confidence for far orders', () => {
      const nearOrder = { ...mockOrder };
      const farOrder = {
        ...mockOrder,
        sender_location: { latitude: 40.9000, longitude: -73.9750 } // ~20km away
      };

      const etaNear = etaCalculator.calculateEta(nearOrder, mockCourier, []);
      const etaFar = etaCalculator.calculateEta(farOrder, mockCourier, []);

      expect(etaNear.confidence).toBeGreaterThan(etaFar.confidence);
    });
  });
});

