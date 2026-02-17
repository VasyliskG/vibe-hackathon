const Location = require('./domain/Location');
const Order = require('./domain/Order');
const { Courier, CourierStatus } = require('./domain/Courier');
const AssignmentService = require('./services/AssignmentService');
const MapGenerator = require('./services/MapGenerator');
const PathFinder = require('./utils/PathFinder');
const fs = require('fs');
const path = require('path');

console.log('=== Stage 1 MVP: Система з алгоритмом Дейкстри ===\n');

// ============================================
// КРОК 1: Генерація або завантаження карти
// ============================================

let cityMap;
const mapFilePath = path.join(__dirname, '../data/city-map.json');

try {
  if (fs.existsSync(mapFilePath)) {
    console.log('📂 Завантаження існуючої карти...');
    const mapData = JSON.parse(fs.readFileSync(mapFilePath, 'utf-8'));
    const Map = require('./domain/Map');
    cityMap = Map.fromJSON(mapData);
    console.log(`✅ Карта завантажена: ${cityMap.countWalkable()} прохідних клітин`);
  } else {
    throw new Error('Map file not found');
  }
} catch (error) {
  console.log('🔨 Генерація нової карти міста...');
  const startTime = Date.now();
  cityMap = MapGenerator.generateBest(100, 0.3, 3);
  const endTime = Date.now();

  console.log(`✅ Карта згенерована за ${endTime - startTime}ms`);
  console.log(`   Прохідних клітин: ${cityMap.countWalkable()}/10000`);

  try {
    const dir = path.dirname(mapFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(mapFilePath, JSON.stringify(cityMap.toJSON(), null, 2));
    console.log(`💾 Карта збережена у: ${mapFilePath}`);
  } catch (saveError) {
    console.warn('⚠️  Не вдалося зберегти карту:', saveError.message);
  }
}

console.log('');

// Вивести частину карти
console.log('🗺️  Лівий верхній кут міста (15x15):');
cityMap.print(0, 0, 15, 15);
console.log('   · - дорога (прохідна)');
console.log('   █ - будівля (непрохідна)');
console.log('');

// ============================================
// КРОК 2: Тест алгоритму Дейкстри
// ============================================

console.log('--- Тест алгоритму Дейкстри ---\n');

const walkableCells = cityMap.getWalkableCells();
const testStart = walkableCells[0];
const testEnd = walkableCells[Math.floor(walkableCells.length / 2)];

console.log(`Шукаємо шлях від (${testStart.x}, ${testStart.y}) до (${testEnd.x}, ${testEnd.y})...`);

const testStartTime = Date.now();
const testPath = PathFinder.findPath(
    cityMap,
    new Location(testStart.x, testStart.y),
    new Location(testEnd.x, testEnd.y)
);
const testEndTime = Date.now();

if (testPath) {
  console.log(`✅ Шлях знайдено за ${testEndTime - testStartTime}ms`);
  console.log(`   Довжина шляху: ${testPath.distance} кроків`);
  console.log(`   Перші 5 точок шляху:`, testPath.path.slice(0, 5));
} else {
  console.log(`❌ Шлях не знайдено`);
}

console.log('');

// ============================================
// КРОК 3: Допоміжні функції
// ============================================

function getRandomWalkableLocation(map) {
  const walkableCells = map.getWalkableCells();
  if (walkableCells.length === 0) {
    throw new Error('No walkable cells available on the map');
  }
  const randomCell = walkableCells[Math.floor(Math.random() * walkableCells.length)];
  return new Location(randomCell.x, randomCell.y);
}

// ============================================
// КРОК 4: Створення кур'єрів
// ============================================

console.log('👥 Створення кур\'єрів на карті...');

const couriers = [];
const courierCount = 5;

for (let i = 1; i <= courierCount; i++) {
  const location = getRandomWalkableLocation(cityMap);
  const status = Math.random() > 0.7 ? CourierStatus.BUSY : CourierStatus.FREE;
  const courier = new Courier(`courier-${i}`, location, status);
  couriers.push(courier);

  console.log(`  ${courier.toString()}`);
}

console.log('');

// ============================================
// КРОК 5: Ініціалізація сервісу з картою
// ============================================

const assignmentService = new AssignmentService(couriers, cityMap);

console.log('📊 Початкова статистика:', assignmentService.getStats());
console.log('');

// ============================================
// КРОК 6: Створення замовлень
// ============================================

console.log('🍕 Створення замовлень від ресторанів...');

const orders = [];
const orderCount = 6;

for (let i = 1; i <= orderCount; i++) {
  const restaurantLocation = getRandomWalkableLocation(cityMap);
  const order = new Order(`order-${i}`, restaurantLocation);
  orders.push(order);

  console.log(`  ${order.toString()}`);
}

console.log('');

// ============================================
// КРОК 7: Призначення з алгоритмом Дейкстри
// ============================================

console.log('--- Призначення замовлень (алгоритм Дейкстри) ---\n');

const results = [];

orders.forEach(order => {
  try {
    console.log(`🔍 Обробка ${order.id}...`);
    const startTime = Date.now();
    const result = assignmentService.assign(order);
    const endTime = Date.now();

    results.push(result);

    if (result.message) {
      console.log(`❌ ${order.id}: ${result.message}`);
    } else {
      console.log(`✅ ${order.id} → ${result.assignedCourierId}`);
      console.log(`   Реальна відстань по дорогах: ${result.distance} кроків`);
      console.log(`   Час обчислення: ${endTime - startTime}ms`);

      // Показати позиції
      const courier = couriers.find(c => c.id === result.assignedCourierId);
      console.log(`   Ресторан: (${order.restaurantLocation.x}, ${order.restaurantLocation.y}) → Кур'єр: (${courier.location.x}, ${courier.location.y})`);

      // Показати частину шляху
      if (result.path && result.path.length > 0) {
        console.log(`   Перші 5 точок шляху:`, result.path.slice(0, 5).map(p => `(${p.x},${p.y})`).join(' → '));
      }
    }

    console.log('');
  } catch (error) {
    console.error(`❌ Помилка при обробці ${order.id}:`, error.message);
    console.log('');
  }
});

// ============================================
// КРОК 8: Підсумкова статистика
// ============================================

console.log('--- Підсумки ---\n');

console.log('📊 Статистика кур\'єрів:', assignmentService.getStats());

const successfulAssignments = results.filter(r => !r.message).length;
const failedAssignments = results.filter(r => r.message).length;

console.log('📈 Статистика замовлень:');
console.log(`   Успішно призначено: ${successfulAssignments}/${orderCount}`);
console.log(`   Не вдалося призначити: ${failedAssignments}/${orderCount}`);

if (successfulAssignments > 0) {
  const distances = results
  .filter(r => !r.message)
  .map(r => r.distance);

  const avgDistance = (distances.reduce((a, b) => a + b, 0) / distances.length).toFixed(2);
  const minDistance = Math.min(...distances);
  const maxDistance = Math.max(...distances);

  console.log(`   Середня відстань: ${avgDistance} кроків`);
  console.log(`   Мін/Макс відстань: ${minDistance} / ${maxDistance} кроків`);
}

console.log('');

// ============================================
// КРОК 9: Візуалізація одного шляху
// ============================================

const successfulResult = results.find(r => r.path);

if (successfulResult) {
  console.log('🗺️  Візуалізація шляху для ' + successfulResult.orderId + ':\n');

  // Знайти межі для візуалізації
  const path = successfulResult.path;
  const minX = Math.max(0, Math.min(...path.map(p => p.x)) - 2);
  const maxX = Math.min(99, Math.max(...path.map(p => p.x)) + 2);
  const minY = Math.max(0, Math.min(...path.map(p => p.y)) - 2);
  const maxY = Math.min(99, Math.max(...path.map(p => p.y)) + 2);

  const width = maxX - minX + 1;
  const height = maxY - minY + 1;

  // Створити візуалізацію
  const visual = [];
  for (let y = 0; y < height; y++) {
    visual[y] = [];
    for (let x = 0; x < width; x++) {
      const mapX = minX + x;
      const mapY = minY + y;

      if (cityMap.isWalkable(mapX, mapY)) {
        visual[y][x] = '·';
      } else {
        visual[y][x] = '█';
      }
    }
  }

  // Позначити шлях
  path.forEach((point, index) => {
    const x = point.x - minX;
    const y = point.y - minY;

    if (index === 0) {
      visual[y][x] = 'R'; // Ресторан (старт)
    } else if (index === path.length - 1) {
      visual[y][x] = 'C'; // Кур'єр (кінець)
    } else {
      visual[y][x] = '*'; // Шлях
    }
  });

  // Вивести
  for (let y = 0; y < height; y++) {
    console.log(visual[y].join(''));
  }

  console.log('');
  console.log('Легенда:');
  console.log('  R - ресторан (початок шляху)');
  console.log('  C - кур\'єр (кінець шляху)');
  console.log('  * - шлях');
  console.log('  · - дорога');
  console.log('  █ - будівля');
  console.log('');
}

// ============================================
// КРОК 10: Збереження результатів
// ============================================

const outputData = {
  timestamp: new Date().toISOString(),
  algorithm: 'Dijkstra',
  map: {
    size: cityMap.size,
    walkableCells: cityMap.countWalkable()
  },
  couriers: couriers.map(c => ({
    id: c.id,
    status: c.status,
    location: { x: c.location.x, y: c.location.y }
  })),
  orders: orders.map(o => ({
    id: o.id,
    restaurantLocation: { x: o.restaurantLocation.x, y: o.restaurantLocation.y },
    assignedCourierId: o.assignedCourierId
  })),
  assignments: results,
  stats: {
    totalCouriers: couriers.length,
    totalOrders: orders.length,
    successfulAssignments,
    failedAssignments
  }
};

const resultsPath = path.join(__dirname, '../data/stage1-dijkstra-results.json');

try {
  const dir = path.dirname(resultsPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(resultsPath, JSON.stringify(outputData, null, 2));
  console.log(`💾 Результати збережено у: ${resultsPath}`);
} catch (error) {
  console.error('❌ Помилка збереження результатів:', error.message);
}

console.log('');
console.log('✨ Stage 1 MVP з алгоритмом Дейкстри завершено!');