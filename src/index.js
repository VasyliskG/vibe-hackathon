const Location = require('./domain/Location');
const Order = require('./domain/Order');
const { Courier, CourierStatus } = require('./domain/Courier');
const { TransportType, getSuitableTransportTypes } = require('./domain/TransportType');
const AssignmentService = require('./services/AssignmentService');
const MapGenerator = require('./services/MapGenerator');
const DistanceCalculator = require('./utils/DistanceCalculator');
const PathFinder = require('./utils/PathFinder');
const fs = require('fs');
const path = require('path');

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  🚀 Stage 2 MVP: Система з вагою та типами транспорту    ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('');

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
  console.log('🔨 Генерація нової карти міста 100×100...');
  const startTime = Date.now();
  cityMap = MapGenerator.generateBest(100, 0.3, 3);
  const endTime = Date.now();

  console.log(`✅ Карта згенерована за ${endTime - startTime}ms`);
  console.log(`   Прохідних клітин: ${cityMap.countWalkable()}/10000 (${(cityMap.countWalkable() / 100).toFixed(1)}%)`);

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
console.log('🗺️  Лівий верхній кут міста (20×15):');
cityMap.print(0, 0, 20, 15);
console.log('   · = дорога (прохідна клітина)');
console.log('   █ = будівля (непрохідна клітина)');
console.log('');

// ============================================
// КРОК 2: Тест алго��итму Дейкстри
// ============================================

console.log('--- 🧪 Тест алгоритму Дейкстри vs Відстані ---\n');

const walkableCells = cityMap.getWalkableCells();
const testStart = new Location(walkableCells[0].x, walkableCells[0].y);
const testEnd = new Location(
    walkableCells[Math.floor(walkableCells.length / 3)].x,
    walkableCells[Math.floor(walkableCells.length / 3)].y
);

console.log(`Тестова точка A: (${testStart.x}, ${testStart.y})`);
console.log(`Тестова точка B: (${testEnd.x}, ${testEnd.y})`);
console.log('');

// Евклідова відстань
const euclidean = DistanceCalculator.euclidean(testStart, testEnd);
console.log(`📏 Euclidean (пряма лінія): ${euclidean.toFixed(2)} одиниць`);

// Manhattan відстань
const manhattan = DistanceCalculator.manhattan(testStart, testEnd);
console.log(`📐 Manhattan (сітка без перешкод): ${manhattan.toFixed(2)} кроків`);

// Алгоритм Дейкстри (реальний шлях)
const dijkstraStart = Date.now();
const pathResult = PathFinder.findPath(cityMap, testStart, testEnd);
const dijkstraEnd = Date.now();

if (pathResult) {
  console.log(`🛣️  Dijkstra (реальний шлях по дорогах): ${pathResult.distance} кроків`);
  console.log(`   Час обчислення: ${dijkstraEnd - dijkstraStart}ms`);
  console.log(`   Співвідношення реального шляху до прямої: ${(pathResult.distance / euclidean).toFixed(2)}x`);
} else {
  console.log(`❌ Dijkstra: шлях не знайдено`);
}

console.log('');

// ============================================
// КРОК 3: Допоміжні функції
// ============================================

/**
 * Отримати випадкову прохідну локацію на карті
 */
function getRandomWalkableLocation(map) {
  const walkableCells = map.getWalkableCells();
  if (walkableCells.length === 0) {
    throw new Error('No walkable cells available on the map');
  }
  const randomCell = walkableCells[Math.floor(Math.random() * walkableCells.length)];
  return new Location(randomCell.x, randomCell.y);
}

// ============================================
// КРОК 4: Створення кур'єрів з різними типами транспорту
// ============================================

console.log('👥 Створення кур\'єрів з різними типами транспор��у:\n');

const couriers = [
  new Courier('courier-1', getRandomWalkableLocation(cityMap), 'walker', CourierStatus.FREE),
  new Courier('courier-2', getRandomWalkableLocation(cityMap), 'walker', CourierStatus.FREE),
  new Courier('courier-3', getRandomWalkableLocation(cityMap), 'bicycle', CourierStatus.FREE),
  new Courier('courier-4', getRandomWalkableLocation(cityMap), 'bicycle', CourierStatus.FREE),
  new Courier('courier-5', getRandomWalkableLocation(cityMap), 'scooter', CourierStatus.FREE),
  new Courier('courier-6', getRandomWalkableLocation(cityMap), 'car', CourierStatus.FREE),
  new Courier('courier-7', getRandomWalkableLocation(cityMap), 'car', CourierStatus.BUSY), // Зайнятий
];

