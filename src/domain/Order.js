const Location = require('./Location');

/**
 * Статуси замовлення
 */
const OrderStatus = {
  CREATED: 'CREATED',
  ASSIGNED: 'ASSIGNED'
};

/**
 * Order — замовлення з ID, локацією та статусом
 */
class Order {
  constructor(id, location) {
    if (!id || typeof id !== 'string') {
      throw new Error('Order ID must be a non-empty string');
    }

    if (!(location instanceof Location)) {
      throw new Error('Location must be an instance of Location class');
    }

    this._id = id;
    this._location = location;
    this._status = OrderStatus.CREATED;
    this._assignedCourierId = null;
  }

  get id() {
    return this._id;
  }

  get location() {
    return this._location;
  }

  get status() {
    return this._status;
  }

  get assignedCourierId() {
    return this._assignedCourierId;
  }

  /**
   * Призначити замовлення кур'єру
   */
  assignToCourier(courierId) {
    if (this._status === OrderStatus.ASSIGNED) {
      throw new Error(`Order ${this._id} is already assigned`);
    }
    
    if (!courierId) {
      throw new Error('Courier ID is required');
    }

    this._status = OrderStatus.ASSIGNED;
    this._assignedCourierId = courierId;
  }

  /**
   * Перевірка чи замовлення призначене
   */
  isAssigned() {
    return this._status === OrderStatus.ASSIGNED;
  }

  toString() {
    return `Order(${this._id}, ${this._location.toString()}, ${this._status})`;
  }
}

module.exports = { Order, OrderStatus };