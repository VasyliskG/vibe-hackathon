const Location = require('./domain/Location');
const Order = require('./domain/Order');
const { Courier, CourierStatus } = require('./domain/Courier');
const { TransportType, getSuitableTransportTypes } = require('./domain/TransportType');
const AssignmentService = require('./services/AssignmentService');
const MapGenerator = require('./services/MapGenerator');
const fs = require('fs');
const path = require('path');

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║  🚀 Stage 3: Система з пріоритетами та чергою замовлень    ║');
console.log('╚══════════════════════════════════════════════════════════════╝');
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

// ============================================
// КРОК 2: Допоміжні функції
// ============================================

function getRandomWalkableLocation(map) {
  const walkableCells = map.getWalkableCells();
  const randomCell = walkableCells[Math.floor(Math.random() * walkableCells.length)];
  return new Location(randomCell.x, randomCell.y);
}

function printSeparator(title) {
  console.log('═══════════════════════════════════════════════════════════════');
  if (title) {
    console.log(`  ${title}`);
    console.log('═══════════════════════════════════════════════════════════════');
  }
  console.log('');
}

// ============================================
// КРОК 3: Створення кур'єрів
// ============================================

console.log('👥 Створення кур\'єрів з різними типами транспорту:\n');

const couriers = [
  new Courier('courier-1', getRandomWalkableLocation(cityMap), 'walker', CourierStatus.FREE),
  new Courier('courier-2', getRandomWalkableLocation(cityMap), 'bicycle', CourierStatus.FREE),
  new Courier('courier-3', getRandomWalkableLocation(cityMap), 'bicycle', CourierStatus.FREE),
  new Courier('courier-4', getRandomWalkableLocation(cityMap), 'scooter', CourierStatus.FREE),
  new Courier('courier-5', getRandomWalkableLocation(cityMap), 'car', CourierStatus.FREE),
];

// Симулювати різну кількість виконаних замовлень (для тесту пріоритетів)
couriers[0]._completedOrdersToday = 5;  // Walker вже виконав 5
couriers[1]._completedOrdersToday = 2;  // Bicycle виконав 2
couriers[2]._completedOrdersToday = 8;  // Bicycle виконав 8
couriers[3]._completedOrdersToday = 3;  // Scooter виконав 3
couriers[4]._completedOrdersToday = 1;  // Car виконав 1

couriers.forEach(c => {
  console.log(`  ${c.toString()}`);
});

console.log('');

// ============================================
// КРОК 4: Ініціалізація сервісу
// ============================================

const assignmentService = new AssignmentService(couriers, cityMap, true);
assignmentService.setDistanceThreshold(1.0); // Поріг для пріоритету

const stats = assignmentService.getStats();
console.log('📊 Початкова статистика:');
console.log(`   Всього кур'єрів: ${stats.total} | Вільних: ${stats.free} | Зайнятих: ${stats.busy}`);
console.log(`   Розподіл по транспорту:`);
Object.entries(stats.byTransport).forEach(([type, data]) => {
  const emoji = Object.values(TransportType).find(t => t.name === type)?.displayName || type;
  console.log(`     ${emoji}: ${data.total} (вільних: ${data.free})`);
});
console.log(`   Виконано замовлень сьогодні:`);
console.log(`     Всього: ${stats.completedOrdersToday.total}`);
console.log(`     Середнє на кур'єра: ${stats.completedOrdersToday.average}`);
console.log(`     Мін/Макс: ${stats.completedOrdersToday.min} / ${stats.completedOrdersToday.max}`);
console.log(`   Черга замовлень: ${stats.queueSize}`);

console.log('');

// ============================================
// КРОК 5: Створення замовлень
// ============================================

printSeparator('🍕 СТВОРЕННЯ ЗАМОВЛЕНЬ');

const orders = [
  new Order('order-1', getRandomWalkableLocation(cityMap), 3),   // Легке
  new Order('order-2', getRandomWalkableLocation(cityMap), 4),   // Легке
  new Order('order-3', getRandomWalkableLocation(cityMap), 10),  // Середнє
  new Order('order-4', getRandomWalkableLocation(cityMap), 12),  // Середнє
  new Order('order-5', getRandomWalkableLocation(cityMap), 25),  // Важке
  new Order('order-6', getRandomWalkableLocation(cityMap), 8),   // Середнє
  new Order('order-7', getRandomWalkableLocation(cityMap), 5),   // Легке
  new Order('order-8', getRandomWalkableLocation(cityMap), 35),  // Дуже важке
];

orders.forEach(o => {
  const suitable = getSuitableTransportTypes(o.weight);
  console.log(`  ${o.toString()}`);
  console.log(`    Підходить: ${suitable.map(t => t.displayName).join(', ')}`);
});

