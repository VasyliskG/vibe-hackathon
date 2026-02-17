const Location = require('./Location');

/**
 * Order Status Lifecycle
 */
const OrderStatus = {
  PENDING: 'pending',         // Створено, очікує призначення
  ASSIGNED: 'assigned',       // Призначено кур'єру
  PICKED_UP: 'picked_up',     // Кур'єр забрав з ресторану
  IN_TRANSIT: 'in_transit',   // В дорозі до клієнта
  DELIVERED: 'delivered',     // Доставлено
  CANCELLED: 'cancelled'      // Скасовано
};

/**
 * Order — замовлення з lifecycle статусами
 */
class Order {
  constructor(id, restaurantLocation, weight = 1) {
    if (!id || typeof id !== 'string') {
      throw new Error('Order ID must be a non-empty string');
    }

    if (!(restaurantLocation instanceof Location)) {
      throw new Error('Restaurant location must be an instance of Location class');
    }

    if (typeof weight !== 'number' || weight <= 0) {
      throw new Error('Weight must be a positive number');
    }

    this._id = id;
    this._restaurantLocation = restaurantLocation;
    this._weight = weight;
    this._status = OrderStatus.PENDING;
    this._assignedCourierId = null;
    this._createdAt = Date.now();
    this._updatedAt = Date.now();
    this._statusHistory = [
      { status: OrderStatus.PENDING, timestamp: Date.now() }
    ];
  }

  get id() {
    return this._id;
  }

  get restaurantLocation() {
    return this._restaurantLocation;
  }

  get weight() {
    return this._weight;
  }

  get status() {
    return this._status;
  }

  get assignedCourierId() {
    return this._assignedCourierId;
  }

  get createdAt() {
    return this._createdAt;
  }

  get updatedAt() {
    return this._updatedAt;
  }

  get statusHistory() {
    return [...this._statusHistory];
  }

  isAssigned() {
    return this._assignedCourierId !== null;
  }

  canBeCancelled() {
    return [OrderStatus.PENDING, OrderStatus.ASSIGNED].includes(this._status);
  }

  assignToCourier(courierId) {
    if (this._status !== OrderStatus.PENDING) {
      throw new Error(`Order ${this._id} cannot be assigned in status ${this._status}`);
    }

    if (!courierId) {
      throw new Error('Courier ID is required');
    }

    this._assignedCourierId = courierId;
    this._changeStatus(OrderStatus.ASSIGNED);
  }

  markAsPickedUp() {
    if (this._status !== OrderStatus.ASSIGNED) {
      throw new Error(`Order ${this._id} must be assigned before pickup`);
    }
    this._changeStatus(OrderStatus.PICKED_UP);
  }

  markAsInTransit() {
    if (this._status !== OrderStatus.PICKED_UP) {
      throw new Error(`Order ${this._id} must be picked up before transit`);
    }
    this._changeStatus(OrderStatus.IN_TRANSIT);
  }

  markAsDelivered() {
    if (this._status !== OrderStatus.IN_TRANSIT) {
      throw new Error(`Order ${this._id} must be in transit before delivery`);
    }
    this._changeStatus(OrderStatus.DELIVERED);
  }

  cancel() {
    if (!this.canBeCancelled()) {
      throw new Error(`Order ${this._id} cannot be cancelled in status ${this._status}`);
    }
    this._changeStatus(OrderStatus.CANCELLED);
  }

  _changeStatus(newStatus) {
    this._status = newStatus;
    this._updatedAt = Date.now();
    this._statusHistory.push({
      status: newStatus,
      timestamp: Date.now()
    });
  }

  toJSON() {
    return {
      id: this._id,
      restaurantLocation: {
        x: this._restaurantLocation.x,
        y: this._restaurantLocation.y
      },
      weight: this._weight,
      status: this._status,
      assignedCourierId: this._assignedCourierId,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      statusHistory: this._statusHistory
    };
  }

  static fromJSON(json) {
    const order = new Order(
        json.id,
        new Location(json.restaurantLocation.x, json.restaurantLocation.y),
        json.weight
    );

    order._status = json.status;
    order._assignedCourierId = json.assignedCourierId;
    order._createdAt = json.createdAt;
    order._updatedAt = json.updatedAt;
    order._statusHistory = json.statusHistory || [];

    return order;
  }

  toString() {
    return `Order(${this._id}, Status: ${this._status}, Weight: ${this._weight}kg, Courier: ${this._assignedCourierId || 'None'})`;
  }
}

module.exports = { Order, OrderStatus };