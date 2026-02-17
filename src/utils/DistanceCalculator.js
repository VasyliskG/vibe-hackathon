const Location = require('../domain/Location');

/**
 * DistanceCalculator — обчислення відстаней між локаціями
 */
class DistanceCalculator {
  /**
   * Обчислює Евклідову відстань між двома локаціями
   * Формула: √((x2-x1)² + (y2-y1)²)
   */
  static euclidean(location1, location2) {
    if (!(location1 instanceof Location) || !(location2 instanceof Location)) {
      throw new Error('Both parameters must be instances of Location');
    }

    const dx = location2.x - location1.x;
    const dy = location2.y - location1.y;

    return Math.sqrt(dx * dx + dy * dy);
  }

  // ⬇️ НОВИЙ МЕТОД
  /**
   * Обчислює Manhattan відстань між двома локаціями
   * Формула: |x2-x1| + |y2-y1|
   * Використовується для сіткової карти міста
   */
  static manhattan(location1, location2) {
    if (!(location1 instanceof Location) || !(location2 instanceof Location)) {
      throw new Error('Both parameters must be instances of Location');
    }

    const dx = Math.abs(location2.x - location1.x);
    const dy = Math.abs(location2.y - location1.y);

    return dx + dy;
  }

  // ⬇️ НОВИЙ УНІВЕРСАЛЬНИЙ МЕТОД
  /**
   * Обчислити відстань (за замовчуванням Manhattan для сітки)
   */
  static calculate(location1, location2, method = 'manhattan') {
    if (method === 'manhattan') {
      return this.manhattan(location1, location2);
    } else if (method === 'euclidean') {
      return this.euclidean(location1, location2);
    } else {
      throw new Error(`Unknown distance method: ${method}. Use 'manhattan' or 'euclidean'`);
    }
  }
}

module.exports = DistanceCalculator;