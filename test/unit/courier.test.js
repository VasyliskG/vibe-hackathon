const { Courier, CourierStatus } = require('../../src/domain/Courier');
const Location = require('../../src/domain/Location');

describe('Courier Domain', () => {
  describe('Courier Creation', () => {
    test('should create courier with valid parameters', () => {
      const location = new Location(10, 20);
      const courier = new Courier('courier-1', location, 'bicycle');

      expect(courier.id).toBe('courier-1');
      expect(courier.location.x).toBe(10);
      expect(courier.location.y).toBe(20);
      expect(courier.transportType.name).toBe('bicycle');
      expect(courier.status).toBe(CourierStatus.FREE);
      expect(courier.completedOrdersToday).toBe(0);
    });

    test('should throw error for invalid ID', () => {
      const location = new Location(10, 20);
      expect(() => new Courier('', location, 'bicycle')).toThrow();
    });

    test('should throw error for invalid transport type', () => {
      const location = new Location(10, 20);
      expect(() => new Courier('courier-1', location, 'invalid')).toThrow();
    });
  });

  describe('Courier Status Management', () => {
    test('should change status to busy', () => {
      const location = new Location(10, 20);
      const courier = new Courier('courier-1', location, 'bicycle');

      courier.markAsBusy();
      expect(courier.status).toBe(CourierStatus.BUSY);
      expect(courier.isFree()).toBe(false);
    });

    test('should change status to free', () => {
      const location = new Location(10, 20);
      const courier = new Courier('courier-1', location, 'bicycle', CourierStatus.BUSY);

      courier.markAsFree();
      expect(courier.status).toBe(CourierStatus.FREE);
      expect(courier.isFree()).toBe(true);
    });

    test('should not allow marking busy courier as busy again', () => {
      const location = new Location(10, 20);
      const courier = new Courier('courier-1', location, 'bicycle');

      courier.markAsBusy();
      expect(() => courier.markAsBusy()).toThrow();
    });
  });

  describe('Order Assignment', () => {
    test('should assign order to free courier', () => {
      const location = new Location(10, 20);
      const courier = new Courier('courier-1', location, 'bicycle');

      courier.assignOrder('order-1');

      expect(courier.currentOrderId).toBe('order-1');
      expect(courier.status).toBe(CourierStatus.BUSY);
    });

    test('should not assign order to busy courier', () => {
      const location = new Location(10, 20);
      const courier = new Courier('courier-1', location, 'bicycle');

      courier.assignOrder('order-1');
      expect(() => courier.assignOrder('order-2')).toThrow();
    });
  });

  describe('Order Completion', () => {
    test('should complete order and increment counter', () => {
      const location = new Location(10, 20);
      const courier = new Courier('courier-1', location, 'bicycle');

      courier.assignOrder('order-1');
      const completedOrderId = courier.completeOrder();

      expect(completedOrderId).toBe('order-1');
      expect(courier.currentOrderId).toBeNull();
      expect(courier.status).toBe(CourierStatus.FREE);
      expect(courier.completedOrdersToday).toBe(1);
    });

    test('should increment counter with multiple completions', () => {
      const location = new Location(10, 20);
      const courier = new Courier('courier-1', location, 'bicycle');

      courier.assignOrder('order-1');
      courier.completeOrder();
      expect(courier.completedOrdersToday).toBe(1);

      courier.assignOrder('order-2');
      courier.completeOrder();
      expect(courier.completedOrdersToday).toBe(2);

      courier.assignOrder('order-3');
      courier.completeOrder();
      expect(courier.completedOrdersToday).toBe(3);
    });
  });

  describe('Weight Capacity', () => {
    test('walker should carry up to 5kg', () => {
      const location = new Location(10, 20);
      const courier = new Courier('courier-1', location, 'walker');

      expect(courier.canCarryWeight(3)).toBe(true);
      expect(courier.canCarryWeight(5)).toBe(true);
      expect(courier.canCarryWeight(6)).toBe(false);
    });

    test('bicycle should carry up to 10kg', () => {
      const location = new Location(10, 20);
      const courier = new Courier('courier-1', location, 'bicycle');

      expect(courier.canCarryWeight(10)).toBe(true);
      expect(courier.canCarryWeight(11)).toBe(false);
    });

    test('car should carry up to 100kg', () => {
      const location = new Location(10, 20);
      const courier = new Courier('courier-1', location, 'car');

      expect(courier.canCarryWeight(50)).toBe(true);
      expect(courier.canCarryWeight(100)).toBe(true);
      expect(courier.canCarryWeight(101)).toBe(false);
    });
  });

  describe('Daily Counter Reset', () => {
    test('should reset daily counter', () => {
      const location = new Location(10, 20);
      const courier = new Courier('courier-1', location, 'bicycle');

      courier.assignOrder('order-1');
      courier.completeOrder();
      expect(courier.completedOrdersToday).toBe(1);

      courier.resetDailyCounter();
      expect(courier.completedOrdersToday).toBe(0);
    });
  });

  describe('Location Update', () => {
    test('should update courier location', () => {
      const location = new Location(10, 20);
      const courier = new Courier('courier-1', location, 'bicycle');

      const newLocation = new Location(30, 40);
      courier.updateLocation(newLocation);

      expect(courier.location.x).toBe(30);
      expect(courier.location.y).toBe(40);
    });

    test('should throw error for invalid location', () => {
      const location = new Location(10, 20);
      const courier = new Courier('courier-1', location, 'bicycle');

      expect(() => courier.updateLocation({})).toThrow();
    });
  });

  describe('Serialization', () => {
    test('should serialize to JSON', () => {
      const location = new Location(10, 20);
      const courier = new Courier('courier-1', location, 'bicycle');
      courier.assignOrder('order-1');
      courier.completeOrder();

      const json = courier.toJSON();

      expect(json.id).toBe('courier-1');
      expect(json.transportType).toBe('bicycle');
      expect(json.status).toBe(CourierStatus.FREE);
      expect(json.completedOrdersToday).toBe(1);
      expect(json.coordinates).toEqual({ x: 10, y: 20 });
    });
  });
});

