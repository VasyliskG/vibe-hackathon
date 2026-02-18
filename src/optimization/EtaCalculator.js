/**
 * EtaCalculator - Estimates time of arrival for orders
 * Considers:
 * - Distance to order location
 * - Current queue size
 * - Traffic conditions (time of day)
 * - Courier speed profile
 * - Delivery time at stops
 */

const DistanceCalculator = require('../utils/DistanceCalculator');
const logger = require('../utils/logger');

class EtaCalculator {
  constructor() {
    this.distanceCalculator = new DistanceCalculator();

    // Speed profiles by transport type (km/h)
    this.speedProfiles = {
      pedestrian: { avgSpeed: 5, maxSpeed: 6, minSpeed: 3 },
      bike: { avgSpeed: 15, maxSpeed: 25, minSpeed: 10 },
      motorcycle: { avgSpeed: 40, maxSpeed: 60, minSpeed: 30 },
      car: { avgSpeed: 35, maxSpeed: 50, minSpeed: 20 }
    };

    // Traffic multipliers by hour (0-23)
    this.trafficMultipliers = {
      0: 0.8,  // Midnight
      1: 0.75,
      2: 0.7,
      3: 0.7,
      4: 0.75,
      5: 0.9,
      6: 1.3,  // Morning rush
      7: 1.5,
      8: 1.6,
      9: 1.4,
      10: 1.0,
      11: 1.0,
      12: 1.2,
      13: 1.1,
      14: 1.0,
      15: 0.9,
      16: 1.2,
      17: 1.6,  // Evening rush
      18: 1.7,
      19: 1.5,
      20: 1.2,
      21: 0.9,
      22: 0.8,
      23: 0.8
    };

    // Delivery time at each stop (seconds)
    this.stopDuration = {
      pedestrian: 180,  // 3 minutes
      bike: 180,
      motorcycle: 120,  // 2 minutes
      car: 150          // 2.5 minutes
    };
  }

  /**
   * Calculate ETA for an order
   * Returns: { eta: ISO timestamp, durationSeconds: number, confidence: 0-1 }
   */
  calculateEta(order, courier, courierQueue = []) {
    try {
      if (!order || !courier) {
        throw new Error('Order and Courier are required');
      }

      const now = new Date();

      // 1. Calculate queue duration (current orders in queue)
      const queueDuration = this._calculateQueueDuration(courier, courierQueue);

      // 2. Calculate distance from courier to order
      const distanceMeters = this.distanceCalculator.calculateDistance(
        courier.current_location,
        order.sender_location
      );

      // 3. Calculate travel time (with traffic adjustment)
      const speedProfile = this.speedProfiles[courier.transport_type] || this.speedProfiles.car;
      const travelTime = this._calculateTravelTime(distanceMeters, speedProfile, now);

      // 4. Add stop time for delivery
      const stopTime = this.stopDuration[courier.transport_type] || 150;

      // 5. Total duration
      const totalDuration = queueDuration + travelTime + stopTime;

      // 6. Calculate confidence based on factors
      const confidence = this._calculateConfidence(courier, courierQueue, distanceMeters);

      // 7. Calculate ETA
      const eta = new Date(now.getTime() + totalDuration * 1000);

      return {
        eta: eta.toISOString(),
        durationSeconds: totalDuration,
        distanceMeters,
        queueWaitSeconds: queueDuration,
        travelTimeSeconds: travelTime,
        stopTimeSeconds: stopTime,
        confidence,
        breakdown: {
          courier: courier.name,
          courierSpeed: speedProfile.avgSpeed,
          trafficMultiplier: this.trafficMultipliers[now.getHours()],
          queueSize: courierQueue.length
        }
      };
    } catch (error) {
      logger.error('Error calculating ETA:', error);
      return null;
    }
  }

  /**
   * Calculate ETA for multiple orders relative to a courier
   * Returns sorted by ETA
   */
  calculateMultipleEta(orders, courier, courierQueue = []) {
    const etas = orders.map((order, index) => {
      // Adjust queue with orders before this one
      const adjustedQueue = courierQueue.slice(0, index);
      const etaInfo = this.calculateEta(order, courier, adjustedQueue);
      return { orderId: order.id, ...etaInfo };
    });

    return etas.sort((a, b) => new Date(a.eta) - new Date(b.eta));
  }

  /**
   * Estimate queue wait time based on current queue
   */
  _calculateQueueDuration(courier, queue) {
    if (!queue || queue.length === 0) {
      return 0;
    }

    // Each order in queue takes stopDuration + average travel between orders
    const stopTime = this.stopDuration[courier.transport_type] || 150;
    const avgInterOrderTravel = 300; // 5 minutes average travel between stops

    return queue.length * (stopTime + avgInterOrderTravel);
  }

