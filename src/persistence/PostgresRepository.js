/**
 * PostgresRepository - PostgreSQL implementation of DatabaseAdapter
 * Uses Sequelize ORM for database operations
 */

const DatabaseAdapter = require('./DatabaseAdapter');
const logger = require('../utils/logger');

class PostgresRepository extends DatabaseAdapter {
  constructor(sequelize, models) {
    super();
    this.sequelize = sequelize;
    this.models = models;
  }

  async initialize() {
    try {
      await this.sequelize.authenticate();
      logger.info('PostgreSQL connection established successfully');

      // Sync models (in production, use migrations instead)
      // await this.sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    } catch (error) {
      logger.error('PostgreSQL connection failed:', error);
      throw error;
    }
  }

  async close() {
    await this.sequelize.close();
    logger.info('PostgreSQL connection closed');
  }

  // ============ ORDERS ============
  async getOrderById(orderId) {
    return this.models.Order.findByPk(orderId);
  }

  async getAllOrders(filters = {}) {
    const where = {};
    if (filters.status) where.status = filters.status;
    if (filters.zone_id) where.assigned_zone_id = filters.zone_id;
    if (filters.courier_id) where.assigned_courier_id = filters.courier_id;
    if (filters.priority) where.priority = filters.priority;

    return this.models.Order.findAll({
      where,
      limit: filters.limit || 100,
      offset: filters.offset || 0,
      order: [['created_at', 'DESC']]
    });
  }

  async createOrder(orderData) {
    return this.models.Order.create(orderData);
  }

  async updateOrder(orderId, updateData) {
    const order = await this.models.Order.findByPk(orderId);
    if (!order) throw new Error(`Order ${orderId} not found`);
    return order.update(updateData);
  }

  async deleteOrder(orderId) {
    return this.models.Order.destroy({ where: { id: orderId } });
  }

  async getOrdersByStatus(status) {
    return this.models.Order.findAll({
      where: { status },
      order: [['created_at', 'DESC']]
    });
  }

  async getOrdersByZone(zoneId) {
    return this.models.Order.findAll({
      where: { assigned_zone_id: zoneId },
      order: [['created_at', 'DESC']]
    });
  }

  // ============ COURIERS ============
  async getCourierById(courierId) {
    return this.models.Courier.findByPk(courierId);
  }

  async getAllCouriers(filters = {}) {
    const where = {};
    if (filters.status) where.status = filters.status;
    if (filters.zone_id) where.current_zone_id = filters.zone_id;
    if (filters.transport_type) where.transport_type = filters.transport_type;

    return this.models.Courier.findAll({
      where,
      limit: filters.limit || 100,
      offset: filters.offset || 0,
      order: [['created_at', 'DESC']]
    });
  }

  async createCourier(courierData) {
    return this.models.Courier.create(courierData);
  }

  async updateCourier(courierId, updateData) {
    const courier = await this.models.Courier.findByPk(courierId);
    if (!courier) throw new Error(`Courier ${courierId} not found`);
    return courier.update(updateData);
  }

  async deleteCourier(courierId) {
    return this.models.Courier.destroy({ where: { id: courierId } });
  }

  async getCouriersByZone(zoneId) {
    return this.models.Courier.findAll({
      where: { current_zone_id: zoneId }
    });
  }

  async getCouriersByStatus(status) {
    return this.models.Courier.findAll({
      where: { status },
      order: [['created_at', 'DESC']]
    });
  }

  // ============ ZONES ============
  async getZoneById(zoneId) {
    return this.models.Zone.findByPk(zoneId);
  }

  async getAllZones() {
    return this.models.Zone.findAll({
      where: { status: 'active' },
      order: [['created_at', 'ASC']]
    });
  }

  async createZone(zoneData) {
    return this.models.Zone.create(zoneData);
  }

  async updateZone(zoneId, updateData) {
    const zone = await this.models.Zone.findByPk(zoneId);
    if (!zone) throw new Error(`Zone ${zoneId} not found`);
    return zone.update(updateData);
  }

  async deleteZone(zoneId) {
    return this.models.Zone.destroy({ where: { id: zoneId } });
  }

  async getZoneByLocation(lat, lon) {
    // Simple JSONB contains check
    // For PostGIS: use ST_DWithin or ST_Contains
    const zones = await this.sequelize.query(`
      SELECT * FROM zones 
      WHERE bounds->>'lat_min' <= :lat 
        AND bounds->>'lat_max' >= :lat
        AND bounds->>'lon_min' <= :lon 
        AND bounds->>'lon_max' >= :lon
      AND status = 'active'
      LIMIT 1
    `, {
      replacements: { lat, lon },
      type: this.sequelize.QueryTypes.SELECT
    });

    return zones.length > 0 ? zones[0] : null;
  }

