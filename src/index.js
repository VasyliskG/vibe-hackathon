const Location = require('./domain/Location');
const { Order } = require('./domain/Order');
const Courier = require('./domain/Courier');
const AssignmentService = require('./services/AssignmentService');
const DistanceCalculator = require('./utils/DistanceCalculator');

console.log('=== Система розподілу замовлень доставки ===\n');

// 1. Створюємо кур'єрів
const courier1 = new Courier('C1', new Location(10, 20), 2);
const courier2 = new Courier('C2', new Location(50, 50), 1);
const courier3 = new Courier('C3', new Location(80, 90), 3);

console.log('Кур\'єри створені:');
console.log(courier1.toString());
console.log(courier2.toString());
console.log(courier3.toString());
console.log('');

// 2. Створюємо сервіс призначення
const assignmentService = new AssignmentService([
  courier1,
  courier2,
  courier3
]);

console.log('Статистика:', assignmentService.getStats());
console.log('');

// 3. Створюємо замовлення
const order1 = new Order('O1', new Location(15, 25));
const order2 = new Order('O2', new Location(55, 48));
const order3 = new Order('O3', new Location(85, 88));

console.log('Замовлення створені:');
console.log(order1.toString());
console.log(order2.toString());
console.log(order3.toString());
console.log('');

// 4. Призначаємо замовлення
try {
  console.log('--- Призначення замовлень ---\n');

  const result1 = assignmentService.assign(order1);
  console.log(`✅ ${order1.id} → ${result1.courierId} (відстань: ${result1.distance.toFixed(2)})`);

  const result2 = assignmentService.assign(order2);
  console.log(`✅ ${order2.id} → ${result2.courierId} (відстань: ${result2.distance.toFixed(2)})`);

  const result3 = assignmentService.assign(order3);
  console.log(`✅ ${order3.id} → ${result3.courierId} (відстань: ${result3.distance.toFixed(2)})`);

  console.log('\nОстаточна статистика:', assignmentService.getStats());

} catch (error) {
  console.error('❌ Помилка:', error.message);
}

// 5. Демонстрація обчислення відстані
console.log('\n--- Приклад розрахунку відстані ---');
const loc1 = new Location(0, 0);
const loc2 = new Location(3, 4);
const distance = DistanceCalculator.calculate(loc1, loc2);
console.log(`Відстань між ${loc1.toString()} та ${loc2.toString()}: ${distance}`);
