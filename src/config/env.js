require('dotenv').config();

const config = {
  // Server
  port: parseInt(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',

  // Assignment
  distanceThreshold: parseFloat(process.env.DISTANCE_THRESHOLD) || 1.0,
  usePathfinding: process.env.USE_PATHFINDING !== 'false',

  // Map
  mapSize: parseInt(process.env.MAP_SIZE) || 100,
  wallProbability: parseFloat(process.env.WALL_PROBABILITY) || 0.3,

  // Data
  dataDir: process.env.DATA_DIR || './data',

  // CORS
  corsOrigin: process.env.CORS_ORIGIN || '*',

  // Rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100
  },

  // Auth
  jwtSecret: process.env.JWT_SECRET || 'change-me',
  jwtIssuer: process.env.JWT_ISSUER || 'vibe-dispatch',
  jwtAudience: process.env.JWT_AUDIENCE || 'vibe-clients',

  // WebSocket
  wsPath: process.env.WS_PATH || '/ws',
  wsPingInterval: parseInt(process.env.WS_PING_INTERVAL_MS) || 25000,
  wsPingTimeout: parseInt(process.env.WS_PING_TIMEOUT_MS) || 5000,

  // SLA thresholds (ms)
  slaQueueWaitMs: parseInt(process.env.SLA_QUEUE_WAIT_MS) || 10 * 60 * 1000,
  slaDeliveryMs: parseInt(process.env.SLA_DELIVERY_MS) || 45 * 60 * 1000,
  slaLoadImbalanceRatio: parseFloat(process.env.SLA_LOAD_IMBALANCE_RATIO) || 2.5,

  // Simulation
  simulationMaxOrders: parseInt(process.env.SIM_MAX_ORDERS) || 10000,
  simulationMaxCouriers: parseInt(process.env.SIM_MAX_COURIERS) || 500,

  // Metrics
  metricsWindowMs: parseInt(process.env.METRICS_WINDOW_MS) || 60 * 1000
};

// Validation
if (config.distanceThreshold < 0) {
  throw new Error('DISTANCE_THRESHOLD must be non-negative');
}

if (config.mapSize < 10 || config.mapSize > 1000) {
  throw new Error('MAP_SIZE must be between 10 and 1000');
}

if (!config.jwtSecret || config.jwtSecret === 'change-me') {
  console.warn('⚠️  JWT_SECRET is not set. Set it in .env for production.');
}

if (config.slaQueueWaitMs < 0 || config.slaDeliveryMs < 0) {
  throw new Error('SLA thresholds must be non-negative');
}

module.exports = config;