  async updateZoneLoad(zoneId, load) {
    return this.sequelize.query(
      'UPDATE zones SET current_load = :load, updated_at = NOW() WHERE id = :zoneId',
      {
        replacements: { load, zoneId },
        type: this.sequelize.QueryTypes.UPDATE
      }
    );
  }

  // ============ DELIVERY HISTORY ============
  async createDeliveryEvent(eventData) {
    return this.models.DeliveryHistory.create(eventData);
  }

  async getDeliveryHistory(orderId) {
    return this.models.DeliveryHistory.findAll({
      where: { order_id: orderId },
      order: [['created_at', 'ASC']]
    });
  }

  async getDeliveryEventsByZone(zoneId, startTime, endTime) {
    return this.models.DeliveryHistory.findAll({
      where: {
        zone_id: zoneId,
        created_at: {
          [this.sequelize.Sequelize.Op.between]: [startTime, endTime]
        }
      },
      order: [['created_at', 'DESC']]
    });
  }

  async getDeliveryEventsByCourier(courierId, startTime, endTime) {
    return this.models.DeliveryHistory.findAll({
      where: {
        courier_id: courierId,
        created_at: {
          [this.sequelize.Sequelize.Op.between]: [startTime, endTime]
        }
      },
      order: [['created_at', 'DESC']]
    });
  }

  // ============ METRICS ============
  async saveMetricsSnapshot(metricData) {
    return this.models.MetricsSnapshot.create(metricData);
  }

  async getMetrics(metricKey, startTime, endTime, filters = {}) {
    const where = {
      metric_key: metricKey,
      time_bucket: {
        [this.sequelize.Sequelize.Op.between]: [startTime, endTime]
      }
    };

    if (filters.zone_id) where.zone_id = filters.zone_id;
    if (filters.courier_id) where.courier_id = filters.courier_id;

    return this.models.MetricsSnapshot.findAll({
      where,
      order: [['time_bucket', 'ASC']],
      limit: filters.limit || 1000
    });
  }

  async getAggregatedMetrics(metricKey, granularity = 'hour', filters = {}) {
    // PostgreSQL date_trunc for time-based aggregation
    const timeTrunc = `DATE_TRUNC('${granularity}', time_bucket)`;

    let query = `
      SELECT 
        ${timeTrunc} as time_period,
        AVG(metric_value) as avg_value,
        MAX(metric_value) as max_value,
        MIN(metric_value) as min_value,
        COUNT(*) as count
      FROM metrics_snapshots
      WHERE metric_key = :metricKey
    `;

    const replacements = { metricKey };

    if (filters.zone_id) {
      query += ' AND zone_id = :zone_id';
      replacements.zone_id = filters.zone_id;
    }

    query += ` GROUP BY ${timeTrunc} ORDER BY time_period ASC`;

    return this.sequelize.query(query, {
      replacements,
      type: this.sequelize.QueryTypes.SELECT
    });
  }

  // ============ ROUTES ============
  async createRoute(routeData) {
    return this.models.Route.create(routeData);
  }

  async getRouteByCourier(courierId) {
    return this.models.Route.findOne({
      where: {
        courier_id: courierId,
        status: { [this.sequelize.Sequelize.Op.in]: ['pending', 'in_progress'] }
      }
    });
  }

  async updateRoute(routeId, updateData) {
    const route = await this.models.Route.findByPk(routeId);
    if (!route) throw new Error(`Route ${routeId} not found`);
    return route.update(updateData);
  }

  // ============ AUDIT LOGS ============
  async logAuditEvent(auditData) {
    return this.models.AuditLog.create(auditData);
  }

  async getAuditLogs(filters = {}) {
    const where = {};
    if (filters.user_id) where.user_id = filters.user_id;
    if (filters.action) where.action = filters.action;
    if (filters.resource_type) where.resource_type = filters.resource_type;

    return this.models.AuditLog.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: filters.limit || 500
    });
  }

  // ============ PREDICTIONS ============
  async savePrediction(predictionData) {
    return this.models.Prediction.create(predictionData);
  }

  async getPredictions(type, filters = {}) {
    const where = { prediction_type: type };
    if (filters.zone_id) where.zone_id = filters.zone_id;

    return this.models.Prediction.findAll({
      where,
      order: [['time_bucket', 'DESC']],
      limit: filters.limit || 100
    });
  }

  // ============ TRANSACTIONS ============
  async beginTransaction() {
    return this.sequelize.transaction();
  }

  async commitTransaction(transaction) {
    return transaction.commit();
  }

  async rollbackTransaction(transaction) {
    return transaction.rollback();
  }

  // ============ UTILITIES ============
  async healthCheck() {
    try {
      await this.sequelize.authenticate();
      return { status: 'connected', timestamp: new Date() };
    } catch (error) {
      return { status: 'disconnected', error: error.message };
    }
  }

  async resetDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot reset database in production');
    }

    // Drop and recreate all tables
    await this.sequelize.truncate({ cascade: true });
    logger.warn('Database reset completed');
  }
}

module.exports = PostgresRepository;