couriers.forEach(c => {
  console.log(`  ${c.toString()}`);
});

console.log('');

// ============================================
// КРОК 5: Ініціалізація сервісу призначення
// ============================================

const assignmentService = new AssignmentService(couriers, cityMap, true);

const stats = assignmentService.getStats();
console.log('📊 Початкова статистика кур\'єрів:');
console.log(`   Всього: ${stats.total} | Вільних: ${stats.free} | Зайнятих: ${stats.busy}`);
console.log('   Розподіл по типах транспорту:');
Object.entries(stats.byTransport).forEach(([type, data]) => {
  const emoji = Object.values(TransportType).find(t => t.name === type)?.displayName || type;
  const percentage = ((data.free / data.total) * 100).toFixed(0);
  console.log(`     ${emoji}: ${data.total} шт. (вільних: ${data.free}, зайнятих: ${data.busy}) [${percentage}% доступні]`);
});

console.log('');

// ============================================
// КРОК 6: Створення замовлень з різною вагою
// ============================================

console.log('🍕 Створення замовлень з різною вагою:\n');

const orders = [
  new Order('order-1', getRandomWalkableLocation(cityMap), 2),   // Дуже легке
  new Order('order-2', getRandomWalkableLocation(cityMap), 4),   // Легке (walker OK)
  new Order('order-3', getRandomWalkableLocation(cityMap), 8),   // Середнє (bicycle+)
  new Order('order-4', getRandomWalkableLocation(cityMap), 12),  // Важке (bicycle+)
  new Order('order-5', getRandomWalkableLocation(cityMap), 20),  // Дуже важке (scooter/car)
  new Order('order-6', getRandomWalkableLocation(cityMap), 35),  // Екстра важке (scooter/car)
  new Order('order-7', getRandomWalkableLocation(cityMap), 48),  // Майже максимум
  new Order('order-8', getRandomWalkableLocation(cityMap), 60),  // НАДТО ВАЖКЕ (ніхто не може)
];

orders.forEach(o => {
  const suitable = getSuitableTransportTypes(o.weight);
  const suitableNames = suitable.map(t => t.displayName).join(', ');
  console.log(`  ${o.toString()}`);
  console.log(`    ✓ Підходить: ${suitableNames || '❌ НІХТО НЕ МОЖЕ ПЕРЕВЕЗТИ'}`);
});

console.log('');

// ============================================
// КРОК 7: Призначення замовлень з ��етальним логом
// ============================================

console.log('═══════════════════════════════════════════════════════════');
console.log('  🎯 ПРИЗНАЧЕННЯ ЗАМОВЛЕНЬ (з алгоритмом Дейкстри)');
console.log('═══════════════════════════════════════════════════════════');
console.log('');

const results = [];

orders.forEach((order, index) => {
  console.log(`[${index + 1}/${orders.length}] 🔍 Обробка ${order.id} (вага: ${order.weight}kg)...`);

  try {
    const startTime = Date.now();
    const result = assignmentService.assign(order);
    const endTime = Date.now();

    results.push(result);

    if (result.message) {
      // Замовлення не призначено
      console.log(`      ❌ Не вдалося призначити: ${result.message}`);

      if (result.reason === 'weight_too_heavy') {
        console.log(`      💡 Причина: замовлення ${result.orderWeight}kg надто важке`);
        console.log(`      📋 Доступні кур'єри та їх обмеження:`);
        result.availableCouriers?.forEach(c => {
          const type = Object.values(TransportType).find(t => t.name === c.transportType);
          console.log(`         • ${c.id}: ${type?.displayName} (макс ${c.maxWeight}kg)`);
        });
      } else if (result.reason === 'all_busy') {
        console.log(`      💡 Причина: всі кур'єри зайняті`);
      } else if (result.reason === 'no_path_found') {
        console.log(`      💡 Причина: шлях на карті не знайдено`);
      }
    } else {
      // Замовлення успішно призначено
      const courier = couriers.find(c => c.id === result.assignedCourierId);
      console.log(`      ✅ Призначено → ${result.assignedCourierId}`);
      console.log(`      🚗 Транспорт: ${courier.transportType.displayName} (вантажопідйомність: ${result.courierMaxWeight}kg)`);
      console.log(`      📦 Вага замовлення: ${result.orderWeight}kg (${((result.orderWeight / result.courierMaxWeight) * 100).toFixed(0)}% від максимуму)`);
      console.log(`      📏 Відстань: ${result.distance} кроків (метод: ${result.distanceType})`);
      console.log(`      ⏱️  Час обчислення: ${endTime - startTime}ms`);
      console.log(`      📍 Маршрут: (${order.restaurantLocation.x}, ${order.restaurantLocation.y}) → (${courier.location.x}, ${courier.location.y})`);

      if (result.path && result.path.length > 0) {
        const pathPreview = result.path.slice(0, 3).map(p => `(${p.x},${p.y})`).join(' → ');
        console.log(`      🛣️  Перші кроки: ${pathPreview}...`);
      }
    }

    console.log('');
  } catch (error) {
    console.error(`      ❌ ПОМИЛКА: ${error.message}`);
    console.log('');
  }
});

