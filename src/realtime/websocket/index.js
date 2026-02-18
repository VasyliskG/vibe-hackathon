const { Server } = require('socket.io');
const config = require('../../config/env');
const eventBus = require('../eventBus/EventBus');
const logger = require('../../utils/logger');
const { socketAuthMiddleware, ROLES } = require('./auth');

const ROOMS = {
  ADMIN: 'role:admin',
  OPERATOR: 'role:operator',
  COURIER: 'role:courier'
};

function createWebSocketServer(httpServer, app) {
  const io = new Server(httpServer, {
    path: config.wsPath,
    pingInterval: config.wsPingInterval,
    pingTimeout: config.wsPingTimeout,
    cors: {
      origin: config.corsOrigin
    }
  });

  io.use(socketAuthMiddleware);

  io.on('connection', socket => {
    const { role, courierId } = socket.user;

    if (role === ROLES.ADMIN) {
      socket.join(ROOMS.ADMIN);
    }

    if (role === ROLES.OPERATOR || role === ROLES.ADMIN) {
      socket.join(ROOMS.OPERATOR);
    }

    if (role === ROLES.COURIER) {
      socket.join(ROOMS.COURIER);
      if (courierId) {
        socket.join(`courier:${courierId}`);
      }
    }

    const initialState = {
      orders: (app.locals.orders || []).map(o => o.toJSON()),
      couriers: (app.locals.couriers || []).map(c => c.toJSON()),
      queue: (app.locals.queueManager && app.locals.queueManager.getQueue().map(o => o.toJSON())) || [],
      metrics: app.locals.metrics ? app.locals.metrics.getSnapshot() : {}
    };

    socket.emit('initial_state', initialState);

    socket.on('disconnect', () => {
      logger.info('WebSocket disconnected', { socketId: socket.id });
    });
  });

  const broadcast = event => {
    const payload = {
      type: event.type,
      data: event.data || {},
      timestamp: event.timestamp
    };

    io.to(ROOMS.ADMIN).emit('event', payload);
    io.to(ROOMS.OPERATOR).emit('event', payload);

    if (event.type === 'COURIER_STATUS_CHANGED' && event.data && event.data.courierId) {
      io.to(`courier:${event.data.courierId}`).emit('event', payload);
    }

    if (event.type === 'ORDER_ASSIGNED' && event.data && event.data.courierId) {
      io.to(`courier:${event.data.courierId}`).emit('event', payload);
    }
  };

  eventBus.subscribe('ORDER_CREATED', broadcast);
  eventBus.subscribe('ORDER_ASSIGNED', broadcast);
  eventBus.subscribe('ORDER_COMPLETED', broadcast);
  eventBus.subscribe('ORDER_CANCELLED', broadcast);
  eventBus.subscribe('ORDER_QUEUED', broadcast);
  eventBus.subscribe('COURIER_STATUS_CHANGED', broadcast);
  eventBus.subscribe('QUEUE_UPDATED', broadcast);
  eventBus.subscribe('SLA_VIOLATION', broadcast);

  return io;
}

module.exports = {
  createWebSocketServer,
  ROOMS
};
