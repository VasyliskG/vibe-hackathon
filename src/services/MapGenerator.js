const Map = require('../domain/Map');

/**
 * MapGenerator — генератор зв'язної карти міста
 * Використовує модифікований алгоритм "Growing Tree" для забезпечення зв'язності
 */
class MapGenerator {
  /**
   * Генерувати карту
   * @param {number} size - Розмір карти (за замовчуванням 100)
   * @param {number} wallProb - Ймовірність стіни 0-1 (за замовчуванням 0.3)
   * @returns {Map}
   */
  static generate(size = 100, wallProb = 0.3) {
    if (wallProb < 0 || wallProb > 1) {
      throw new Error('wallProb must be between 0 and 1');
    }

    // Крок 1: Створити масив заповнений стінами
    const grid = Array(size).fill(null).map(() => Array(size).fill(1));

    // Крок 2: Почати з випадкової клітини
    const startX = Math.floor(Math.random() * size);
    const startY = Math.floor(Math.random() * size);
    grid[startY][startX] = 0;

    // Крок 3: Використовуємо модифікований алгоритм Growing Tree
    const frontier = [{ x: startX, y: startY }];
    const visited = new Set([`${startX},${startY}`]);

    while (frontier.length > 0) {
      // Вибрати випадковий елемент з frontier (для більшої випадковості)
      const index = Math.floor(Math.random() * frontier.length);
      const current = frontier[index];

      // Отримати всіх невідвіданих сусідів
      const neighbors = this._getUnvisitedNeighbors(current.x, current.y, size, visited);

      if (neighbors.length > 0) {
        // Вибрати випадкового сусіда
        const neighbor = neighbors[Math.floor(Math.random() * neighbors.length)];

        // Зробити його прохідним (з урахуванням wallProb)
        if (Math.random() > wallProb) {
          grid[neighbor.y][neighbor.x] = 0;
          frontier.push(neighbor);
        }

        visited.add(`${neighbor.x},${neighbor.y}`);
      } else {
        // Якщо немає невідвіданих сусідів, видалити цю клітину з frontier
        frontier.splice(index, 1);
      }
    }

    // Крок 4: Додати додаткові прохідні клітини для створення більш відкритої карти
    this._addExtraWalkableCells(grid, size, wallProb);

    // Крок 5: Переконатися що всі прохідні клітини з'єднані
    this._ensureConnectivity(grid, size);

    return new Map(grid);
  }

  /**
   * Отримати невідвіданих сусідів (тільки горизонталь та вертикаль)
   */
  static _getUnvisitedNeighbors(x, y, size, visited) {
    const neighbors = [];
    const directions = [
      { dx: 0, dy: -1 }, // Верх
      { dx: 1, dy: 0 },  // Право
      { dx: 0, dy: 1 },  // Низ
      { dx: -1, dy: 0 }  // Ліво
    ];

    for (const { dx, dy } of directions) {
      const nx = x + dx;
      const ny = y + dy;
      const key = `${nx},${ny}`;

      if (nx >= 0 && nx < size && ny >= 0 && ny < size && !visited.has(key)) {
        neighbors.push({ x: nx, y: ny });
      }
    }

    return neighbors;
  }

  /**
   * Додати додаткові прохідні клітини
   */
  static _addExtraWalkableCells(grid, size, wallProb) {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (grid[y][x] === 1 && Math.random() > wallProb * 1.5) {
          // Перевірити чи є поруч прохідні клітини
          const hasWalkableNeighbor = this._hasWalkableNeighbor(grid, x, y, size);
          if (hasWalkableNeighbor) {
            grid[y][x] = 0;
          }
        }
      }
    }
  }

  /**
   * Перевірити чи є прохідні сусіди
   */
  static _hasWalkableNeighbor(grid, x, y, size) {
    const directions = [
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 }
    ];

    for (const { dx, dy } of directions) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < size && ny >= 0 && ny < size && grid[ny][nx] === 0) {
        return true;
      }
    }
    return false;
  }

  /**
   * Забезпечити зв'язність всіх прохідних клітин за допомогою BFS
   */
  static _ensureConnectivity(grid, size) {
    // Знайти першу прохідну клітину
    let startX = -1, startY = -1;
    for (let y = 0; y < size && startX === -1; y++) {
      for (let x = 0; x < size; x++) {
        if (grid[y][x] === 0) {
          startX = x;
          startY = y;
          break;
        }
      }
    }

    if (startX === -1) return; // Немає прохідних клітин

    // BFS для знаходження всіх досяжних клітин
    const visited = new Set();
    const queue = [{ x: startX, y: startY }];
    visited.add(`${startX},${startY}`);

    while (queue.length > 0) {
      const current = queue.shift();

      const directions = [
        { dx: 0, dy: -1 },
        { dx: 1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: 0 }
      ];

      for (const { dx, dy } of directions) {
        const nx = current.x + dx;
        const ny = current.y + dy;
        const key = `${nx},${ny}`;

        if (nx >= 0 && nx < size && ny >= 0 && ny < size &&
            grid[ny][nx] === 0 && !visited.has(key)) {
          visited.add(key);
          queue.push({ x: nx, y: ny });
        }
      }
    }

    // Видалити всі недосяжні прохідні клітини (перетворити на стіни)
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (grid[y][x] === 0 && !visited.has(`${x},${y}`)) {
          grid[y][x] = 1;
        }
      }
    }
  }

  /**
   * Генерувати декілька варіантів карти та вибрати найкращу
   * (з найбільшою кількістю прохідних клітин)
   */
  static generateBest(size = 100, wallProb = 0.3, attempts = 5) {
    let bestMap = null;
    let maxWalkable = 0;

    for (let i = 0; i < attempts; i++) {
      const map = this.generate(size, wallProb);
      const walkable = map.countWalkable();

      if (walkable > maxWalkable) {
        maxWalkable = walkable;
        bestMap = map;
      }
    }

    return bestMap;
  }
}

module.exports = MapGenerator;