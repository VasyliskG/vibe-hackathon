const Location = require('./Location');

/**
 * Статуси кур'єра
 */
const CourierStatus = {
  FREE: 'Free',
  BUSY: 'Busy'
};

/**
 * Courier — кур'єр з координатами та статусом
 */
class Courier {
  constructor(id, location, status = CourierStatus.FREE) {
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

  /**
   * Перевірка чи кур'єр вільний
   */
  isFree() {
    return this._status === CourierStatus.FREE;
  }

  /**
   * Змінити статус на Busy
   */
  markAsBusy() {
    if (this._status === CourierStatus.BUSY) {
      throw new Error(`Courier ${this._id} is already busy`);
    }
    this._status = CourierStatus.BUSY;
  }

  /**
   * Змінити статус на Free
   */
  markAsFree() {
    if (this._status === CourierStatus.FREE) {
      throw new Error(`Courier ${this._id} is already free`);
    }
    this._status = CourierStatus.FREE;
  }

  /**
   * Оновити локацію кур'єра
   */
  updateLocation(newLocation) {
    if (!(newLocation instanceof Location)) {
      throw new Error('Location must be an instance of Location class');
    }
    this._location = newLocation;
  }

  /**
   * Експорт у JSON
   */
  toJSON() {
    return {
      id: this._id,
      status: this._status,
      coordinates: {
        x: this._location.x,
        y: this._location.y
      }
    };
  }

  toString() {
    return `Courier(${this._id}, ${this._location.toString()}, ${this._status})`;
  }
}

module.exports = { Courier, CourierStatus };