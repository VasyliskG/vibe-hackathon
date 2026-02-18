const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const config = require('./src/config/env');
const logger = require('./src/utils/logger');
const requestLogger = require('./src/api/middleware/requestLogger');
const { errorHandler, notFoundHandler } = require('./src/api/middleware/errorHandler');
const http = require('http');
const rateLimit = require('express-rate-limit');

// Routes
const orderRoutes = require('./src/api/routes/orderRoutes');
const courierRoutes = require('./src/api/routes/courierRoutes');
const systemRoutes = require('./src/api/routes/systemRoutes');
const simulationRoutes = require('./src/api/routes/simulationRoutes');

// Services
const DataService = require('./src/services/DataService');
const QueueManager = require('./src/services/QueueManager');
const AssignmentService = require('./src/services/AssignmentService');
const MapGenerator = require('./src/services/MapGenerator');
const MetricsService = require('./src/services/MetricsService');
const SlaMonitor = require('./src/services/SlaMonitor');
const { createWebSocketServer } = require('./src/realtime/websocket');
const Map = require('./src/domain/Map');
const Location = require('./src/domain/Location');
const { Courier, CourierStatus } = require('./src/domain/Courier');
const eventBus = require('./src/realtime/eventBus/EventBus');

// Initialize Express
const app = express();

// Security & Performance Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      scriptSrcElem: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"]
    }
  }
}));
app.use(compression());
app.use(cors({ origin: config.corsOrigin }));
app.use(rateLimit(config.rateLimit));

// Static dashboard
app.use(express.static('public'));

// Body Parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Logging
app.use(requestLogger);

// Initialize Services
const dataService = new DataService(config.dataDir);
const queueManager = new QueueManager();
let assignmentService;
let cityMap;

const metricsService = new MetricsService(config.metricsWindowMs);
app.locals.metrics = metricsService;
app.locals.config = config;

// Store services in app.locals for access in controllers
app.locals.dataService = dataService;
app.locals.queueManager = queueManager;

// Initialize System
async function initializeSystem() {
  try {
    logger.info('🚀 Initializing Delivery System...');

    // Initialize data directory
    await dataService.init();

    // Load or generate map
    const mapData = await dataService.loadMap();
    if (mapData) {
      logger.info('📂 Loading existing map...');
      cityMap = Map.fromJSON(mapData);
      logger.info(`✅ Map loaded: ${cityMap.countWalkable()} walkable cells`);
    } else {
      logger.info('🔨 Generating new city map...');
      const startTime = Date.now();
      cityMap = MapGenerator.generateBest(config.mapSize, config.wallProbability, 3);
      const endTime = Date.now();
      logger.info(`✅ Map generated in ${endTime - startTime}ms`);
      logger.info(`   Walkable cells: ${cityMap.countWalkable()}/${config.mapSize * config.mapSize}`);
      await dataService.saveMap(cityMap);
    }

    app.locals.cityMap = cityMap;

    // Load existing couriers or create defaults
    const couriersData = await dataService.loadCouriers();
    let couriers = [];

    if (couriersData.length > 0) {
      logger.info(`📦 Loading ${couriersData.length} couriers from storage...`);
      couriers = couriersData.map(data => {
        const courier = new Courier(
          data.id,
          new Location(data.coordinates.x, data.coordinates.y),
          data.transportType,
          data.status
        );
        courier._completedOrdersToday = data.completedOrdersToday || 0;
        courier._currentOrderId = data.currentOrderId || null;
        return courier;
      });
    } else {
      logger.info('👥 Creating default couriers...');
      const getRandomWalkableLocation = () => {
        const walkableCells = cityMap.getWalkableCells();
        const randomCell = walkableCells[Math.floor(Math.random() * walkableCells.length)];
        return new Location(randomCell.x, randomCell.y);
      };

      couriers = [
        new Courier('courier-1', getRandomWalkableLocation(), 'walker', CourierStatus.FREE),
        new Courier('courier-2', getRandomWalkableLocation(), 'bicycle', CourierStatus.FREE),
        new Courier('courier-3', getRandomWalkableLocation(), 'bicycle', CourierStatus.FREE),
        new Courier('courier-4', getRandomWalkableLocation(), 'scooter', CourierStatus.FREE),
        new Courier('courier-5', getRandomWalkableLocation(), 'car', CourierStatus.FREE),
      ];

      await dataService.saveCouriers(couriers);
    }

    app.locals.couriers = couriers;
    logger.info(`✅ ${couriers.length} couriers ready`);

    // Initialize AssignmentService
    assignmentService = new AssignmentService(couriers, cityMap, config.usePathfinding);
    app.locals.assignmentService = assignmentService;

    // Load existing orders
    const ordersData = await dataService.loadOrders();
    if (ordersData.length > 0) {
      logger.info(`📦 Loading ${ordersData.length} orders from storage...`);
      const { Order } = require('./src/domain/Order');
      const orders = ordersData.map(data => Order.fromJSON(data));

      // Add pending orders to queue
      orders.filter(o => o.status === 'pending').forEach(order => {
        queueManager.addOrder(order);
      });

      app.locals.orders = orders;
      logger.info(`✅ ${orders.length} orders loaded, ${queueManager.getQueueSize()} in queue`);
    } else {
      app.locals.orders = [];
      logger.info('✅ No existing orders');
    }

    logger.info('✨ System initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize system', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

app.init = initializeSystem;

// API Routes
app.use('/api/orders', orderRoutes);
app.use('/api/couriers', courierRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/simulation', simulationRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Vibe Delivery System',
    stage: '5 - Realtime Dispatch',
    version: '5.0.0',
    status: 'running',
    endpoints: {
      orders: '/api/orders',
      couriers: '/api/couriers',
      system: '/api/system',
      simulation: '/api/simulation'
    }
  });
});

