const Location = require('./Location');
const { TransportType, getTransportType, canCarry } = require('./TransportType');

/**
 * Статуси кур'єра
 */
const CourierStatus = {
  FREE: 'Free',
  BUSY: 'Busy'
};

/**
 * Courier — кур'єр з координатами, статусом, транспортом та лічильником замовлень
 */
class Courier {
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
    this._transportType = getTransportType(transportTypeName);
    this._status = status;
    this._completedOrdersToday = 0;  // ⬅️ НОВИЙ ЛІЧИЛЬНИК
    this._currentOrderId = null;     // ⬅️ ПОТОЧНЕ ЗАМОВЛЕННЯ
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

  get transportType() {
    return this._transportType;
  }

  // ⬇️ НОВИЙ GETTER
  get completedOrdersToday() {
    return this._completedOrdersToday;
  }

  // ⬇️ НОВИЙ GETTER
  get currentOrderId() {
    return this._currentOrderId;
  }

  isFree() {
    return this._status === CourierStatus.FREE;
  }

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

  // ⬇️ НОВИЙ МЕ��ОД: Призначити замовлення
  assignOrder(orderId) {
    if (!this.isFree()) {
      throw new Error(`Courier ${this._id} is not free`);
    }
    this._currentOrderId = orderId;
    this.markAsBusy();
  }

  // ⬇️ НОВИЙ МЕТОД: Завершити замовлення
  completeOrder() {
    if (this._status !== CourierStatus.BUSY) {
      throw new Error(`Courier ${this._id} is not busy`);
    }

    if (!this._currentOrderId) {
      throw new Error(`Courier ${this._id} has no current order`);
    }

    const completedOrderId = this._currentOrderId;
    this._currentOrderId = null;
    this._completedOrdersToday++;
    this.markAsFree();

    return completedOrderId;
  }

  // ⬇️ НОВИЙ МЕТОД: Скинути лічильник (для нового дня)
  resetDailyCounter() {
    this._completedOrdersToday = 0;
  }

  updateLocation(newLocation) {
    if (!(newLocation instanceof Location)) {
      throw new Error('Location must be an instance of Location class');
    }
    this._location = newLocation;
  }

  toJSON() {
    return {
      id: this._id,
      status: this._status,
      transportType: this._transportType.name,
      maxWeight: this._transportType.maxWeight,
      completedOrdersToday: this._completedOrdersToday,  // ⬅️ ДОДАНО
      currentOrderId: this._currentOrderId,  // ⬅️ ДОДАНО
      coordinates: {
        x: this._location.x,
        y: this._location.y
      }
    };
  }

  toString() {
    return `Courier(${this._id}, ${this._location.toString()}, ${this._transportType.displayName}, Max: ${this._transportType.maxWeight}kg, ${this._status}, Completed: ${this._completedOrdersToday})`;
  }
}

module.exports = { Courier, CourierStatus };