console.log('');

// ============================================
// КРОК 6: СЦЕНАРІЙ 1 - Призначення з пріоритетами
// ============================================

printSeparator('🎯 СЦЕНАРІЙ 1: Призначення перших 3 замовлень (тест пріоритетів)');

const results = [];

for (let i = 0; i < 3; i++) {
  const order = orders[i];
  console.log(`[${i + 1}] 🔍 Призначення ${order.id} (вага: ${order.weight}kg)...`);

  const startTime = Date.now();
  const result = assignmentService.assign(order);
  const endTime = Date.now();

  results.push(result);

  if (result.queued) {
    console.log(`    ⏳ Додано в чергу: ${result.message}`);
    console.log(`    📊 Розмір черги: ${result.queueSize}`);
  } else if (result.message) {
    console.log(`    ❌ Не призначено: ${result.message}`);
  } else {
    const courier = couriers.find(c => c.id === result.assignedCourierId);
    console.log(`    ✅ Призначено → ${result.assignedCourierId}`);
    console.log(`       Транспорт: ${courier.transportType.displayName}`);
    console.log(`       Виконано сьогодні: ${result.courierCompletedToday} замовлень`);
    console.log(`       Відстань: ${result.distance} кроків`);
    console.log(`       Час: ${endTime - startTime}ms`);
  }
  console.log('');
}

// ============================================
// КРОК 7: СЦЕНАРІЙ 2 - Заповнення черги
// ============================================

printSeparator('⏳ СЦЕНАРІЙ 2: Призначення решти замовлень (заповнюємо чергу)');

for (let i = 3; i < orders.length; i++) {
  const order = orders[i];
  console.log(`[${i + 1}] 🔍 Призначення ${order.id} (вага: ${order.weight}kg)...`);

  const result = assignmentService.assign(order);
  results.push(result);

  if (result.queued) {
    console.log(`    ⏳ Додано в чергу (причина: ${result.reason})`);
    console.log(`    📊 Розмір черги: ${result.queueSize}`);
  } else if (result.message) {
    console.log(`    ❌ Не призначено: ${result.message}`);
  } else {
    const courier = couriers.find(c => c.id === result.assignedCourierId);
    console.log(`    ✅ Призначено → ${result.assignedCourierId} (${courier.transportType.displayName})`);
  }
}

console.log('');

const currentStats = assignmentService.getStats();
console.log(`📊 Поточний стан:`);
console.log(`   Вільних кур'єрів: ${currentStats.free}/${currentStats.total}`);
console.log(`   Замовлень в черзі: ${currentStats.queueSize}`);

console.log('');

// ============================================
// КРОК 8: СЦЕНАРІЙ 3 - Завершення замовлень
// ============================================

printSeparator('🏁 СЦЕНАРІЙ 3: Завершення замовлень та автопризначення з черги');

// Взяти перших 3 зайнятих кур'єрів
const busyCouriers = couriers.filter(c => !c.isFree()).slice(0, 3);

busyCouriers.forEach((courier, index) => {
  console.log(`[${index + 1}] 🚚 Кур'єр ${courier.id} завершує замовлення ${courier.currentOrderId}...`);

  const completeResult = assignmentService.completeOrder(courier.id);

  console.log(`    ✅ Замовлення ${completeResult.completedOrderId} завершено`);
  console.log(`    📈 Виконано сьогодні: ${completeResult.completedOrdersToday} замовлень`);

  if (completeResult.queuedOrderAssigned) {
    console.log(`    🎯 Автоматично призначено з черги:`);
    console.log(`       Замовлення: ${completeResult.queuedOrderAssigned.orderId}`);
    console.log(`       Відстань: ${completeResult.queuedOrderAssigned.distance} кроків`);
  } else {
    console.log(`    ℹ️  Черга порожня або замовлення не підходять`);
  }

  console.log('');
});

const afterCompletionStats = assignmentService.getStats();
console.log(`📊 Після завершень:`);
console.log(`   Вільних кур'єрів: ${afterCompletionStats.free}/${afterCompletionStats.total}`);
console.log(`   Замовлень в черзі: ${afterCompletionStats.queueSize}`);

console.log('');

// ============================================
// КРОК 9: СЦЕНАРІЙ 4 - Масова обробка черги
// ============================================

