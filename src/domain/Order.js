const Location = require('./Location');

/**
 * Order — замовлення з координатами ресторану
 */
class Order {
  constructor(id, restaurantLocation) {
    if (!id || typeof id !== 'string') {
      throw new Error('Order ID must be a non-empty string');
    }

    if (!(restaurantLocation instanceof Location)) {
      throw new Error('Restaurant location must be an instance of Location class');
    }

    this._id = id;
    this._restaurantLocation = restaurantLocation;
    this._assignedCourierId = null;
  }

  get id() {
    return this._id;
  }

  get restaurantLocation() {
    return this._restaurantLocation;
  }

  get assignedCourierId() {
    return this._assignedCourierId;
  }

  /**
   * Призначити замовлення кур'єру
   */
  assignToCourier(courierId) {
    if (this._assignedCourierId) {
      throw new Error(`Order ${this._id} is already assigned to courier ${this._assignedCourierId}`);
    }

    if (!courierId) {
      throw new Error('Courier ID is required');
    }

    this._assignedCourierId = courierId;
  }

  /**
   * Перевірка чи замовлення призначене
   */
  isAssigned() {
    return this._assignedCourierId !== null;
  }

  toString() {
    return `Order(${this._id}, Restaurant: ${this._restaurantLocation.toString()}, Assigned: ${this._assignedCourierId || 'None'})`;
  }
}

module.exports = Order;