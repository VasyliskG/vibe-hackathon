const Location = require('../domain/Location');

/**
 * DistanceCalculator — обчислення відстані між локаціями
 */
class DistanceCalculator {
  /**
   * Обчислює Евклідову відстань між двома локаціями
   * Формула: √((x2-x1)² + (y2-y1)²)
   */
  static calculate(location1, location2) {
    if (!(location1 instanceof Location) || !(location2 instanceof Location)) {
      throw new Error('Both parameters must be instances of Location');
    }

    const dx = location2.x - location1.x;
    const dy = location2.y - location1.y;

    return Math.sqrt(dx * dx + dy * dy);
  }
}

module.exports = DistanceCalculator;