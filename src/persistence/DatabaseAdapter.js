/**
 * DatabaseAdapter - Abstract layer for persistence
 * Supports both JSON (legacy) and PostgreSQL backends
 * Allows gradual migration without breaking existing code
 */

class DatabaseAdapter {
  /**
   * Initialize connection
   */
  async initialize() {
    throw new Error('initialize() must be implemented');
  }

  /**
   * Close connection
   */
  async close() {
    throw new Error('close() must be implemented');
  }

  // ============ ORDERS ============
  async getOrderById(orderId) {
    throw new Error('getOrderById() must be implemented');
  }

  async getAllOrders(filters = {}) {
    throw new Error('getAllOrders() must be implemented');
  }

  async createOrder(orderData) {
    throw new Error('createOrder() must be implemented');
  }

  async updateOrder(orderId, updateData) {
    throw new Error('updateOrder() must be implemented');
  }

  async deleteOrder(orderId) {
    throw new Error('deleteOrder() must be implemented');
  }

  async getOrdersByStatus(status) {
    throw new Error('getOrdersByStatus() must be implemented');
  }

  async getOrdersByZone(zoneId) {
    throw new Error('getOrdersByZone() must be implemented');
  }

  // ============ COURIERS ============
  async getCourierById(courierId) {
    throw new Error('getCourierById() must be implemented');
  }

  async getAllCouriers(filters = {}) {
    throw new Error('getAllCouriers() must be implemented');
  }

  async createCourier(courierData) {
    throw new Error('createCourier() must be implemented');
  }

  async updateCourier(courierId, updateData) {
    throw new Error('updateCourier() must be implemented');
  }

  async deleteCourier(courierId) {
    throw new Error('deleteCourier() must be implemented');
  }

  async getCouriersByZone(zoneId) {
    throw new Error('getCouriersByZone() must be implemented');
  }

  async getCouriersByStatus(status) {
    throw new Error('getCouriersByStatus() must be implemented');
  }

  // ============ ZONES ============
  async getZoneById(zoneId) {
    throw new Error('getZoneById() must be implemented');
  }

  async getAllZones() {
    throw new Error('getAllZones() must be implemented');
  }

  async createZone(zoneData) {
    throw new Error('createZone() must be implemented');
  }

  async updateZone(zoneId, updateData) {
    throw new Error('updateZone() must be implemented');
  }

  async deleteZone(zoneId) {
    throw new Error('deleteZone() must be implemented');
  }

  async getZoneByLocation(lat, lon) {
    throw new Error('getZoneByLocation() must be implemented');
  }

  async updateZoneLoad(zoneId, load) {
    throw new Error('updateZoneLoad() must be implemented');
  }

  // ============ DELIVERY HISTORY ============
  async createDeliveryEvent(eventData) {
    throw new Error('createDeliveryEvent() must be implemented');
  }

  async getDeliveryHistory(orderId) {
    throw new Error('getDeliveryHistory() must be implemented');
  }

  async getDeliveryEventsByZone(zoneId, startTime, endTime) {
    throw new Error('getDeliveryEventsByZone() must be implemented');
  }

  async getDeliveryEventsByCourier(courierId, startTime, endTime) {
    throw new Error('getDeliveryEventsByCourier() must be implemented');
  }

  // ============ METRICS ============
  async saveMetricsSnapshot(metricData) {
    throw new Error('saveMetricsSnapshot() must be implemented');
  }

  async getMetrics(metricKey, startTime, endTime, filters = {}) {
    throw new Error('getMetrics() must be implemented');
  }

  async getAggregatedMetrics(metricKey, granularity, filters = {}) {
    throw new Error('getAggregatedMetrics() must be implemented');
  }

  // ============ ROUTES ============
  async createRoute(routeData) {
    throw new Error('createRoute() must be implemented');
  }

  async getRouteByCourier(courierId) {
    throw new Error('getRouteByCourier() must be implemented');
  }

  async updateRoute(routeId, updateData) {
    throw new Error('updateRoute() must be implemented');
  }

  // ============ AUDIT LOGS ============
  async logAuditEvent(auditData) {
    throw new Error('logAuditEvent() must be implemented');
  }

  async getAuditLogs(filters = {}) {
    throw new Error('getAuditLogs() must be implemented');
  }

  // ============ PREDICTIONS ============
  async savePrediction(predictionData) {
    throw new Error('savePrediction() must be implemented');
  }

  async getPredictions(type, filters = {}) {
    throw new Error('getPredictions() must be implemented');
  }

  // ============ TRANSACTIONS ============
  async beginTransaction() {
    throw new Error('beginTransaction() must be implemented');
  }

  async commitTransaction(transaction) {
    throw new Error('commitTransaction() must be implemented');
  }

  async rollbackTransaction(transaction) {
    throw new Error('rollbackTransaction() must be implemented');
  }

  // ============ UTILITIES ============
  async healthCheck() {
    throw new Error('healthCheck() must be implemented');
  }

  async resetDatabase() {
    throw new Error('resetDatabase() must be implemented');
  }
}

module.exports = DatabaseAdapter;