  /**
   * Calculate travel time with traffic adjustments
   */
  _calculateTravelTime(distanceMeters, speedProfile, timestamp = new Date()) {
    const distanceKm = distanceMeters / 1000;
    const hour = timestamp.getHours();
    const trafficMultiplier = this.trafficMultipliers[hour] || 1.0;

    // Base travel time in hours
    const baseTimeHours = distanceKm / speedProfile.avgSpeed;

    // Apply traffic multiplier
    const adjustedTimeHours = baseTimeHours * trafficMultiplier;

    // Convert to seconds
    return Math.round(adjustedTimeHours * 3600);
  }

  /**
   * Calculate confidence score (0-1)
   * Factors: courier rating, queue size, distance, current time
   */
  _calculateConfidence(courier, queue, distanceMeters) {
    let confidence = 0.8; // Base confidence

    // Courier rating
    if (courier.average_rating) {
      confidence += (courier.average_rating / 5) * 0.1;
    }

    // Queue size (larger queue = lower confidence)
    const queuePenalty = Math.min(0.2, queue.length * 0.02);
    confidence -= queuePenalty;

    // Distance (very far orders have lower confidence)
    if (distanceMeters > 10000) {
      confidence -= 0.1;
    }

    // Courier experience (successful delivery rate)
    if (courier.successful_deliveries && courier.total_deliveries) {
      const successRate = courier.successful_deliveries / courier.total_deliveries;
      confidence *= successRate;
    }

    return Math.max(0.3, Math.min(1.0, confidence));
  }

  /**
   * Predict if courier can deliver within SLA
   */
  canMeetSla(order, courier, courierQueue, slaDeadline) {
    const eta = this.calculateEta(order, courier, courierQueue);

    if (!eta) return false;

    const etaTime = new Date(eta.eta).getTime();
    const deadline = new Date(slaDeadline).getTime();

    const canMeet = etaTime <= deadline;
    const marginMinutes = (deadline - etaTime) / 60000;

    return {
      canMeet,
      eta: eta.eta,
      deadline: slaDeadline,
      marginMinutes: Math.round(marginMinutes),
      confidence: eta.confidence
    };
  }

  /**
   * Find best courier for order considering ETA and SLA
   */
  findBestCourier(order, availableCouriers, courierQueues = {}, slaDeadline = null) {
    const results = availableCouriers.map(courier => {
      const queue = courierQueues[courier.id] || [];
      const eta = this.calculateEta(order, courier, queue);

      if (!eta) {
        return { courier, eta: null, slaStatus: null, score: 0 };
      }

      const slaStatus = slaDeadline
        ? this.canMeetSla(order, courier, queue, slaDeadline)
        : null;

      // Scoring: prefer shorter ETA, higher confidence, SLA compliance
      let score = (1 - (eta.durationSeconds / 7200)) * 0.5; // Normalize to 2 hours max
      score += eta.confidence * 0.3;
      score += (slaStatus?.canMeet ? 0.2 : -0.2);

      return { courier, eta, slaStatus, score };
    });

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    return {
      best: results[0],
      all: results,
      recommendation: results[0].courier.id
    };
  }

  /**
   * Recalculate ETAs after courier/queue changes
   */
  refreshEtas(orders, couriers, courierQueues = {}) {
    const etaMap = new Map();

    for (const order of orders) {
      const results = [];

      for (const courier of couriers) {
        const queue = courierQueues[courier.id] || [];
        const eta = this.calculateEta(order, courier, queue);

        if (eta) {
          results.push({
            courierId: courier.id,
            courierName: courier.name,
            eta: eta.eta,
            durationSeconds: eta.durationSeconds,
            confidence: eta.confidence
          });
        }
      }

      etaMap.set(order.id, results.sort((a, b) =>
        new Date(a.eta) - new Date(b.eta)
      ));
    }

    return etaMap;
  }

  /**
   * Get statistics about ETA accuracy for historical data
   */
  getAccuracyStats(historicalData) {
    if (!historicalData || historicalData.length === 0) {
      return null;
    }

    const errors = historicalData
      .filter(h => h.estimatedEta && h.actualEta)
      .map(h => {
        const estimated = new Date(h.estimatedEta).getTime();
        const actual = new Date(h.actualEta).getTime();
        const errorMinutes = Math.abs(estimated - actual) / 60000;
        return errorMinutes;
      });

    if (errors.length === 0) return null;

    const avgError = errors.reduce((a, b) => a + b, 0) / errors.length;
    const maxError = Math.max(...errors);
    const minError = Math.min(...errors);

    return {
      sampleSize: errors.length,
      avgErrorMinutes: Math.round(avgError),
      maxErrorMinutes: Math.round(maxError),
      minErrorMinutes: Math.round(minError),
      accuracy: (1 - (avgError / 60)) * 100 // Convert to percentage
    };
  }
}

module.exports = EtaCalculator;

