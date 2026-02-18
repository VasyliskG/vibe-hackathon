const os = require('os');

class MetricsService {
  constructor(windowMs = 60000) {
    this._windowMs = windowMs;
    this._events = [];
    this._wsConnections = 0;
    this._slaViolations = 0;
  }

  recordEvent(type, timestamp = Date.now()) {
    this._events.push({ type, timestamp });
    this._purge();
  }

  recordSlaViolation() {
    this._slaViolations += 1;
  }

  setWsConnections(count) {
    this._wsConnections = count;
  }

  getSnapshot() {
    this._purge();
    const now = Date.now();
    const ordersPerMinute = this._events.filter(e => e.type === 'ORDER_CREATED' && now - e.timestamp <= this._windowMs).length;

    return {
      ordersPerMinute,
      wsConnections: this._wsConnections,
      slaViolations: this._slaViolations,
      systemLoadScore: this._calculateLoadScore(),
      cpu: os.loadavg(),
      memory: process.memoryUsage()
    };
  }

  _calculateLoadScore() {
    const load = os.loadavg()[0] || 0;
    const mem = process.memoryUsage().heapUsed / process.memoryUsage().heapTotal;
    return Math.round((load + mem) * 100) / 100;
  }

  _purge() {
    const cutoff = Date.now() - this._windowMs;
    this._events = this._events.filter(e => e.timestamp >= cutoff);
  }
}

module.exports = MetricsService;

