const Location = require('./Location');

/**
 * Courier — кур'єр з локацією та вантажопідйомністю
 */
class Courier {
  constructor(id, location, capacity = 1) {
    if (!id || typeof id !== 'string') {
      throw new Error('Courier ID must be a non-empty string');
    }

    if (!(location instanceof Location)) {
      throw new Error('Location must be an instance of Location class');
    }

    if (typeof capacity !== 'number' || capacity < 1) {
      throw new Error('Capacity must be a number >= 1');
    }

    this._id = id;
    this._location = location;
    this._capacity = capacity;
    this._isAvailable = true;
    this._currentLoad = 0;
    this._assignedOrders = [];
  }

  get id() {
    return this._id;
  }

  get location() {
    return this._location;
  }

  get capacity() {
    return this._capacity;
  }

  get isAvailable() {
    return this._isAvailable && this._currentLoad < this._capacity;
  }

  get currentLoad() {
    return this._currentLoad;
  }

  get assignedOrders() {
    return [...this._assignedOrders]; // Повертаємо копію
  }

  /**
   * Призначити замовлення кур'єру
   */
  assignOrder(orderId) {
    if (!this.isAvailable) {
      throw new Error(`Courier ${this._id} is not available`);
    }
    this._currentLoad++;
    this._assignedOrders.push(orderId);
  }

  /**
   * Змінити доступність
   */
  setAvailability(isAvailable) {
    if (typeof isAvailable !== 'boolean') {
      throw new Error('Availability must be a boolean');
    }
    this._isAvailable = isAvailable;
  }

  /**
   * Оновити локацію
   */
  updateLocation(newLocation) {
    if (!(newLocation instanceof Location)) {
      throw new Error('Location must be an instance of Location class');
    }
    this._location = newLocation;
  }

  toString() {
    return `Courier(${this._id}, ${this._location.toString()}, available: ${this.isAvailable}, load: ${this._currentLoad}/${this._capacity})`;
  }
}

module.exports = Courier;