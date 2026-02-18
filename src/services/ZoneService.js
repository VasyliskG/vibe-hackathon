/**
 * ZoneService - Manages territory zones
 * Features:
 * - Zone CRUD operations
 * - Geographic location to zone mapping
 * - Load balancing across zones
 * - Zone rebalancing logic
 */

const logger = require('../utils/logger');
const DistanceCalculator = require('../utils/DistanceCalculator');

class ZoneService {
  constructor(databaseAdapter) {
    this.db = databaseAdapter;
    this.distanceCalculator = new DistanceCalculator();
    this.loadThresholdWarning = 0.75; // 75% capacity
    this.loadThresholdCritical = 0.9; // 90% capacity
  }

  /**
   * Create a new zone
   */
  async createZone(zoneName, bounds, capacity = 100) {
    try {
      if (!bounds || !bounds.lat_min || !bounds.lat_max || !bounds.lon_min || !bounds.lon_max) {
        throw new Error('Invalid zone bounds');
      }

      const zone = await this.db.createZone({
        name: zoneName,
        bounds: JSON.stringify(bounds),
        capacity,
        current_load: 0,
        status: 'active'
      });

      logger.info(`Zone created: ${zoneName} (ID: ${zone.id})`);
      return zone;
    } catch (error) {
      logger.error('Error creating zone:', error);
      throw error;
    }
  }

  /**
   * Get all zones
   */
  async getAllZones() {
    try {
      const zones = await this.db.getAllZones();
      return zones.map(z => this._enrichZone(z));
    } catch (error) {
      logger.error('Error getting all zones:', error);
      throw error;
    }
  }

  /**
   * Get zone by ID
   */
  async getZoneById(zoneId) {
    try {
      const zone = await this.db.getZoneById(zoneId);
      return zone ? this._enrichZone(zone) : null;
    } catch (error) {
      logger.error('Error getting zone:', error);
      throw error;
    }
  }

  /**
   * Find zone containing a location
   */
  async getZoneByLocation(lat, lon) {
    try {
      const zone = await this.db.getZoneByLocation(lat, lon);
      return zone ? this._enrichZone(zone) : null;
    } catch (error) {
      logger.error('Error finding zone by location:', error);
      throw error;
    }
  }

  /**
   * Assign order to appropriate zone based on location
   */
  async assignOrderToZone(order) {
    try {
      // Use receiver location for zone assignment
      const { latitude: lat, longitude: lon } = order.receiver_location;
      const zone = await this.getZoneByLocation(lat, lon);

      if (!zone) {
        logger.warn(`No zone found for order ${order.id} at location (${lat}, ${lon})`);
        return null;
      }

      return zone;
    } catch (error) {
      logger.error('Error assigning order to zone:', error);
      throw error;
    }
  }

  /**
   * Get couriers in a specific zone
   */
  async getCouriersInZone(zoneId) {
    try {
      return await this.db.getCouriersByZone(zoneId);
    } catch (error) {
      logger.error('Error getting couriers in zone:', error);
      throw error;
    }
  }

  /**
   * Get orders in a specific zone
   */
  async getOrdersInZone(zoneId) {
    try {
      return await this.db.getOrdersByZone(zoneId);
    } catch (error) {
      logger.error('Error getting orders in zone:', error);
      throw error;
    }
  }

  /**
   * Update zone load
   */
  async updateZoneLoad(zoneId, newLoad) {
    try {
      const zone = await this.getZoneById(zoneId);
      if (!zone) throw new Error(`Zone ${zoneId} not found`);

      await this.db.updateZoneLoad(zoneId, newLoad);
      zone.current_load = newLoad;

      // Log warnings if overloaded
      const loadPercentage = (newLoad / zone.capacity) * 100;
      if (loadPercentage >= 100) {
        logger.warn(`Zone ${zoneId} is OVERLOADED (${loadPercentage.toFixed(1)}%)`);
      } else if (loadPercentage >= (this.loadThresholdCritical * 100)) {
        logger.warn(`Zone ${zoneId} is CRITICAL (${loadPercentage.toFixed(1)}%)`);
      } else if (loadPercentage >= (this.loadThresholdWarning * 100)) {
        logger.info(`Zone ${zoneId} is WARNING (${loadPercentage.toFixed(1)}%)`);
      }

      return zone;
    } catch (error) {
      logger.error('Error updating zone load:', error);
      throw error;
    }
  }