// ============================================
// КРОК 8: Підсумкова статистика
// ============================================

console.log('═══════════════════════════════════════════════════════════');
console.log('  📊 ПІДСУМКОВА СТАТИСТИКА');
console.log('═══════════════════════════════════════════════════════════');
console.log('');

const finalStats = assignmentService.getStats();
console.log('🚚 Статистика кур\'єрів після призначень:');
console.log(`   Всього: ${finalStats.total} | Вільних: ${finalStats.free} | Зайнятих: ${finalStats.busy}`);
console.log('   Розподіл по типах транспорту:');
Object.entries(finalStats.byTransport).forEach(([type, data]) => {
  const emoji = Object.values(TransportType).find(t => t.name === type)?.displayName || type;
  const workload = data.total > 0 ? ((data.busy / data.total) * 100).toFixed(0) : 0;
  console.log(`     ${emoji}: вільн��х ${data.free}/${data.total} (завантаження: ${workload}%)`);
});

console.log('');

const successfulAssignments = results.filter(r => !r.message).length;
const failedAssignments = results.filter(r => r.message).length;

console.log('📦 Статистика замовлень:');
console.log(`   Всього замовлень: ${orders.length}`);
console.log(`   ✅ Успішно призначено: ${successfulAssignments} (${((successfulAssignments / orders.length) * 100).toFixed(0)}%)`);
console.log(`   ❌ Не вдалося призначити: ${failedAssignments} (${((failedAssignments / orders.length) * 100).toFixed(0)}%)`);

if (successfulAssignments > 0) {
  const distances = results.filter(r => !r.message).map(r => r.distance);
  const avgDistance = (distances.reduce((a, b) => a + b, 0) / distances.length).toFixed(2);
  const minDistance = Math.min(...distances);
  const maxDistance = Math.max(...distances);

  console.log('');
  console.log('📏 Статистика відстаней:');
  console.log(`   Середня відстань: ${avgDistance} кроків`);
  console.log(`   Мінімальна відстань: ${minDistance} кроків`);
  console.log(`   Максимальна відстань: ${maxDistance} кроків`);
  console.log(`   Діапазон: ${(maxDistance - minDistance)} кроків`);

  // Статистика по вазі
  const weights = results.filter(r => !r.message).map(r => r.orderWeight);
  const avgWeight = (weights.reduce((a, b) => a + b, 0) / weights.length).toFixed(2);

  console.log('');
  console.log('⚖️  Статистика ваги:');
  console.log(`   Середня вага: ${avgWeight}kg`);
  console.log(`   Мінімальна вага: ${Math.min(...weights)}kg`);
  console.log(`   Максимальна вага: ${Math.max(...weights)}kg`);
}

// Статистика причин відмов
const failureReasons = results
.filter(r => r.message)
.reduce((acc, r) => {
  acc[r.reason] = (acc[r.reason] || 0) + 1;
  return acc;
}, {});

if (Object.keys(failureReasons).length > 0) {
  console.log('');
  console.log('🔍 Причини відмов:');
  Object.entries(failureReasons).forEach(([reason, count]) => {
    const reasonText = {
      'all_busy': 'всі кур\'єри зайняті',
      'weight_too_heavy': 'вага замовлення надто велика',
      'no_path_found': 'шлях на карті не знайдено'
    }[reason] || reason;
    const percentage = ((count / failedAssignments) * 100).toFixed(0);
    console.log(`   • ${reasonText}: ${count} (${percentage}%)`);
  });
}

console.log('');

// ============================================
// КРОК 9: Порівняння методів обчислення відстані
// ============================================

