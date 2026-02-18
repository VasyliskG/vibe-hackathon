# 🚀 Stage 6 Phase 1 — Quickstart Guide

Добро пожаловать в Phase 1 Stage 6: **Smart Dispatch Optimization & Territory Zoning**

Этот guide помоет вам за 30 минут настроить всю систему и запустить первый оптимизированный dispatch.

---

## ⏱️ 5 минут: Установка окружения

### 1.1 Установить зависимости

```bash
cd /home/g/Prog_Project/VS_Code/vibe-hackathon
npm install

# Для PostgreSQL и job queue
npm install pg sequelize bull ioredis geolib tensorflow
npm install --save-dev sequelize-cli
```

### 1.2 Создать `.env` файл

```bash
cp .env.example .env
```

Отредактируйте `.env`:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=vibe_delivery
DB_USER=postgres
DB_PASSWORD=postgres

# Redis
REDIS_URL=redis://localhost:6379

# Features
USE_POSTGRES=true
USE_ZONES=true
USE_VRP_OPTIMIZATION=true
```

---

## ⏱️ 10 минут: Настройка PostgreSQL

### 2.1 Запустить PostgreSQL (если не запущен)

```bash
# macOS (если установлена через Homebrew)
brew services start postgresql@15

# Linux (Ubuntu/Debian)
sudo service postgresql start

# Or Docker
docker run --name postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:15
```

### 2.2 Создать базу данных

```bash
# Подключитесь
psql -U postgres

# В psql:
CREATE DATABASE vibe_delivery;
\q

# Выполнить схему
psql -U postgres -d vibe_delivery -f src/db/schemas.sql

# Проверить таблицы
psql -U postgres -d vibe_delivery -c "\dt"
```

**Ожидаемый результат:**

```
            List of relations
 Schema |      Name       | Type  |  Owner
--------+-----------------+-------+----------
 public | audit_logs      | table | postgres
 public | couriers        | table | postgres
 public | delivery_history| table | postgres
 public | metrics_snapshots| table | postgres
 public | orders          | table | postgres
 public | predictions     | table | postgres
 public | routes          | table | postgres
 public | zones           | table | postgres
```

### 2.3 Запустить Redis (optional, для job queue)

```bash
# macOS
brew services start redis

# Linux
sudo service redis-server start

# Or Docker
docker run --name redis -p 6379:6379 -d redis:7
```

---

## ⏱️ 10 минут: Запуск системы

### 3.1 Инициализировать сервер с поддержкой Phase 1

Обновите `server.js`:

```javascript
const express = require('express');
const DatabaseInitializer = require('./src/db/DatabaseInitializer');
const PostgresRepository = require('./src/persistence/PostgresRepository');
const VrpSolver = require('./src/optimization/VrpSolver');
const EtaCalculator = require('./src/optimization/EtaCalculator');
const ZoneService = require('./src/services/ZoneService');
const logger = require('./src/utils/logger');

require('dotenv').config();

const app = express();

// Database initialization
let db = null;
let vrpSolver = null;
let etaCalculator = null;
let zoneService = null;

