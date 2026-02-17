const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

/**
 * DataService — JSON-based persistence
 */
class DataService {
  constructor(dataDir = './data') {
    this._dataDir = dataDir;
    this._ordersFile = path.join(dataDir, 'orders.json');
    this._couriersFile = path.join(dataDir, 'couriers.json');
    this._mapFile = path.join(dataDir, 'city-map.json');
  }

  async init() {
    try {
      await fs.mkdir(this._dataDir, { recursive: true });
      logger.info('Data directory initialized', { dir: this._dataDir });
    } catch (error) {
      logger.error('Failed to initialize data directory', { error: error.message });
      throw error;
    }
  }

  async saveOrders(orders) {
    try {
      const data = orders.map(o => o.toJSON());
      await fs.writeFile(this._ordersFile, JSON.stringify(data, null, 2));
      logger.info('Orders saved', { count: orders.length });
    } catch (error) {
      logger.error('Failed to save orders', { error: error.message });
      throw error;
    }
  }

  async loadOrders() {
    try {
      const data = await fs.readFile(this._ordersFile, 'utf-8');
      const json = JSON.parse(data);
      logger.info('Orders loaded', { count: json.length });
      return json;
    } catch (error) {
      if (error.code === 'ENOENT') {
        logger.info('No orders file found, returning empty array');
        return [];
      }
      logger.error('Failed to load orders', { error: error.message });
      throw error;
    }
  }

  async saveCouriers(couriers) {
    try {
      const data = couriers.map(c => c.toJSON());
      await fs.writeFile(this._couriersFile, JSON.stringify(data, null, 2));
      logger.info('Couriers saved', { count: couriers.length });
    } catch (error) {
      logger.error('Failed to save couriers', { error: error.message });
      throw error;
    }
  }

  async loadCouriers() {
    try {
      const data = await fs.readFile(this._couriersFile, 'utf-8');
      const json = JSON.parse(data);
      logger.info('Couriers loaded', { count: json.length });
      return json;
    } catch (error) {
      if (error.code === 'ENOENT') {
        logger.info('No couriers file found, returning empty array');
        return [];
      }
      logger.error('Failed to load couriers', { error: error.message });
      throw error;
    }
  }

  async saveMap(map) {
    try {
      const data = map.toJSON();
      await fs.writeFile(this._mapFile, JSON.stringify(data, null, 2));
      logger.info('Map saved');
    } catch (error) {
      logger.error('Failed to save map', { error: error.message });
      throw error;
    }
  }

  async loadMap() {
    try {
      const data = await fs.readFile(this._mapFile, 'utf-8');
      const json = JSON.parse(data);
      logger.info('Map loaded');
      return json;
    } catch (error) {
      if (error.code === 'ENOENT') {
        logger.info('No map file found');
        return null;
      }
      logger.error('Failed to load map', { error: error.message });
      throw error;
    }
  }
}

module.exports = DataService;