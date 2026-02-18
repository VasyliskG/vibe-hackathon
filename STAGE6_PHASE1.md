# Stage 6 — Phase 1: Smart Optimization & Territory Zoning

## 📌 Обзор Phase 1

Phase 1 закладывает фундамент для всей Stage 6 с помощью:

1. **Smart Dispatch Optimization** — VRP solver для оптимального распределения заказов
2. **Territory Zoning** — разделение карты на зоны с балансировкой нагрузки  
3. **Database Migration** — переход с JSON на PostgreSQL
4. **ETA Calculation** — прогнозирование времени доставки с учетом множества факторов
5. **Persistence Adapter** — абстракция для поддержки обоих хранилищ одновременно

---

## 🏗️ Архитектура Phase 1

```
┌─────────────────────────────────────────────────────────────────┐
│                      API Layer (Express)                         │
│          /api/orders, /api/couriers, /api/zones                 │
└────────────────┬────────────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────────────┐
│                     Services Layer                               │
│  ┌──────────────────┐ ┌─────────────────┐ ┌────────────────┐   │
│  │ AssignmentService│ │ VrpSolver       │ │ EtaCalculator  │   │
│  └──────────────────┘ └─────────────────┘ └────────────────┘   │
│  ┌──────────────────┐ ┌─────────────────┐ ┌────────────────┐   │
│  │ ZoneService      │ │ DataService     │ │ SlaMonitor     │   │
│  └──────────────────┘ └─────────────────┘ └────────────────┘   │
└────────────────┬────────────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────────────┐
│                  DatabaseAdapter (Abstract)                     │
│        ┌──────────────────────┬──────────────────────┐           │
│        │                      │                      │           │
│    PostgresRepository   JsonRepository    (future)  │           │
└────────────────┬────────────────────────────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
    PostgreSQL          JSON Files
    (Primary)           (Fallback)
```

---

## 📋 Структура папок Phase 1

```
src/
├── optimization/                    # NEW: Оптимизация маршрутов
│   ├── VrpSolver.js                # Vehicle Routing Problem solver
│   ├── EtaCalculator.js            # Estimated Time of Arrival
│   └── algorithms/                 # Будущие алгоритмы
│
├── persistence/                     # NEW: Слой персистентности
│   ├── DatabaseAdapter.js          # Абстрактный интерфейс
│   ├── PostgresRepository.js       # PostgreSQL имплементация
│   └── JsonRepository.js           # JSON имплементация (можно добавить)
│
├── db/                              # NEW: Database layer
│   ├── schemas.sql                 # PostgreSQL schema DDL
│   ├── DatabaseInitializer.js      # Sequelize модели и инициализация
│   ├── migrations/                 # DB миграции (будущие)
│   └── seeders/                    # Тестовые данные (будущие)
│
├── services/
│   ├── ZoneService.js              # NEW: Управление зонами
│   ├── AssignmentService.js        # UPDATED: Использует VRP + ETA
│   ├── DataService.js              # UPDATED: Использует DatabaseAdapter
│   └── ...
│
└── ...
```

---

## 🚀 Установка и настройка

### 1. Установка зависимостей

```bash
npm install pg sequelize bull ioredis geolib tensorflow
npm install --save-dev sequelize-cli clinic
```

### 2. Настройка окружения

Создайте `.env` файл в корне проекта:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=vibe_delivery
DB_USER=postgres
DB_PASSWORD=your_password
DB_URL=postgresql://postgres:password@localhost:5432/vibe_delivery

# Redis (для job queue и cache)
REDIS_URL=redis://localhost:6379

# Environment
NODE_ENV=development
PORT=3000

# Feature flags
USE_POSTGRES=true
USE_ZONES=true
USE_VRP_OPTIMIZATION=true
```

### 3. Создание базы данных PostgreSQL

```bash
# Подключитесь к PostgreSQL
psql -U postgres

# Создайте базу
CREATE DATABASE vibe_delivery;

# Выполните схему
psql -U postgres -d vibe_delivery -f src/db/schemas.sql

# Проверьте таблицы
\dt
```

### 4. Инициализация при запуске

```javascript
// В src/api/server.js или server.js
const DatabaseInitializer = require('./src/db/DatabaseInitializer');
const PostgresRepository = require('./src/persistence/PostgresRepository');

const dbInit = new DatabaseInitializer(process.env);
await dbInit.initialize();

const db = new PostgresRepository(
  dbInit.getSequelize(),
  dbInit.getModels()
);

// Используйте в сервисах:
const assignmentService = new AssignmentService(db);
const zoneService = new ZoneService(db);
```

---

## 📊 API Changes для Phase 1

### Новые endpoints для Zone Management

```
POST   /api/zones                    # Создать зону
GET    /api/zones                    # Получить все зоны
GET    /api/zones/:id                # Получить конкретную зону
PUT    /api/zones/:id                # Обновить зону
DELETE /api/zones/:id                # Удалить зону
POST   /api/zones/:id/rebalance      # Переналанцировать зоны
GET    /api/zones/statistics         # Статистика зон
GET    /api/zones/:id/health         # Health report зоны
```

### Обновленные endpoints для Orders

```
POST   /api/orders                   # UPDATED: Автоматически назначает зону + ETA
GET    /api/orders?zone=1&status=pending

