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
  }
};

// Validation
if (config.distanceThreshold < 0) {
  throw new Error('DISTANCE_THRESHOLD must be non-negative');
}

if (config.mapSize < 10 || config.mapSize > 1000) {
  throw new Error('MAP_SIZE must be between 10 and 1000');
}

module.exports = config;