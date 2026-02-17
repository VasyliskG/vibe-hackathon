/**
 * Map — клас для роботи з картою міста 100x100
 * 0 — прохідна клітина (дорога)
 * 1 — непрохідна клітина (будівля, стіна)
 */
class Map {
  constructor(grid) {
    if (!Array.isArray(grid) || grid.length !== 100 || grid[0].length !== 100) {
      throw new Error('Map must be a 100x100 2D array');
    }

    this._grid = grid;
    this._size = 100;
  }

  /**
   * Отримати розмір карти
   */
  get size() {
    return this._size;
  }

  /**
   * Перевірити чи клітина прохідна
   */
  isWalkable(x, y) {
    if (!this.isInBounds(x, y)) {
      return false;
    }
    return this._grid[y][x] === 0;
  }

  /**
   * Перевірити чи координати в межах карти
   */
  isInBounds(x, y) {
    return x >= 0 && x < this._size && y >= 0 && y < this._size;
  }

  /**
   * Отримати значення клітини
   */
  getCell(x, y) {
    if (!this.isInBounds(x, y)) {
      throw new Error(`Coordinates (${x}, ${y}) are out of bounds`);
    }
    return this._grid[y][x];
  }

  /**
   * Отримати сусідів клітини (тільки вертикальні та горизонтальні)
   */
  getNeighbors(x, y) {
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

      if (this.isWalkable(nx, ny)) {
        neighbors.push({ x: nx, y: ny });
      }
    }

    return neighbors;
  }

  /**
   * Отримати всі прохідні клітини
   */
  getWalkableCells() {
    const cells = [];
    for (let y = 0; y < this._size; y++) {
      for (let x = 0; x < this._size; x++) {
        if (this._grid[y][x] === 0) {
          cells.push({ x, y });
        }
      }
    }
    return cells;
  }

  /**
   * Підрахунок прохідних клітин
   */
  countWalkable() {
    let count = 0;
    for (let y = 0; y < this._size; y++) {
      for (let x = 0; x < this._size; x++) {
        if (this._grid[y][x] === 0) {
          count++;
        }
      }
    }
    return count;
  }

  /**
   * Експорт в JSON
   */
  toJSON() {
    return {
      size: this._size,
      walkableCells: this.countWalkable(),
      grid: this._grid
    };
  }

  /**
   * Створити Map з JSON
   */
  static fromJSON(json) {
    if (!json.grid) {
      throw new Error('Invalid JSON: missing grid property');
    }
    return new Map(json.grid);
  }

  /**
   * Вивести частину карти в консоль
   */
  print(startX = 0, startY = 0, width = 10, height = 10) {
    console.log(`Map section (${startX},${startY}) to (${startX + width - 1},${startY + height - 1}):`);

    for (let y = startY; y < startY + height && y < this._size; y++) {
      let row = '';
      for (let x = startX; x < startX + width && x < this._size; x++) {
        row += this._grid[y][x] === 0 ? '·' : '█';
      }
      console.log(row);
    }
  }

  /**
   * Клонувати карту
   */
  clone() {
    const newGrid = this._grid.map(row => [...row]);
    return new Map(newGrid);
  }
}

module.exports = Map;