PUT    /api/orders/:id/assign        # UPDATED: Использует VRP + ETA calculationrior=high
```

### Новые endpoints для Optimization

```
GET    /api/optimization/compare     # Сравнить решения VRP
POST   /api/optimization/solve       # Решить VRP вручную
GET    /api/optimization/eta         # ETA для заказа
```

---

## 🔄 Data Migration Strategy

### Вариант 1: Dual-Write (Рекомендуется для фазы 1)

```javascript
// DataService использует DatabaseAdapter
// DatabaseAdapter может писать в обе системы одновременно

class DualWriteAdapter {
  async createOrder(orderData) {
    // Write to PostgreSQL
    const postgresOrder = await postgresRepo.createOrder(orderData);
    
    // Write to JSON (для fallback)
    const jsonOrder = await jsonRepo.createOrder(orderData);
    
    return postgresOrder;
  }
}
```

### Вариант 2: Migration Scripts (для нулевого downtime)

```javascript
// Migrate existing JSON data to PostgreSQL
const { readFileSync } = require('fs');

async function migrateData() {
  const orders = JSON.parse(readFileSync('data/orders.json'));
  const couriers = JSON.parse(readFileSync('data/couriers.json'));
  
  for (const order of orders) {
    await db.createOrder(order);
  }
  
  for (const courier of couriers) {
    await db.createCourier(courier);
  }
}
```

---

## 📈 Workflow: Order Assignment (Обновленный)

```
1. POST /api/orders
   ↓
2. DataService.createOrder()
   ↓
3. ZoneService.assignOrderToZone()
   → Определить зону по location
   ↓
4. AssignmentService.assignMultiple()
   → VrpSolver.solveSavingsAlgorithm()
   → EtaCalculator.findBestCourier()
   ↓
5. DatabaseAdapter.updateOrder()
   → Сохранить в PostgreSQL
   ↓
6. SlaMonitor.checkSla()
   → Проверить SLA compliance
   ↓
7. WebSocket event: order:assigned
   → Отправить dashboard
```

---

## 🧪 Тестирование Phase 1

### Unit Tests

```bash
npm test -- src/optimization/VrpSolver.test.js
npm test -- src/optimization/EtaCalculator.test.js
npm test -- src/services/ZoneService.test.js
```

### Integration Tests

```bash
npm test -- test/integration/zone-assignment.test.js
npm test -- test/integration/vrp-optimization.test.js
```

### Load Testing (k6)

```bash
# Создать test/performance/load-test.js
# Симулировать 1000+ заказов
npm run test:load
```

---

## 🔍 Monitoring & Debugging

### Логирование оптимизации

```javascript
// VrpSolver логирует каждый шаг
logger.debug(`VRP Savings Algorithm: ${orders.length} orders`);
logger.info(`Solution found: ${routes.length} routes, efficiency=${efficiency}`);
```

### Метрики для отслеживания

```javascript
// Сохраняйте в MetricsSnapshot:
- orders_per_zone_hour
- avg_eta_minutes
- zone_load_percentage
- courier_utilization
- vrp_solution_quality
```

---

## ⚠️ Common Issues & Solutions

### 1. PostgreSQL connection refused

```bash
# Проверить, запущена ли БД
psql -U postgres -c "SELECT version();"

# Проверить конфиг в .env
DB_HOST=localhost  # или 127.0.0.1
DB_PORT=5432
```

### 2. Zone bounds validation

```javascript
// Bounds должны быть корректными координатами
const bounds = {
  lat_min: 40.7000,  // юг
  lat_max: 40.8000,  // север
  lon_min: -74.0000, // запад
  lon_max: -73.9000  // восток
};
```

### 3. VRP solver performance

```javascript
// Для 1000+ заказов используйте Nearest Neighbor вместо Savings
const routes = vrpSolver.solveNearestNeighbor(orders, couriers);

// Затем улучшайте с помощью 2-opt post-processing
```

---

## 📚 Дополнительные ресурсы

- **VRP algorithms**: [Vehicle Routing Problem - Wikipedia](https://en.wikipedia.org/wiki/Vehicle_routing_problem)
- **ETA models**: [Arrival Time Prediction](https://arxiv.org/abs/1809.09503)
- **Sequelize docs**: [Sequelize ORM](https://sequelize.org/)
- **PostgreSQL PostGIS**: [Геосpatial queries](https://postgis.net/)

---

## ✅ Checklist для завершения Phase 1

- [ ] PostgreSQL база создана и подключена
- [ ] DatabaseAdapter и PostgresRepository реализованы
- [ ] VrpSolver работает с тестовыми данными
- [ ] EtaCalculator интегрирован в AssignmentService
- [ ] ZoneService работает (CRUD + rebalancing)
- [ ] API endpoints обновлены
- [ ] Миграция JSON → PostgreSQL выполнена
- [ ] Unit тесты pass (>90% coverage)
- [ ] Integration тесты pass
- [ ] Load тесты завершены успешно
- [ ] Документация обновлена
- [ ] CI/CD pipeline настроена

---

## 🎯 Следующие шаги (Phase 2)

После завершения Phase 1:

1. **Predictive Load Modeling**
   - Collect training data from production
   - Train LSTM model for demand forecasting
   - Integrate predictions into dispatcher

2. **Analytics Dashboard**
   - Time-range filters
   - Zone performance heatmaps
   - Courier utilization charts
   - SLA compliance trends

3. **Advanced SLA Enforcement**
   - Real-time SLA violation alerts
   - Penalty calculations
   - Auto-reassignment on SLA risk

---

**Версия**: 1.0  
**Дата**: 2026-02-18  
**Статус**: Phase 1 Foundation  

