const MapGenerator = require('../src/services/MapGenerator');
const PathFinder = require('../src/utils/PathFinder');
const DistanceCalculator = require('../src/utils/DistanceCalculator');
const Location = require('../src/domain/Location');

console.log('=== Порівняння Евклідової відстані та алгоритму Дейкстри ===\n');

// Генерувати невелику карту для демонстрації
const map = MapGenerator.generate(50, 0.3);

console.log(`Карта: 50x50, ${map.countWalkable()} прохідних клітин\n`);

// Тестові точки
const walkableCells = map.getWalkableCells();
const start = new Location(walkableCells[0].x, walkableCells[0].y);
const end = new Location(
    walkableCells[Math.floor(walkableCells.length / 2)].x,
    walkableCells[Math.floor(walkableCells.length / 2)].y
);

console.log(`Початок: (${start.x}, ${start.y})`);
console.log(`Кінець: (${end.x}, ${end.y})`);
console.log('');

// Евклідова відстань
const euclidean = DistanceCalculator.calculate(start, end);
console.log(`📏 Евклідова відстань (пряма лінія): ${euclidean.toFixed(2)}`);

// Алгоритм Дейкстри
console.log('🔍 Пошук шляху за алгоритмом Дейкстри...');
const startTime = Date.now();
const pathResult = PathFinder.findPath(map, start, end);
const endTime = Date.now();

if (pathResult) {
  console.log(`✅ Шлях знайдено за ${endTime - startTime}ms`);
  console.log(`🛣️  Реальна відстань по дорогах: ${pathResult.distance} кроків`);
  console.log(`📊 Співвідношення: реальна / пряма = ${(pathResult.distance / euclidean).toFixed(2)}x`);
  console.log('');
  console.log(`Перші 10 точок шляху:`);
  pathResult.path.slice(0, 10).forEach((p, i) => {
    console.log(`  ${i + 1}. (${p.x}, ${p.y})`);
  });
} else {
  console.log('❌ Шлях не знайдено');
}