// Error Handlers (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Start Server
async function startServer() {
  await initializeSystem();

  eventBus.subscribe('ORDER_CREATED', event => metricsService.recordEvent(event.type, event.timestamp));
  eventBus.subscribe('ORDER_ASSIGNED', event => metricsService.recordEvent(event.type, event.timestamp));
  eventBus.subscribe('ORDER_COMPLETED', event => metricsService.recordEvent(event.type, event.timestamp));
  eventBus.subscribe('ORDER_CANCELLED', event => metricsService.recordEvent(event.type, event.timestamp));
  eventBus.subscribe('ORDER_QUEUED', event => metricsService.recordEvent(event.type, event.timestamp));
  eventBus.subscribe('COURIER_STATUS_CHANGED', event => metricsService.recordEvent(event.type, event.timestamp));
  eventBus.subscribe('QUEUE_UPDATED', event => metricsService.recordEvent(event.type, event.timestamp));
  eventBus.subscribe('SLA_VIOLATION', event => metricsService.recordEvent(event.type, event.timestamp));

  const httpServer = http.createServer(app);
  const io = createWebSocketServer(httpServer, app);

  io.on('connection', () => {
    metricsService.setWsConnections(io.engine.clientsCount);
  });

  io.on('disconnect', () => {
    metricsService.setWsConnections(io.engine.clientsCount);
  });

  const slaMonitor = new SlaMonitor({
    queueManager,
    ordersProvider: () => app.locals.orders || [],
    config,
    metrics: metricsService
  });
  slaMonitor.start();

  const server = httpServer.listen(config.port, () => {
    logger.info(`🚀 Server running on port ${config.port}`);
    logger.info(`📊 Environment: ${config.nodeEnv}`);
    logger.info(`📝 Log level: ${config.logLevel}`);
    logger.info(`🗺️  Pathfinding: ${config.usePathfinding ? 'enabled' : 'disabled'}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully...');
    slaMonitor.stop();
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully...');
    slaMonitor.stop();
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  });
}

// Start if running directly
if (require.main === module) {
  startServer().catch(error => {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  });
}

module.exports = app;