async function initializeServices() {
  try {
    // Initialize database
    const dbInit = new DatabaseInitializer(process.env);
    await dbInit.initialize();
    
    db = new PostgresRepository(
      dbInit.getSequelize(),
      dbInit.getModels()
    );

    // Initialize optimizers
    vrpSolver = new VrpSolver();
    etaCalculator = new EtaCalculator();
    zoneService = new ZoneService(db);

    logger.info('Phase 1 services initialized successfully');
    return true;
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    throw error;
  }
}

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Health check
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await db.healthCheck();
    res.json({
      status: 'healthy',
      database: dbHealth,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

// Zone endpoints
app.get('/api/zones', async (req, res) => {
  try {
    const zones = await zoneService.getAllZones();
    res.json(zones);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/zones', async (req, res) => {
  try {
    const { name, bounds, capacity } = req.body;
    const zone = await zoneService.createZone(name, bounds, capacity);
    res.status(201).json(zone);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/zones/statistics', async (req, res) => {
  try {
    const stats = await zoneService.getZoneStatistics();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Optimization endpoints
app.get('/api/optimization/eta', async (req, res) => {
  try {
    const { orderId, courierId } = req.query;
    const order = await db.getOrderById(orderId);
    const courier = await db.getCourierById(courierId);
    
    const eta = etaCalculator.calculateEta(order, courier);
    res.json(eta);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  try {
    await initializeServices();
    logger.info(`🚀 Stage 6 Phase 1 Server running on port ${PORT}`);
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
});
```

### 3.2 Запустить сервер

```bash
npm start
```

**Ожидаемый вывод:**

```
[INFO] PostgreSQL connection established successfully
[INFO] Phase 1 services initialized successfully
[INFO] 🚀 Stage 6 Phase 1 Server running on port 3000
```

---

## ⏱️ 5 минут: Первый тест

### 4.1 Создать зону

```bash
curl -X POST http://localhost:3000/api/zones \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Manhattan",
    "bounds": {
      "lat_min": 40.7000,
      "lat_max": 40.8200,
      "lon_min": -74.0100,
      "lon_max": -73.9200
    },
    "capacity": 100
  }'
```

**Ответ:**

```json
{
  "id": 1,
  "name": "Manhattan",
  "bounds": {
    "lat_min": 40.7,
    "lat_max": 40.82,
    "lon_min": -74.01,
    "lon_max": -73.92
  },
  "capacity": 100,
  "current_load": 0,
  "status": "active",
  "created_at": "2026-02-18T10:00:00Z"
}
```

### 4.2 Создать курьера

```bash
curl -X POST http://localhost:3000/api/couriers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "transport_type": "bike",
    "current_location": {
      "latitude": 40.7500,
      "longitude": -73.9750
    },
    "current_zone_id": 1,
    "capacity": 5
  }'
```

### 4.3 Создать заказ

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "sender_location": {
      "latitude": 40.7580,
      "longitude": -73.9855,
      "address": "Times Square"
    },
    "receiver_location": {
      "latitude": 40.7489,
      "longitude": -73.9680,
      "address": "Grand Central"
    },
    "priority": "normal",
    "weight": 2.5
  }'
```

### 4.4 Запустить VRP оптимизацию

```bash
curl -X POST http://localhost:3000/api/optimization/solve \
  -H "Content-Type: application/json" \
  -d '{
    "orderIds": [1, 2, 3],
    "courierIds": [1],
    "algorithm": "savings_algorithm"
  }'
```

---

## 📊 Проверка статуса

```bash
# Health check
curl http://localhost:3000/health

# Get all zones
curl http://localhost:3000/api/zones

# Get zone statistics
curl http://localhost:3000/api/zones/statistics

# View database tables
psql -U postgres -d vibe_delivery -c "SELECT COUNT(*) FROM orders; SELECT COUNT(*) FROM couriers; SELECT COUNT(*) FROM zones;"
```

---

## 🧪 Запуск тестов

```bash
# Unit tests
npm test

# Integration tests
npm test -- test/integration/

# Watch mode
npm run test:watch

# With coverage
npm test -- --coverage
```

---

## 📚 Что дальше?

✅ **Phase 1 завершена**

Теперь вы готовы к:

1. **Phase 2** — Predictive Load Modeling & Analytics
2. **Phase 3** — Distributed Architecture & Event Sourcing

See [STAGE6_PHASE1.md](./STAGE6_PHASE1.md) for detailed documentation.

---

## 🆘 Troubleshooting

### PostgreSQL connection refused

```bash
# Check PostgreSQL status
psql -U postgres -c "SELECT version();"

# Check connection string
psql postgresql://postgres:postgres@localhost:5432/vibe_delivery
```

### Redis connection error

```bash
# Check Redis
redis-cli ping
# Should return: PONG

# If not running:
redis-server
```

### Port already in use

```bash
# Change port in .env
PORT=3001

# Or kill process using port 3000
lsof -i :3000
kill -9 <PID>
```

### Database tables not found

```bash
# Re-run schema
psql -U postgres -d vibe_delivery -f src/db/schemas.sql

# Verify tables
psql -U postgres -d vibe_delivery -c "\dt"
```

---

## 📞 Support

For issues or questions:

1. Check [STAGE6_PHASE1.md](./STAGE6_PHASE1.md)
2. Review logs: `tail -f logs/combined.log`
3. Check error logs: `tail -f logs/error.log`

---

**Happy dispatching! 🚀**