  /**
   * Calculate zone load (count of orders + couriers currently assigned)
   */
  async calculateZoneLoad(zoneId) {
    try {
      const orders = await this.getOrdersInZone(zoneId);
      const activeOrders = orders.filter(o =>
        o.status !== 'delivered' && o.status !== 'failed' && o.status !== 'cancelled'
      ).length;

      const couriers = await this.getCouriersInZone(zoneId);
      const activeCouriers = couriers.filter(c => c.status !== 'offline').length;

      // Load calculation: consider both orders and couriers
      const load = activeOrders + Math.ceil(activeCouriers * 0.5);

      return {
        zoneId,
        activeOrders,
        activeCouriers,
        calculatedLoad: load
      };
    } catch (error) {
      logger.error('Error calculating zone load:', error);
      throw error;
    }
  }

  /**
   * Get zone health report
   */
  async getZoneHealthReport(zoneId) {
    try {
      const zone = await this.getZoneById(zoneId);
      if (!zone) throw new Error(`Zone ${zoneId} not found`);

      const loadReport = await this.calculateZoneLoad(zoneId);
      const loadPercentage = (zone.current_load / zone.capacity) * 100;

      return {
        zone: zone.name,
        capacity: zone.capacity,
        currentLoad: zone.current_load,
        loadPercentage: loadPercentage.toFixed(1),
        status: this._getZoneHealthStatus(loadPercentage),
        activeOrders: loadReport.activeOrders,
        activeCouriers: loadReport.activeCouriers,
        recommendation: this._getZoneRecommendation(loadPercentage)
      };
    } catch (error) {
      logger.error('Error getting zone health report:', error);
      throw error;
    }
  }

