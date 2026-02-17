const Location = require('./Location');
const { TransportType, getTransportType, canCarry } = require('./TransportType');  // ⬅️ ІМПОРТ

/**
 * Статуси кур'єра
 */
const CourierStatus = {
  FREE: 'Free',
  BUSY: 'Busy'
};

/**
 * Courier — кур'єр з координатами, статусом та типом транспорту
 */
class Courier {
  // ⬇️ ДОДАНО transportTypeName
  constructor(id, location, transportTypeName, status = CourierStatus.FREE) {
    if (!id || typeof id !== 'string') {
      throw new Error('Courier ID must be a non-empty string');
    }

    if (!(location instanceof Location)) {
      throw new Error('Location must be an instance of Location class');
    }

    if (!Object.values(CourierStatus).includes(status)) {
      throw new Error(`Status must be one of: ${Object.values(CourierStatus).join(', ')}`);
    }

    this._id = id;
    this._location = location;
    this._transportType = getTransportType(transportTypeName);  // ⬅️ НОВЕ ПОЛЕ
    this._status = status;
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

  // ⬇️ НОВИЙ GETTER
  get transportType() {
    return this._transportType;
  }

  isFree() {
    return this._status === CourierStatus.FREE;
  }

  // ⬇️ НОВИЙ МЕТОД
  /**
   * Перевірити чи кур'єр може перевезти вагу
   */
  canCarryWeight(weight) {
    return canCarry(this._transportType, weight);
  }

  markAsBusy() {
    if (this._status === CourierStatus.BUSY) {
      throw new Error(`Courier ${this._id} is already busy`);
    }
    this._status = CourierStatus.BUSY;
  }

  markAsFree() {
    if (this._status === CourierStatus.FREE) {
      throw new Error(`Courier ${this._id} is already free`);
    }
    this._status = CourierStatus.FREE;
  }

  updateLocation(newLocation) {
    if (!(newLocation instanceof Location)) {
      throw new Error('Location must be an instance of Location class');
    }
    this._location = newLocation;
  }

  // ⬇️ ОНОВЛЕНИЙ toJSON
  toJSON() {
    return {
      id: this._id,
      status: this._status,
      transportType: this._transportType.name,  // ⬅️ ДОДАНО
      maxWeight: this._transportType.maxWeight,  // ⬅️ ДОДАНО
      coordinates: {
        x: this._location.x,
        y: this._location.y
      }
    };
  }

  // ⬇️ ОНОВЛЕНИЙ toString
  toString() {
    return `Courier(${this._id}, ${this._location.toString()}, ${this._transportType.displayName}, Max: ${this._transportType.maxWeight}kg, ${this._status})`;
  }
}

module.exports = { Courier, CourierStatus };