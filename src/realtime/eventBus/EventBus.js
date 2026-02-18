const logger = require('../../utils/logger');

const MAX_EVENTS = 100;

class EventBus {
  constructor() {
    this._subscribers = new Map();
    this._events = [];
    this._stats = {
      published: 0,
      byType: {}
    };
  }

  subscribe(eventType, handler) {
    if (!this._subscribers.has(eventType)) {
      this._subscribers.set(eventType, new Set());
    }

    const handlers = this._subscribers.get(eventType);
    handlers.add(handler);

    return () => this.unsubscribe(eventType, handler);
  }

  unsubscribe(eventType, handler) {
    const handlers = this._subscribers.get(eventType);
    if (!handlers) {
      return;
    }

    handlers.delete(handler);
    if (handlers.size === 0) {
      this._subscribers.delete(eventType);
    }
  }

  publish(event) {
    if (!event || !event.type) {
      throw new Error('Event must have a type');
    }

    const enriched = {
      ...event,
      timestamp: event.timestamp || Date.now()
    };

    this._events.push(enriched);
    if (this._events.length > MAX_EVENTS) {
      this._events.shift();
    }

    this._stats.published += 1;
    this._stats.byType[enriched.type] = (this._stats.byType[enriched.type] || 0) + 1;

    const handlers = this._subscribers.get(enriched.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(enriched);
        } catch (error) {
          logger.error('Event handler failed', {
            type: enriched.type,
            error: error.message
          });
        }
      });
    }

    return enriched;
  }

  getRecentEvents() {
    return [...this._events];
  }

  getStats() {
    return {
      published: this._stats.published,
      byType: { ...this._stats.byType },
      retained: this._events.length
    };
  }
}

module.exports = new EventBus();