if (afterCompletionStats.queueSize > 0) {
  printSeparator('🔄 СЦЕНАРІЙ 4: Масова обробка черги');

  console.log(`Спроба обробити всі замовлення з черги...`);
  console.log(`Замовлень в черзі: ${afterCompletionStats.queueSize}`);
  console.log('');

  const queueResult = assignmentService.processQueue();

  console.log(`✅ Оброблено замовлень: ${queueResult.processed}`);
  console.log(`   Успішно призначено: ${queueResult.successful}`);
  console.log(`   Не вдалося призначити: ${queueResult.failed}`);
  console.log(`   Залишилось в черзі: ${queueResult.remainingQueue}`);

  console.log('');
}

// ============================================
// КРОК 10: Детальна статистика черги
// ============================================

const queue = assignmentService.getQueue();
if (!queue.isEmpty()) {
  printSeparator('📋 ДЕТАЛЬНА ІНФОРМАЦІЯ ПРО ЧЕРГУ');

  const queueStats = queue.getStats();
  console.log(`Розмір черги: ${queueStats.size}`);
  console.log(`Середній час очікування: ${(queueStats.avgWaitingTime / 1000).toFixed(2)}s`);
  console.log(`Максимальний час очікування: ${(queueStats.maxWaitingTime / 1000).toFixed(2)}s`);
  console.log('');

  console.log(`Замовлення в черзі:`);
  const allQueued = queue.getAll();
  allQueued.forEach((item, index) => {
    console.log(`  [${index + 1}] ${item.order.id} (${item.order.weight}kg) - очікує ${(item.waitingTime / 1000).toFixed(1)}s`);
  });

  console.log('');
}

// ============================================
// КРОК 11: Підсумкова статистика
// ============================================

printSeparator('📊 ПІДСУМКОВА СТАТИСТИКА');

const finalStats = assignmentService.getStats();

console.log('🚚 Кур\'єри:');
console.log(`   Всього: ${finalStats.total}`);
console.log(`   Вільних: ${finalStats.free}`);
console.log(`   Зайнятих: ${finalStats.busy}`);
console.log('');

console.log('📦 Виконані замовлення сьогодні:');
console.log(`   Загальна кількість: ${finalStats.completedOrdersToday.total}`);
console.log(`   Середнє на кур'єра: ${finalStats.completedOrdersToday.average}`);
console.log(`   Найменше: ${finalStats.completedOrdersToday.min}`);
console.log(`   Найбільше: ${finalStats.completedOrdersToday.max}`);
console.log('');

console.log('🔝 Топ кур\'єрів за кількістю виконаних замовлень:');
const sortedCouriers = [...couriers].sort((a, b) => b.completedOrdersToday - a.completedOrdersToday);
sortedCouriers.slice(0, 5).forEach((c, index) => {
  const status = c.isFree() ? '🟢' : '🔴';
  console.log(`   ${index + 1}. ${status} ${c.id} (${c.transportType.displayName}): ${c.completedOrdersToday} замовлень`);
});
console.log('');

console.log('📈 Розподіл по типах транспорту:');
Object.entries(finalStats.byTransport).forEach(([type, data]) => {
  const emoji = Object.values(TransportType).find(t => t.name === type)?.displayName || type;
  const workload = data.total > 0 ? ((data.busy / data.total) * 100).toFixed(0) : 0;
  console.log(`   ${emoji}:`);
  console.log(`     Всього: ${data.total}, Вільних: ${data.free}, Зайнятих: ${data.busy}`);
  console.log(`     Завантаження: ${workload}%`);
});
console.log('');

console.log('⏳ Черга замовлень:');
console.log(`   Поточний розмір: ${finalStats.queueSize}`);
if (finalStats.queueSize > 0) {
  const queueStats = queue.getStats();
  console.log(`   Середній час очікування: ${(queueStats.avgWaitingTime / 1000).toFixed(2)}s`);
}
console.log('');

const successfulAssignments = results.filter(r => !r.message && !r.queued).length;
const queuedAssignments = results.filter(r => r.queued).length;
const failedAssignments = results.filter(r => r.message && !r.queued).length;

console.log('📊 Статистика призначень:');
console.log(`   Всього замовлень: ${orders.length}`);
console.log(`   ✅ Успішно призначено: ${successfulAssignments} (${((successfulAssignments / orders.length) * 100).toFixed(0)}%)`);
console.log(`   ⏳ Додано в чергу: ${queuedAssignments} (${((queuedAssignments / orders.length) * 100).toFixed(0)}%)`);
console.log(`   ❌ Відмовлено: ${failedAssignments} (${((failedAssignments / orders.length) * 100).toFixed(0)}%)`);

console.log('');

// ============================================
// КРОК 12: Демонстрація пріоритетів
// ============================================

printSeparator('🎯 АНАЛІЗ ПРІОРИТЕТІВ');

