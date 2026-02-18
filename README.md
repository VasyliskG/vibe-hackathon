# 🚀 Stage 6: Intelligent Optimization, Analytics & Scaling

**Current Phase**: Stage 6 Phase 1 — Smart Dispatch Optimization & Territory Zoning

Enterprise-ready delivery dispatch system with advanced optimization, territory management, and database persistence.

[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)  
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue.svg)](https://www.postgresql.org/)  
[![Stage](https://img.shields.io/badge/Stage-6%20Phase%201-success.svg)](https://github.com/VasyliskG/vibe-hackathon)  
[![Tests](https://img.shields.io/badge/Tests-Jest-red.svg)](https://jestjs.io/)

---

## ✨ Stage 6 Phase 1 Features

### 🎯 Smart Dispatch Optimization
✅ **VRP Solver** - Vehicle Routing Problem with multiple algorithms (Savings, Nearest Neighbor, 2-opt)  
✅ **ETA Calculator** - Estimated Time of Arrival with traffic, queue, and confidence scoring  
✅ **Multi-Stop Routes** - Optimize delivery sequences for couriers  
✅ **Solution Comparison** - Evaluate and compare optimization solutions  

### 🗺️ Territory Zoning
✅ **Zone Management** - Create, update, and manage delivery zones  
✅ **Geo-Location Mapping** - Automatic zone assignment by coordinates  
✅ **Load Balancing** - Monitor and rebalance zones based on capacity  
✅ **Zone Health Reports** - Real-time zone status and recommendations  

### 💾 Database Migration
✅ **PostgreSQL Support** - Full ACID-compliant database with Sequelize ORM  
✅ **Comprehensive Schema** - Orders, Couriers, Zones, Delivery History, Metrics, Audit Logs  
✅ **Performance Indexes** - Optimized for fast queries on critical paths  
✅ **Persistence Adapter** - Abstract interface for swapping backends  

### 📊 Previous Stage Features (Inherited)
✅ **REST API** - Express.js with full CRUD operations  
✅ **WebSocket Realtime** - Real-time status updates and live dashboard  
✅ **Order Lifecycle** - Complete order management (pending → delivered)  
✅ **Winston Logging** - Structured logging with rotation  
✅ **Event Bus** - Decoupled event-driven architecture  
✅ **SLA Monitoring** - Service Level Agreement enforcement  
✅ **Simulation Service** - Load testing and scenario simulation  

---

## 🏗️ Architecture

```
┌──────────────────────────────────────┐
│      API Layer (Express)             │
│  /api/orders, /api/couriers, /zones  │
└────────────────┬─────────────────────┘
                 │
┌────────────────▼──────────────────────┐
│    Services Layer                     │
│ ┌─────────────┐ ┌──────────────────┐ │
│ │ VrpSolver   │ │ EtaCalculator    │ │
│ └─────────────┘ └──────────────────┘ │
│ ┌─────────────┐ ┌──────────────────┐ │
│ │ ZoneService │ │ AssignmentService│ │
│ └─────────────┘ └──────────────────┘ │
└────────────────┬──────────────────────┘
                 │
┌────────────────▼──────────────────────┐
│   DatabaseAdapter (Abstract)          │
│      PostgresRepository (Impl)        │
└────────────────┬──────────────────────┘
                 │
        ┌────────▼────────┐
        │  PostgreSQL 15+ │
        └─────────────────┘
```

---

## 📋 Quick Start

### Option 1: Automated Setup (Recommended)

```bash
# Make script executable
chmod +x setup-stage6-phase1.sh

# Run setup
./setup-stage6-phase1.sh
```

### Option 2: Manual Setup

See [STAGE6_PHASE1_QUICKSTART.md](./STAGE6_PHASE1_QUICKSTART.md) for detailed 30-minute setup guide.

---

## 📦 Installation

```bash
# Clone and install
git clone https://github.com/VasyliskG/vibe-hackathon.git
cd vibe-hackathon

# Install dependencies (includes pg, sequelize, tensorflow, bull, etc.)
npm install

# Setup PostgreSQL database
createdb vibe_delivery
psql -U postgres -d vibe_delivery -f src/db/schemas.sql

# Configure environment
cp .env.example .env
# Edit .env with your database credentials

# Start server
npm start
```

---

## 🚀 Usage

### Create a Zone

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

### Create an Order

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
    "priority": "normal"
  }'
```

### Optimize Orders (VRP)

```bash
curl -X POST http://localhost:3000/api/optimization/solve \
  -H "Content-Type: application/json" \
  -d '{
    "orderIds": [1, 2, 3],
    "courierId": [1],
    "algorithm": "savings_algorithm"
  }'
```

---

## 📊 Performance Benchmarks

| Metric | Value |
|--------|-------|
| VRP Solve (100 orders) | ~300ms |
| ETA Calculation | <100ms |
| Zone Query | <50ms |
| Database Query (indexed) | <10ms |

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# With coverage
npm test -- --coverage

# Specific test file
npm test -- test/unit/vrp-solver.test.js
```

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [STAGE6_PHASE1_QUICKSTART.md](./STAGE6_PHASE1_QUICKSTART.md) | 30-minute setup guide |
| [STAGE6_PHASE1.md](./STAGE6_PHASE1.md) | Complete Phase 1 documentation |
| [STAGE6_PHASE1_SUMMARY.md](./STAGE6_PHASE1_SUMMARY.md) | Implementation summary |
| [STAGE5_SUMMARY.md](./STAGE5_SUMMARY.md) | Previous stage features |

---

## 🔧 Configuration

Create `.env` file (see `.env.example`):

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=vibe_delivery
DB_USER=postgres
DB_PASSWORD=postgres

# Redis (for job queue)
REDIS_URL=redis://localhost:6379

# Feature Flags
USE_POSTGRES=true
USE_ZONES=true
USE_VRP_OPTIMIZATION=true

# Optimization
VRP_ALGORITHM=savings_algorithm
ZONE_LOAD_WARNING_THRESHOLD=0.75
ZONE_REBALANCE_INTERVAL_MINUTES=30
```

---

## 📁 Project Structure

```
src/
├── optimization/
│   ├── VrpSolver.js          # Vehicle Routing Problem solver
│   └── EtaCalculator.js      # ETA calculation engine
├── services/
│   ├── ZoneService.js        # Territory zone management
│   └── (inherited services)
├── persistence/
│   ├── DatabaseAdapter.js    # Abstract persistence layer
│   └── PostgresRepository.js # PostgreSQL implementation
├── db/
│   ├── schemas.sql           # PostgreSQL DDL
│   └── DatabaseInitializer.js # Sequelize models
└── (other modules)

test/
├── unit/
│   ├── vrp-solver.test.js
│   └── eta-calculator.test.js
└── integration/

data/
├── orders.json
├── couriers.json
└── city-map.json (legacy)
```

---

## 🎯 API Endpoints

### Zones
```
GET    /api/zones                 # Get all zones
POST   /api/zones                 # Create zone
GET    /api/zones/:id             # Get specific zone
PUT    /api/zones/:id             # Update zone
DELETE /api/zones/:id             # Delete zone
POST   /api/zones/:id/rebalance   # Trigger zone rebalancing
GET    /api/zones/statistics      # Zone statistics
```

### Optimization
```
GET    /api/optimization/eta       # Calculate ETA for order
POST   /api/optimization/solve     # Solve VRP
GET    /api/optimization/compare   # Compare solutions
```

### Health & Status
```
GET    /health                     # System health check
GET    /api/metrics                # Real-time metrics
```

---

## 🔮 Roadmap

### Phase 1 (Current) ✅
- ✅ Smart Dispatch Optimization (VRP)
- ✅ Territory Zoning
- ✅ Database Migration (PostgreSQL)
- ✅ ETA Calculation

### Phase 2 (Next)
- 📋 Predictive Load Modeling (TensorFlow.js)
- 📋 Analytics Dashboard
- 📋 Advanced SLA Engine

### Phase 3
- 📋 Distributed Architecture
- 📋 Event Sourcing + CQRS
- 📋 Message Broker Integration

---

## 🛠️ Technology Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20.x |
| Framework | Express.js |
| Database | PostgreSQL 15+ |
| ORM | Sequelize |
| Cache/Queue | Redis + Bull.js |
| Testing | Jest |
| Logging | Winston |
| ML | TensorFlow.js |
| Real-time | Socket.io |
| Validation | express-validator |

---

## 📈 Metrics

The system tracks:
- Zone load and rebalancing frequency
- VRP solution quality
- ETA accuracy
- Courier utilization
- SLA compliance rate
- Order processing time

View metrics: `GET /api/metrics`

---

## 🐛 Troubleshooting

### PostgreSQL connection failed
```bash
# Check if running
psql -U postgres -c "SELECT version();"

# Start PostgreSQL
brew services start postgresql  # macOS
sudo service postgresql start   # Linux
```

### Database schema missing
```bash
psql -U postgres -d vibe_delivery -f src/db/schemas.sql
```

### Port 3000 already in use
```bash
# Change in .env
PORT=3001

# Or kill process
kill -9 $(lsof -t -i:3000)
```

---

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

---

## 📄 License

ISC License - see LICENSE file for details

---

## 👨‍💻 Author

**VasyliskG**

- GitHub: [@VasyliskG](https://github.com/VasyliskG)
- Email: vasylisk.g@example.com

---

## 🙏 Acknowledgments

- [Express.js](https://expressjs.com/) - Web framework
- [Sequelize](https://sequelize.org/) - ORM
- [Jest](https://jestjs.io/) - Testing framework
- [Winston](https://github.com/winstonjs/winston) - Logging
- [Socket.io](https://socket.io/) - Real-time communication

---

## 📞 Support

For issues, questions, or suggestions:

1. Check documentation: [STAGE6_PHASE1.md](./STAGE6_PHASE1.md)
2. Review logs: `tail -f logs/combined.log`
3. Run tests: `npm test`
4. Open GitHub issue

---

**Current Version**: 6.0.0  
**Last Updated**: 2026-02-18  
**Status**: Phase 1 Foundation Complete  

🚀 **Ready for Phase 2: Predictive Analytics & Dashboard**Server will start on `http://localhost:3000`

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