  /**
   * Rebalance zones - move couriers/orders from overloaded zones
   */
  async rebalanceZones(overloadThreshold = 0.85) {
    try {
      const zones = await this.getAllZones();
      const rebalancingActions = [];

      // 1. Identify overloaded zones
      const overloadedZones = [];
      const underloadedZones = [];

      for (const zone of zones) {
        const loadPercentage = zone.current_load / zone.capacity;

        if (loadPercentage > overloadThreshold) {
          overloadedZones.push({ zone, loadPercentage });
        } else if (loadPercentage < 0.3) {
          underloadedZones.push({ zone, loadPercentage });
        }
      }

      // 2. Move couriers from overloaded to underloaded zones
      for (const overloaded of overloadedZones) {
        const couriers = await this.getCouriersInZone(overloaded.zone.id);
        const idleCouriers = couriers.filter(c => c.status === 'idle');

        for (const courier of idleCouriers) {
          // Find nearest underloaded zone
          const targetZone = this._findNearestUnderloadedZone(
            overloaded.zone,
            underloadedZones,
            courier.current_location
          );

          if (targetZone) {
            await this.db.updateCourier(courier.id, {
              current_zone_id: targetZone.zone.id
            });

            // Update loads
            await this.updateZoneLoad(
              overloaded.zone.id,
              overloaded.zone.current_load - 1
            );
            await this.updateZoneLoad(
              targetZone.zone.id,
              targetZone.zone.current_load + 1
            );

            rebalancingActions.push({
              action: 'move_courier',
              courierId: courier.id,
              fromZone: overloaded.zone.id,
              toZone: targetZone.zone.id
            });

            logger.info(`Rebalanced courier ${courier.id} to zone ${targetZone.zone.id}`);
          }
        }
      }

      return {
        totalActions: rebalancingActions.length,
        actions: rebalancingActions,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error rebalancing zones:', error);
      throw error;
    }
  }

  /**
   * Get zone statistics
   */
  async getZoneStatistics() {
    try {
      const zones = await this.getAllZones();
      const stats = [];

      for (const zone of zones) {
        const loadReport = await this.calculateZoneLoad(zone.id);
        const health = await this.getZoneHealthReport(zone.id);

        stats.push({
          zone: zone.name,
          bounds: this._parseBounds(zone.bounds),
          capacity: zone.capacity,
          currentLoad: zone.current_load,
          loadPercentage: health.loadPercentage,
          status: health.status,
          orders: loadReport.activeOrders,
          couriers: loadReport.activeCouriers
        });
      }

      return stats;
    } catch (error) {
      logger.error('Error getting zone statistics:', error);
      throw error;
    }
  }

  /**
   * Split zone into sub-zones (useful for very large zones)
   */
  async splitZone(zoneId, splitPattern = '2x2') {
    try {
      const zone = await this.getZoneById(zoneId);
      if (!zone) throw new Error(`Zone ${zoneId} not found`);

      const bounds = this._parseBounds(zone.bounds);
      const subZones = [];

      if (splitPattern === '2x2') {
        // Split into 4 equal zones
        const latMid = (bounds.lat_min + bounds.lat_max) / 2;
        const lonMid = (bounds.lon_min + bounds.lon_max) / 2;

        const splits = [
          { name: `${zone.name}-NW`, bounds: { lat_min: latMid, lat_max: bounds.lat_max, lon_min: bounds.lon_min, lon_max: lonMid } },
          { name: `${zone.name}-NE`, bounds: { lat_min: latMid, lat_max: bounds.lat_max, lon_min: lonMid, lon_max: bounds.lon_max } },
          { name: `${zone.name}-SW`, bounds: { lat_min: bounds.lat_min, lat_max: latMid, lon_min: bounds.lon_min, lon_max: lonMid } },
          { name: `${zone.name}-SE`, bounds: { lat_min: bounds.lat_min, lat_max: latMid, lon_min: lonMid, lon_max: bounds.lon_max } }
        ];

        for (const split of splits) {
          const newZone = await this.createZone(split.name, split.bounds, Math.ceil(zone.capacity / 4));
          subZones.push(newZone);
        }

        // Mark original zone as inactive
        await this.db.updateZone(zoneId, { status: 'inactive' });
      }

      logger.info(`Zone ${zoneId} split into ${subZones.length} sub-zones`);
      return subZones;
    } catch (error) {
      logger.error('Error splitting zone:', error);
      throw error;
    }
  }

  // ============ HELPER METHODS ============

  _enrichZone(zone) {
    return {
      ...zone,
      bounds: this._parseBounds(zone.bounds)
    };
  }

  _parseBounds(boundsJson) {
    if (typeof boundsJson === 'string') {
      return JSON.parse(boundsJson);
    }
    return boundsJson;
  }

  _getZoneHealthStatus(loadPercentage) {
    if (loadPercentage >= 100) return 'overloaded';
    if (loadPercentage >= 90) return 'critical';
    if (loadPercentage >= 75) return 'warning';
    if (loadPercentage >= 50) return 'normal';
    return 'idle';
  }

  _getZoneRecommendation(loadPercentage) {
    if (loadPercentage >= 100) return 'Immediately rebalance or split zone';
    if (loadPercentage >= 90) return 'Urgent: Deploy additional couriers';
    if (loadPercentage >= 75) return 'Consider adding couriers';
    if (loadPercentage < 20) return 'Consider consolidating zones';
    return 'Zone healthy';
  }

  _findNearestUnderloadedZone(fromZone, underloadedZones, courierLocation) {
    if (underloadedZones.length === 0) return null;

    const zoneDistances = underloadedZones.map(zoneInfo => {
      const bounds = zoneInfo.zone.bounds;
      const zoneCenterLat = (bounds.lat_min + bounds.lat_max) / 2;
      const zoneCenterLon = (bounds.lon_min + bounds.lon_max) / 2;

      const distance = this.distanceCalculator.calculateDistance(
        courierLocation,
        { latitude: zoneCenterLat, longitude: zoneCenterLon }
      );

      return { ...zoneInfo, distance };
    });

    zoneDistances.sort((a, b) => a.distance - b.distance);
    return zoneDistances[0] || null;
  }
}

module.exports = ZoneService;

