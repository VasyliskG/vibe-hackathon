# 🚀 Stage 4 - Quick Start Guide

## ✅ What's Been Implemented

Stage 4 is **100% complete** with all required features:

1. ✅ **REST API** - Express.js with 20+ endpoints
2. ✅ **Order Lifecycle** - 6 statuses with validation
3. ✅ **JSON Persistence** - Auto-save to data/
4. ✅ **Winston Logging** - Structured logs to files
5. ✅ **Health & Metrics** - Real-time monitoring
6. ✅ **ENV Configuration** - .env file support
7. ✅ **Automated Tests** - Jest unit + integration tests
8. ✅ **Error Handling** - Global middleware
9. ✅ **Input Validation** - express-validator

## 🎯 How to Use

### 1. Start the Server

```bash
cd /home/g/Prog_Project/VS_Code/vibe-hackathon
npm start
```

Server will run on **http://localhost:3000**

### 2. Test the API

```bash
# Quick test
./test-api.sh

# Or manual tests
curl http://localhost:3000/api/system/health
curl http://localhost:3000/api/couriers
curl http://localhost:3000/api/orders
```

### 3. Create an Order

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "id": "order-001",
    "restaurantX": 10,
    "restaurantY": 20,
    "weight": 5
  }'
```

### 4. Auto-Assign Orders

```bash
curl -X POST http://localhost:3000/api/system/auto-assign
```

### 5. Check System Metrics

```bash
curl http://localhost:3000/api/system/metrics | jq .
```

## 📊 Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Service info |
| GET | `/api/system/health` | Health check |
| GET | `/api/system/metrics` | System metrics |
| GET | `/api/orders` | List all orders |
| POST | `/api/orders` | Create order |
| GET | `/api/couriers` | List couriers |
| POST | `/api/system/auto-assign` | Auto-assign orders |

## 📁 Important Files

- **server.js** - Main entry point
- **.env** - Configuration
- **data/** - JSON storage
- **logs/** - Winston logs
- **test/** - Unit & integration tests
- **STAGE4_SUMMARY.md** - Full implementation details

## 🧪 Running Tests

```bash
# All tests
npm test

# Watch mode
npm run test:watch

# With coverage
npm test -- --coverage
```

## 📝 Configuration

Edit `.env` file:

```env
PORT=3000
NODE_ENV=development
LOG_LEVEL=info
USE_PATHFINDING=true
MAP_SIZE=100
DATA_DIR=./data
```

## 🔍 Monitoring

- **Logs**: Check `logs/combined.log` and `logs/error.log`
- **Health**: `GET /api/system/health`
- **Metrics**: `GET /api/system/metrics`
- **Queue**: `GET /api/orders/queue`

## 🎉 What's Next?

Stage 4 is complete! You can now:

1. **Deploy to production** - All features ready
2. **Add more couriers** - POST /api/couriers
3. **Create orders** - POST /api/orders
4. **Monitor system** - GET /api/system/metrics
5. **Run tests** - npm test

## 🆘 Troubleshooting

### Server won't start
```bash
# Kill existing process
lsof -ti:3000 | xargs kill -9

# Restart
npm start
```

### Data issues
```bash
# Reset all data
curl -X POST http://localhost:3000/api/system/reset
```

### Check logs
```bash
tail -f logs/combined.log
tail -f logs/error.log
```

## 📚 Documentation

- **README.md** - Full documentation
- **STAGE4_SUMMARY.md** - Implementation summary
- **API Docs** - See README.md

## ✨ Success!

Stage 4 is **production-ready** and fully operational! 🎊

All 9 requirements are implemented and tested. The system is ready for real-world use.

---

**Built with ❤️ for Vibe Hackathon**

