/**
 * Location — immutable клас для координат у сітці 0-100
 */
class Location {
  constructor(x, y) {
    // Валідація: координати мають бути числами
    if (typeof x !== 'number' || typeof y !== 'number') {
      throw new Error('Coordinates must be numbers');
    }

    // Валідація: координати в межах 0-100
    if (x < 0 || x > 100 || y < 0 || y > 100) {
      throw new Error('Coordinates must be between 0 and 100');
    }

    // Робимо immutable
    Object.defineProperty(this, 'x', {
      value: x,
      writable: false,
      enumerable: true,
      configurable: false
    });

    Object.defineProperty(this, 'y', {
      value: y,
      writable: false,
      enumerable: true,
      configurable: false
    });

    Object.freeze(this);
  }

  toString() {
    return `Location(${this.x}, ${this.y})`;
  }
}

module.exports = Location;
