const { Order, OrderStatus } = require('../../src/domain/Order');
const Location = require('../../src/domain/Location');

describe('Order Domain', () => {
  describe('Order Creation', () => {
    test('should create order with valid parameters', () => {
      const location = new Location(10, 20);
      const order = new Order('order-1', location, 5);

      expect(order.id).toBe('order-1');
      expect(order.restaurantLocation.x).toBe(10);
      expect(order.restaurantLocation.y).toBe(20);
      expect(order.weight).toBe(5);
      expect(order.status).toBe(OrderStatus.PENDING);
      expect(order.assignedCourierId).toBeNull();
    });

    test('should throw error for invalid ID', () => {
      const location = new Location(10, 20);
      expect(() => new Order('', location, 5)).toThrow();
      expect(() => new Order(null, location, 5)).toThrow();
    });

    test('should throw error for invalid location', () => {
      expect(() => new Order('order-1', {}, 5)).toThrow();
    });

    test('should throw error for invalid weight', () => {
      const location = new Location(10, 20);
      expect(() => new Order('order-1', location, 0)).toThrow();
      expect(() => new Order('order-1', location, -5)).toThrow();
    });
  });

  describe('Order Assignment', () => {
    test('should assign order to courier', () => {
      const location = new Location(10, 20);
      const order = new Order('order-1', location, 5);

      order.assignToCourier('courier-1');

      expect(order.status).toBe(OrderStatus.ASSIGNED);
      expect(order.assignedCourierId).toBe('courier-1');
      expect(order.isAssigned()).toBe(true);
    });

    test('should not assign already assigned order', () => {
      const location = new Location(10, 20);
      const order = new Order('order-1', location, 5);

      order.assignToCourier('courier-1');
      expect(() => order.assignToCourier('courier-2')).toThrow();
    });
  });

  describe('Order Lifecycle', () => {
    test('should transition through statuses correctly', () => {
      const location = new Location(10, 20);
      const order = new Order('order-1', location, 5);

      // Assign
      order.assignToCourier('courier-1');
      expect(order.status).toBe(OrderStatus.ASSIGNED);

      // Pick up
      order.markAsPickedUp();
      expect(order.status).toBe(OrderStatus.PICKED_UP);

      // In transit
      order.markAsInTransit();
      expect(order.status).toBe(OrderStatus.IN_TRANSIT);

      // Delivered
      order.markAsDelivered();
      expect(order.status).toBe(OrderStatus.DELIVERED);
    });

    test('should not allow invalid status transitions', () => {
      const location = new Location(10, 20);
      const order = new Order('order-1', location, 5);

      // Can't pick up without assignment
      expect(() => order.markAsPickedUp()).toThrow();

      order.assignToCourier('courier-1');

      // Can't skip pickup
      expect(() => order.markAsInTransit()).toThrow();
    });

    test('should allow cancellation in pending/assigned status', () => {
      const location = new Location(10, 20);
      const order = new Order('order-1', location, 5);

      expect(order.canBeCancelled()).toBe(true);
      order.cancel();
      expect(order.status).toBe(OrderStatus.CANCELLED);
    });

    test('should not allow cancellation after pickup', () => {
      const location = new Location(10, 20);
      const order = new Order('order-1', location, 5);

      order.assignToCourier('courier-1');
      order.markAsPickedUp();

      expect(order.canBeCancelled()).toBe(false);
      expect(() => order.cancel()).toThrow();
    });
  });

  describe('Order Serialization', () => {
    test('should serialize to JSON', () => {
      const location = new Location(10, 20);
      const order = new Order('order-1', location, 5);
      order.assignToCourier('courier-1');

      const json = order.toJSON();

      expect(json).toHaveProperty('id', 'order-1');
      expect(json).toHaveProperty('weight', 5);
      expect(json).toHaveProperty('status', OrderStatus.ASSIGNED);
      expect(json).toHaveProperty('assignedCourierId', 'courier-1');
      expect(json.restaurantLocation).toEqual({ x: 10, y: 20 });
    });

    test('should deserialize from JSON', () => {
      const json = {
        id: 'order-1',
        restaurantLocation: { x: 10, y: 20 },
        weight: 5,
        status: OrderStatus.ASSIGNED,
        assignedCourierId: 'courier-1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        statusHistory: []
      };

      const order = Order.fromJSON(json);

      expect(order.id).toBe('order-1');
      expect(order.weight).toBe(5);
      expect(order.status).toBe(OrderStatus.ASSIGNED);
      expect(order.assignedCourierId).toBe('courier-1');
    });
  });
});

