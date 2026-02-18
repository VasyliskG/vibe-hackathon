# 🚀 Stage 5: Realtime Dispatch System

Production-ready REST API для системи автоматичного розподілу замовлень з повним lifecycle management, персистентністю даних та моніторингом.

[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)  
[![Stage](https://img.shields.io/badge/Stage-5%20Production-success.svg)](https://github.com/VasyliskG/vibe-hackathon)  
[![Tests](https://img.shields.io/badge/Tests-Jest-red.svg)](https://jestjs.io/)

---

## ✨ Stage 5 Features

✅ **REST API** - Express.js з повним CRUD  
✅ **Order Lifecycle** - 6 статусів замовлень (pending → assigned → picked_up → in_transit → delivered)  
✅ **JSON Persistence** - Автоматичне збереження даних  
✅ **Winston Logging** - Структуроване логування в файли  
✅ **Health & Metrics** - Моніторинг системи в реальному часі  
✅ **ENV Configuration** - Конфігурація через .env  
✅ **Automated Tests** - Unit + Integration тести (Jest)  
✅ **Error Handling** - Глобальний обробник помилок  
✅ **Input Validation** - express-validator для всіх endpoints  
✅ **Realtime Dispatch** - WebSocket API для миттєвого оновлення статусів  
✅ **EventBus Architecture** - Подієва архітектура для обробки подій системи  
✅ **Live Dashboard** - Односторінковий додаток для моніторингу в реальному часі  
✅ **SLA Monitoring** - Моніторинг порушень угод про рівень обслуговування  
✅ **Simulation Service** - Сервіс для симуляції навантаження та тестування

---

## 🎯 Core Features

- **Smart Assignment**: Рівномірне розподілення з урахуванням навантаження
- **Order Queue**: FIFO черга з автопризначенням
- **Courier Load Balancing**: Лічильник completedOrdersToday
- **Weight Filtering**: Перевірка ваги за типом транспорту
- **Pathfinding**: Dijkstra алгоритм для пошуку шляху
- **Real-time Metrics**: Статистика замовлень, кур'єрів, системи

---

## 📦 Installation

```bash
git clone https://github.com/VasyliskG/vibe-hackathon.git
cd vibe-hackathon
npm install
cp .env.example .env
npm start
```

Server will start on `http://localhost:3000`

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm test -- --coverage
```

---

## 📚 API Documentation

### System Endpoints

#### `GET /` - Service Info
```json
{
  "service": "Vibe Delivery System",
  "stage": "5 - Production Ready",
  "version": "5.0.0",
  "status": "running"
}
```

#### `GET /api/system/health` - Health Check
```json
{
  "status": "healthy",
  "uptime": "123s",
  "environment": "development"
}
```

#### `GET /api/system/metrics` - System Metrics
```json
{
  "success": true,
  "data": {
    "orders": { "total": 10, "pending": 2, "delivered": 8 },
    "couriers": { "total": 5, "free": 3, "busy": 2 },
    "system": { "memory": {...}, "cpu": {...} }
  }
}
```

#### `POST /api/system/auto-assign` - Auto-assign Orders
Automatically assigns pending orders to available couriers.

---

### Order Endpoints

#### `GET /api/orders` - Get All Orders
Query params: `?status=pending|assigned|delivered`

#### `GET /api/orders/:id` - Get Order by ID

#### `POST /api/orders` - Create Order
```json
{
  "id": "order-123",
  "restaurantX": 10,
  "restaurantY": 20,
  "weight": 5
}
```

#### `POST /api/orders/:id/assign` - Assign to Courier
```json
{
  "courierId": "courier-1"
}
```

#### `PATCH /api/orders/:id/status` - Update Status
```json
{
  "status": "picked_up" | "in_transit" | "delivered" | "cancelled"
}
```

#### `DELETE /api/orders/:id` - Cancel Order

#### `GET /api/orders/queue` - Get Order Queue

---

### Courier Endpoints

#### `GET /api/couriers` - Get All Couriers
Query params: `?status=Free|Busy`

#### `GET /api/couriers/:id` - Get Courier by ID

#### `POST /api/couriers` - Create Courier
```json
{
  "id": "courier-6",
  "x": 10,
  "y": 20,
  "transportType": "bicycle"
}
```

#### `PATCH /api/couriers/:id/location` - Update Location
```json
{
  "x": 30,
  "y": 40
}
```

#### `PATCH /api/couriers/:id/status` - Update Status
```json
{
  "status": "Free" | "Busy"
}
```

#### `POST /api/couriers/:id/reset-counter` - Reset Daily Counter

#### `DELETE /api/couriers/:id` - Delete Courier

---

## 🌐 Realtime Dashboard

Open `http://localhost:3000` after starting the server.

Dashboard panels:
- Live Map (couriers + orders)
- Realtime Statistics
- Activity Feed
- Queue Monitor

---

## 🔌 WebSocket API

- Endpoint: `ws://localhost:3000`
- Path: `/ws`
- Auth: JWT token in `auth.token`

### Example (client)

```js
const socket = io('http://localhost:3000', {
  path: '/ws',
  auth: { token: '<JWT>' }
});
```

### Events

- `ORDER_CREATED`
- `ORDER_ASSIGNED`
- `ORDER_COMPLETED`
- `ORDER_CANCELLED`
- `ORDER_QUEUED`
- `COURIER_STATUS_CHANGED`
- `QUEUE_UPDATED`
- `SLA_VIOLATION`

---

## 🧪 Simulation

### Start

```bash
curl -X POST http://localhost:3000/api/simulation/start \
  -H "Content-Type: application/json" \
  -d '{"ordersCount":100,"couriersCount":20}'
```

### Stop

```bash
curl -X POST http://localhost:3000/api/simulation/stop
```

### Status

```bash
curl http://localhost:3000/api/simulation/status
```

---

## 🔐 WebSocket Token (dev only)

```bash
curl -X POST http://localhost:3000/api/system/token \
  -H "Content-Type: application/json" \
  -d '{"userId":"dashboard","role":"ADMIN"}'
```

---

## 🔧 Configuration (.env)

```env
PORT=3000
NODE_ENV=development
LOG_LEVEL=info
USE_PATHFINDING=true
MAP_SIZE=100
DATA_DIR=./data
```

---

## 📊 Project Structure

```
vibe-hackathon/
├── server.js              # Main entry point
├── src/
│   ├── api/              # REST API layer
│   │   ├── controllers/  # Request handlers
│   │   ├── routes/       # Route definitions
│   │   └── middleware/   # Express middleware
│   ├── domain/           # Business logic
│   ├── services/         # Core services
│   ├── utils/            # Utilities
│   └── config/           # Configuration
├── test/
│   ├── unit/             # Unit tests
│   └── integration/      # API tests
└── data/                 # JSON storage
```

---

## 🚀 Usage Examples

### Create and Auto-Assign Order

```bash
# Create order
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "id": "order-001",
    "restaurantX": 15,
    "restaurantY": 25,
    "weight": 5
  }'

# Auto-assign
curl -X POST http://localhost:3000/api/system/auto-assign
```

### Check System Health

```bash
curl http://localhost:3000/api/system/health
curl http://localhost:3000/api/system/metrics
```

### Get All Free Couriers

```bash
curl http://localhost:3000/api/couriers?status=Free
```

---

## 📝 License

ISC

---

## 👤 Author

**VasyliskG**

🚀 Built for Vibe Hackathon - Stage 5
