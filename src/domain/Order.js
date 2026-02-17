const Location = require('./Location');

/**
 * Order — замовлення з координатами ресторану та вагою
 */
class Order {
  constructor(id, restaurantLocation, weight = 1) {  // ⬅️ ДОДАНО weight
    if (!id || typeof id !== 'string') {
      throw new Error('Order ID must be a non-empty string');
    }

    if (!(restaurantLocation instanceof Location)) {
      throw new Error('Restaurant location must be an instance of Location class');
    }

    // ⬇️ НОВА ВАЛ��ДАЦІЯ ВАГИ
    if (typeof weight !== 'number' || weight <= 0) {
      throw new Error('Weight must be a positive number');
    }

    this._id = id;
    this._restaurantLocation = restaurantLocation;
    this._weight = weight;  // ⬅️ НОВЕ ПОЛЕ
    this._assignedCourierId = null;
  }

  get id() {
    return this._id;
  }

  get restaurantLocation() {
    return this._restaurantLocation;
  }

  // ⬇️ НОВИЙ GETTER
  get weight() {
    return this._weight;
  }

  get assignedCourierId() {
    return this._assignedCourierId;
  }

  assignToCourier(courierId) {
    if (this._assignedCourierId) {
      throw new Error(`Order ${this._id} is already assigned to courier ${this._assignedCourierId}`);
    }

    if (!courierId) {
      throw new Error('Courier ID is required');
    }

    this._assignedCourierId = courierId;
  }

  isAssigned() {
    return this._assignedCourierId !== null;
  }

  // ⬇️ ОНОВЛЕНИЙ toJSON
  toJSON() {
    return {
      id: this._id,
      location: {
        x: this._restaurantLocation.x,
        y: this._restaurantLocation.y
      },
      weight: this._weight,  // ⬅️ ДОДАНО
      assignedCourierId: this._assignedCourierId
    };
  }

  // ⬇️ ОНОВЛЕНИЙ toString
  toString() {
    return `Order(${this._id}, Restaurant: ${this._restaurantLocation.toString()}, Weight: ${this._weight}kg, Assigned: ${this._assignedCourierId || 'None'})`;
  }
}

module.exports = Order;