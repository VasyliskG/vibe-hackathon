/**
 * PathFinder — алгоритм Дейкстри для пошуку найкоротшого шляху на карті
 */
class PathFinder {
  /**
   * Знайти найкоротший шлях за допомогою алгоритму Дейкстри
   *
   * @param {Map} map - Карта міста
   * @param {Location} start - Початкова точка
   * @param {Location} end - Кінцева точка
   * @returns {Object} { path: Array, distance: Number } або null якщо шлях не знайдено
   */
  static findPath(map, start, end) {
    // Перевірка валідності точок
    if (!map.isWalkable(start.x, start.y)) {
      throw new Error(`Start position (${start.x}, ${start.y}) is not walkable`);
    }
    if (!map.isWalkable(end.x, end.y)) {
      throw new Error(`End position (${end.x}, ${end.y}) is not walkable`);
    }

    // Якщо старт = кінець
    if (start.x === end.x && start.y === end.y) {
      return {
        path: [{ x: start.x, y: start.y }],
        distance: 0
      };
    }

    // Ініціалізація
    const distances = new Map(); // відстані від старту
    const previous = new Map();  // попередня клітина в шляху
    const unvisited = new Set(); // невідвідані вершини

    const startKey = `${start.x},${start.y}`;
    const endKey = `${end.x},${end.y}`;

    // Отримати всі прохідні клітини
    const walkableCells = map.getWalkableCells();

    // Ініціалізувати відстані
    walkableCells.forEach(cell => {
      const key = `${cell.x},${cell.y}`;
      distances.set(key, Infinity);
      unvisited.add(key);
    });

    distances.set(startKey, 0);

    // Основний цикл алгоритму Дейкстри
    while (unvisited.size > 0) {
      // Знайти вершину з найменшою відстанню
      let currentKey = null;
      let minDistance = Infinity;

      for (const key of unvisited) {
        const dist = distances.get(key);
        if (dist < minDistance) {
          minDistance = dist;
          currentKey = key;
        }
      }

      // Якщо не знайдено досяжних вершин
      if (currentKey === null || minDistance === Infinity) {
        break;
      }

      // Якщо дійшли до кінця
      if (currentKey === endKey) {
        break;
      }

      // Видалити поточну вершину з невідвіданих
      unvisited.delete(currentKey);

      // Отримати координати поточної вершини
      const [x, y] = currentKey.split(',').map(Number);

      // Перевірити всіх сусідів
      const neighbors = map.getNeighbors(x, y);

      for (const neighbor of neighbors) {
        const neighborKey = `${neighbor.x},${neighbor.y}`;

        if (!unvisited.has(neighborKey)) {
          continue;
        }

        // Вага ребра = 1 (кожен крок коштує 1)
        const altDistance = distances.get(currentKey) + 1;

        if (altDistance < distances.get(neighborKey)) {
          distances.set(neighborKey, altDistance);
          previous.set(neighborKey, currentKey);
        }
      }
    }

    // Перевірити чи знайдено шлях
    const finalDistance = distances.get(endKey);
    if (finalDistance === Infinity) {
      return null; // Шлях не знайдено
    }

    // Відновити шлях
    const path = [];
    let currentKey = endKey;

    while (currentKey) {
      const [x, y] = currentKey.split(',').map(Number);
      path.unshift({ x, y });
      currentKey = previous.get(currentKey);
    }

    return {
      path: path,
      distance: finalDistance
    };
  }

  /**
   * Знайти відстань без відновлення шляху (швидше)
   *
   * @param {Map} map - Карта міста
   * @param {Location} start - Початкова точка
   * @param {Location} end - Кінцева точка
   * @returns {Number|null} відстань або null якщо шлях не знайдено
   */
  static findDistance(map, start, end) {
    const result = this.findPath(map, start, end);
    return result ? result.distance : null;
  }

  /**
   * Знайти відстані від однієї точки до багатьох (оптимізація)
   *
   * @param {Map} map - Карта міста
   * @param {Location} start - Початкова точка
   * @param {Array<Location>} targets - Цільові точки
   * @returns {Map} Map з ключами "x,y" та значеннями відстаней
   */
  static findDistancesToMultiple(map, start, targets) {
    if (!map.isWalkable(start.x, start.y)) {
      throw new Error(`Start position (${start.x}, ${start.y}) is not walkable`);
    }

    // Ініціалізація
    const distances = new Map();
    const unvisited = new Set();

    const startKey = `${start.x},${start.y}`;

    // Створити Set з цільових точок для швидкої перевірки
    const targetKeys = new Set(
        targets.map(t => `${t.x},${t.y}`)
    );

    // Отримати всі прохідні клітини
    const walkableCells = map.getWalkableCells();

    // Ініціалізувати відстані
    walkableCells.forEach(cell => {
      const key = `${cell.x},${cell.y}`;
      distances.set(key, Infinity);
      unvisited.add(key);
    });

    distances.set(startKey, 0);

    let foundTargets = 0;

    // Основний цикл
    while (unvisited.size > 0 && foundTargets < targets.length) {
      // Знайти вершину з найменшою відстанню
      let currentKey = null;
      let minDistance = Infinity;

      for (const key of unvisited) {
        const dist = distances.get(key);
        if (dist < minDistance) {
          minDistance = dist;
          currentKey = key;
        }
      }

      if (currentKey === null || minDistance === Infinity) {
        break;
      }

      // Перевірити чи це цільова точка
      if (targetKeys.has(currentKey)) {
        foundTargets++;
      }

      unvisited.delete(currentKey);

      const [x, y] = currentKey.split(',').map(Number);
      const neighbors = map.getNeighbors(x, y);

      for (const neighbor of neighbors) {
        const neighborKey = `${neighbor.x},${neighbor.y}`;

        if (!unvisited.has(neighborKey)) {
          continue;
        }

        const altDistance = distances.get(currentKey) + 1;

        if (altDistance < distances.get(neighborKey)) {
          distances.set(neighborKey, altDistance);
        }
      }
    }

    // Повернути тільки відстані до цільових точок
    const result = new Map();
    targets.forEach(target => {
      const key = `${target.x},${target.y}`;
      const distance = distances.get(key);
      if (distance !== Infinity) {
        result.set(key, distance);
      }
    });

    return result;
  }
}

module.exports = PathFinder;