const MapGenerator = require('../src/services/MapGenerator');
const fs = require('fs');
const path = require('path');

console.log('=== Генератор карти міста 100x100 ===\n');

// Параметри генерації
const SIZE = 100;
const WALL_PROB = 0.3; // 30% ймовірність стіни

console.log(`📊 Параметри:`);
console.log(`  Розмір: ${SIZE}x${SIZE}`);
console.log(`  Ймовірність стіни: ${WALL_PROB * 100}%`);
console.log('');

// Генерація карти
console.log('🔨 Генерація карти...');
const startTime = Date.now();
const map = MapGenerator.generateBest(SIZE, WALL_PROB, 3);
const endTime = Date.now();

console.log(`✅ Карта згенерована за ${endTime - startTime}ms`);
console.log('');

// Статистика
const walkable = map.countWalkable();
const total = SIZE * SIZE;
const percentage = ((walkable / total) * 100).toFixed(2);

console.log('📈 Статистика:');
console.log(`  Прохідних клітин: ${walkable}/${total} (${percentage}%)`);
console.log(`  Непрохідних клітин: ${total - walkable}`);
console.log('');

// Вивести лівий верхній кут 15x15
console.log('🗺️  Лівий верхній кут (15x15):');
map.print(0, 0, 15, 15);
console.log('  · - прохідна клітина (0)');
console.log('  █ - стіна/будівля (1)');
console.log('');

// Перевірка зв'язності (тест сусідів)
console.log('🔗 Перевірка звязності:');
const testCell = { x: 10, y: 10 };
if (map.isWalkable(testCell.x, testCell.y)) {
  const neighbors = map.getNeighbors(testCell.x, testCell.y);
  console.log(`  Клітина (${testCell.x}, ${testCell.y}) має ${neighbors.length} сусідів`);
  neighbors.forEach(n => console.log(`    → (${n.x}, ${n.y})`));
} else {
  console.log(`  Клітина (${testCell.x}, ${testCell.y}) непрохідна`);
}
console.log('');

// Збереження у JSON
const outputDir = path.join(__dirname, '../data');
const outputFile = path.join(outputDir, 'city-map.json');

try {
  // Створити директорію якщо не існує
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Зберегти карту
  const mapData = map.toJSON();
  fs.writeFileSync(outputFile, JSON.stringify(mapData, null, 2));
  console.log(`💾 Карта збережена у: ${outputFile}`);
  console.log(`   Розмір файлу: ${(fs.statSync(outputFile).size / 1024).toFixed(2)} KB`);
} catch (error) {
  console.error('❌ Помилка збереження:', error.message);
}
console.log('');

// Приклад доступу до клітин
console.log('📍 Приклад доступу до клітин:');
const examples = [
  { x: 0, y: 0 },
  { x: 50, y: 50 },
  { x: 99, y: 99 }
];

examples.forEach(({ x, y }) => {
  const value = map.getCell(x, y);
  const walkable = value === 0;
  console.log(`  (${x}, ${y}): ${value} ${walkable ? '✅ прохідна' : '❌ стіна'}`);
});
console.log('');

// Отримати випадкову прохідну клітину
console.log('🎲 Випадкові прохідні клітини:');
const walkableCells = map.getWalkableCells();
for (let i = 0; i < 5; i++) {
  const randomCell = walkableCells[Math.floor(Math.random() * walkableCells.length)];
  console.log(`  → (${randomCell.x}, ${randomCell.y})`);
}
console.log('');

console.log('✨ Готово! Карта готова для використання з алгоритмами пошуку шляху.');