console.log('Логіка пріоритетів Stage 3:');
console.log('  1️⃣  Фільтруємо кур\'єрів за можливістю перевезти вагу');
console.log('  2️⃣  Обчислюємо відстань до кожного підходящого кур\'єра');
console.log('  3️⃣  Сортуємо за відстанню (найближчий спочатку)');
console.log('  4️⃣  Якщо різниця відстаней < 1.0 одиниць:');
console.log('      → вибираємо кур\'єра з МЕНШОЮ кількістю виконаних замовлень');
console.log('  5️⃣  Інакше вибираємо найближчого');
console.log('');

console.log('Приклад:');
console.log('  Замовлення на відстані 10 кроків:');
console.log('    • Кур\'єр A: відстань 10, виконав 5 замовлень');
console.log('    • Кур\'єр B: відстань 10.5, виконав 2 замовлення');
console.log('  Різниця відстаней: 0.5 < 1.0 → вибираємо Кур\'єра B (менше навантаження)');
console.log('');

console.log('  Замовлення на відстані 10 кроків:');
console.log('    • Кур\'єр A: відстань 10, виконав 5 замовлень');
console.log('    • Кур\'єр C: відстань 12, виконав 1 замовлення');
console.log('  Різниця відстаней: 2.0 > 1.0 → вибираємо Кур\'єра A (найближчий)');
console.log('');

// ============================================
// КРОК 13: Збереження результатів
// ============================================

const outputData = {
  timestamp: new Date().toISOString(),
  version: 'Stage 3 MVP',
  features: [
    'Priority by completed orders',
    'Automatic queue management',
    'Distance threshold for priority',
    'Auto-assignment from queue on completion'
  ],
  config: {
    distanceThreshold: 1.0,
    mapSize: cityMap.size,
    walkableCells: cityMap.countWalkable()
  },
  couriers: couriers.map(c => c.toJSON()),
  orders: orders.map(o => o.toJSON()),
  assignments: results,
  queue: queue.toJSON(),
  summary: {
    totalCouriers: couriers.length,
    totalOrders: orders.length,
    successfulAssignments,
    queuedAssignments,
    failedAssignments,
    queueSize: finalStats.queueSize,
    completedOrdersToday: finalStats.completedOrdersToday,
    byTransport: finalStats.byTransport
  }
};

const resultsPath = path.join(__dirname, '../data/stage3-results.json');

try {
  const dir = path.dirname(resultsPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(resultsPath, JSON.stringify(outputData, null, 2));
  console.log('💾 Результати збережено:');
  console.log(`   Файл: ${resultsPath}`);
  console.log(`   Розмір: ${(fs.statSync(resultsPath).size / 1024).toFixed(2)} KB`);
} catch (error) {
  console.error('❌ Помилка збереження:', error.message);
}

console.log('');

// ============================================
// КРОК 14: Рекомендації
// ============================================

printSeparator('💡 РЕКОМЕНДАЦІЇ ДЛЯ ОПТИМІЗАЦІЇ');

const avgCompleted = finalStats.completedOrdersToday.average;
const maxCompleted = finalStats.completedOrdersToday.max;
const minCompleted = finalStats.completedOrdersToday.min;
const loadDiff = maxCompleted - minCompleted;

if (loadDiff > 5) {
  console.log('⚠️  Виявлено нерівномірне навантаження на кур\'єрів!');
  console.log(`   Різниця між найбільш та найменш завантаженим: ${loadDiff} замовлень`);
  console.log('   Рекомендації:');
  console.log('   • Збільшити поріг відстані для пріоритету (зараз 1.0)');
  console.log('   • Додати більше кур\'єрів у зони з високим попитом');
  console.log('');
}

if (finalStats.queueSize > 3) {
  console.log('⚠️  Велика черга замовлень!');
  console.log(`   Поточний розмір: ${finalStats.queueSize}`);
  console.log('   Рекомендації:');
  console.log('   • Додати більше кур\'єрів');
  console.log('   • Перевірити розподіл типів транспорту');
  console.log('');
}

const freePercentage = (finalStats.free / finalStats.total) * 100;
if (freePercentage < 20) {
  console.log('⚠️  Низька доступність кур\'єрів!');
  console.log(`   Вільних: ${freePercentage.toFixed(0)}%`);
  console.log('   Рекомендації:');
  console.log('   • Додати більше кур\'єрів в систему');
  console.log('   • Оптимізувати маршрути доставки');
  console.log('');
}

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║  ✨ Stage 3 MVP завершено!                                  ║');
console.log('║  Система працює автоматично з пріоритетами та чергою       ║');
console.log('╚══════════════════════════════════════════════════════════════╝');