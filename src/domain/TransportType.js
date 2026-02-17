/**
 * TransportType — типи транспорту з обмеженнями вантажопідйомності
 */
const TransportType = {
  WALKER: {
    name: 'walker',
    maxWeight: 5,
    displayName: '🚶 Пішохід',
    speedMultiplier: 1.0
  },
  BICYCLE: {
    name: 'bicycle',
    maxWeight: 15,
    displayName: '🚲 Велосипед',
    speedMultiplier: 1.5
  },
  SCOOTER: {
    name: 'scooter',
    maxWeight: 50,
    displayName: '🛵 Скутер',
    speedMultiplier: 2.0
  },
  CAR: {
    name: 'car',
    maxWeight: 50,
    displayName: '🚗 Автомобіль',
    speedMultiplier: 2.5
  }
};

/**
 * Отримати тип транспорту за назвою
 */
function getTransportType(name) {
  const type = Object.values(TransportType).find(t => t.name === name);
  if (!type) {
    throw new Error(`Unknown transport type: ${name}`);
  }
  return type;
}

/**
 * Перевірити чи транспорт може перевезти вагу
 */
function canCarry(transportType, weight) {
  if (typeof weight !== 'number' || weight < 0) {
    throw new Error('Weight must be a non-negative number');
  }
  return weight <= transportType.maxWeight;
}

/**
 * Отримати всі типи транспорту, які можуть перевезти вагу
 */
function getSuitableTransportTypes(weight) {
  return Object.values(TransportType).filter(t => canCarry(t, weight));
}

module.exports = {
  TransportType,
  getTransportType,
  canCarry,
  getSuitableTransportTypes
};