if (successfulAssignments > 0) {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  🔬 ПОРІВНЯННЯ МЕТОДІВ ОБЧИСЛЕННЯ ВІДСТАНІ');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  // Взяти перше успішне замовлення
  const successResult = results.find(r => !r.message);
  const successOrder = orders.find(o => o.id === successResult.orderId);
  const successCourier = couriers.find(c => c.id === successResult.assignedCourierId);

  console.log(`Приклад: ${successResult.orderId} → ${successResult.assignedCourierId}`);
  console.log(`Від: (${successOrder.restaurantLocation.x}, ${successOrder.restaurantLocation.y})`);
  console.log(`До: (${successCourier.location.x}, ${successCourier.location.y})`);
  console.log('');

  const compEuclidean = DistanceCalculator.euclidean(successOrder.restaurantLocation, successCourier.location);
  const compManhattan = DistanceCalculator.manhattan(successOrder.restaurantLocation, successCourier.location);
  const compDijkstra = successResult.distance;

  console.log(`📏 Euclidean (пряма лінія): ${compEuclidean.toFixed(2)} одиниць`);
  console.log(`📐 Manhattan (без перешкод): ${compManhattan.toFixed(2)} кроків`);
  console.log(`🛣️  Dijkstra (реальний шлях): ${compDijkstra} кроків`);
  console.log('');
  console.log(`📊 Висновок:`);
  console.log(`   Реальний шлях у ${(compDijkstra / compEuclidean).toFixed(2)}x довший за пряму лінію`);
  console.log(`   Реальний шлях у ${(compDijkstra / compManhattan).toFixed(2)}x довший за Manhattan`);
  console.log('');
}

// ============================================
// КРОК 10: Візуалізація на карті
// ============================================

if (successfulAssignments > 0) {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  🗺️  ВІЗУАЛІЗАЦІЯ ШЛЯХУ НА КАРТІ');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  const visualResult = results.find(r => r.path && r.path.length > 0);

  if (visualResult) {
    const visualOrder = orders.find(o => o.id === visualResult.orderId);
    const visualCourier = couriers.find(c => c.id === visualResult.assignedCourierId);

    console.log(`Замовлення: ${visualResult.orderId} (${visualResult.orderWeight}kg)`);
    console.log(`Кур'єр: ${visualResult.assignedCourierId} (${visualCourier.transportType.displayName})`);
    console.log(`Довжина шляху: ${visualResult.distance} кроків`);
    console.log('');

    // Знайти межі для візуалізації
    const path = visualResult.path;
    const allX = path.map(p => p.x);
    const allY = path.map(p => p.y);
    const minX = Math.max(0, Math.min(...allX) - 2);
    const maxX = Math.min(99, Math.max(...allX) + 2);
    const minY = Math.max(0, Math.min(...allY) - 2);
    const maxY = Math.min(99, Math.max(...allY) + 2);

    const width = maxX - minX + 1;
    const height = maxY - minY + 1;

    // Обмежи��и розмір візуалізації
    if (width <= 40 && height <= 20) {
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
      console.log('  R = ресторан (початок маршруту)');
      console.log('  C = кур\'єр (кінець маршруту)');
      console.log('  * = шлях кур\'єра');
      console.log('  · = дорога');
      console.log('  █ = будівля');
    } else {
      console.log('⚠️  Шлях надто довгий для візуалізації');
    }

    console.log('');
  }
}

// ============================================
// КРОК 11: Збереження результатів у JSON
// ============================================

const outputData = {
  timestamp: new Date().toISOString(),
  version: 'Stage 1 MVP',
  algorithm: 'Dijkstra with weight constraints',
  map: {
    size: cityMap.size,
    walkableCells: cityMap.countWalkable(),
    density: ((cityMap.countWalkable() / 10000) * 100).toFixed(2) + '%'
  },
  couriers: couriers.map(c => c.toJSON()),
  orders: orders.map(o => o.toJSON()),
  assignments: results,
  summary: {
    totalCouriers: couriers.length,
    totalOrders: orders.length,
    successfulAssignments,
    failedAssignments,
    successRate: ((successfulAssignments / orders.length) * 100).toFixed(2) + '%',
    byTransport: finalStats.byTransport,
    failureReasons: failureReasons
  }
};

const resultsPath = path.join(__dirname, '../data/stage1-results.json');

try {
  const dir = path.dirname(resultsPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(resultsPath, JSON.stringify(outputData, null, 2));
  console.log('💾 Результати збережено у JSON:');
  console.log(`   Файл: ${resultsPath}`);
  console.log(`   Розмір: ${(fs.statSync(resultsPath).size / 1024).toFixed(2)} KB`);
} catch (error) {
  console.error('❌ Помилка збереження результатів:', error.message);
}

console.log('');
console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  ✨ Stage 2 MVP завершено!                                ║');
console.log('╚══════════════════���═════════════════════════════════════════╝');