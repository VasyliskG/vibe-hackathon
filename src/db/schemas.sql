-- PostgreSQL Schema for Vibe Delivery System (Stage 6)
-- Orders, Couriers, Zones, Delivery History, Metrics, Audit Logs

-- Enable PostGIS extension (if available)
-- CREATE EXTENSION IF NOT EXISTS postgis;

-- Zones Table
CREATE TABLE IF NOT EXISTS zones (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  bounds JSONB NOT NULL, -- {lat_min, lat_max, lon_min, lon_max}
  capacity INTEGER NOT NULL DEFAULT 100,
  current_load INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'active', -- active, inactive, maintenance
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_zones_status ON zones(status);
CREATE INDEX idx_zones_created_at ON zones(created_at DESC);

-- Couriers Table
CREATE TABLE IF NOT EXISTS couriers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20),
  transport_type VARCHAR(50) NOT NULL, -- car, bike, motorcycle, pedestrian
  current_location JSONB, -- {lat, lon}
  current_zone_id INTEGER REFERENCES zones(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'idle', -- idle, active, busy, offline
  queue_size INTEGER DEFAULT 0,
  capacity INTEGER NOT NULL DEFAULT 10,
  availability BOOLEAN DEFAULT true,
  average_rating DECIMAL(3, 2),
  total_deliveries INTEGER DEFAULT 0,
  successful_deliveries INTEGER DEFAULT 0,
  failed_deliveries INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_couriers_status ON couriers(status);
CREATE INDEX idx_couriers_zone_id ON couriers(current_zone_id);
CREATE INDEX idx_couriers_created_at ON couriers(created_at DESC);
CREATE INDEX idx_couriers_transport_type ON couriers(transport_type);

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  external_id VARCHAR(255) UNIQUE,
  sender_location JSONB NOT NULL, -- {lat, lon, address}
  receiver_location JSONB NOT NULL, -- {lat, lon, address}
  weight DECIMAL(10, 2),
  dimensions JSONB, -- {height, width, depth}
  status VARCHAR(50) DEFAULT 'pending', -- pending, assigned, in_transit, delivered, failed, cancelled
  assigned_courier_id INTEGER REFERENCES couriers(id) ON DELETE SET NULL,
  assigned_zone_id INTEGER REFERENCES zones(id) ON DELETE SET NULL,
  priority VARCHAR(50) DEFAULT 'normal', -- low, normal, high, urgent
  sla_deadline TIMESTAMP,
  estimated_delivery_time TIMESTAMP,
  actual_delivery_time TIMESTAMP,
  distance_meters DECIMAL(10, 2),
  delivery_duration_seconds INTEGER,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_assigned_courier_id ON orders(assigned_courier_id);
CREATE INDEX idx_orders_assigned_zone_id ON orders(assigned_zone_id);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_sla_deadline ON orders(sla_deadline);
CREATE INDEX idx_orders_priority ON orders(priority);

-- Delivery History Table (Immutable log)
CREATE TABLE IF NOT EXISTS delivery_history (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  courier_id INTEGER REFERENCES couriers(id),
  zone_id INTEGER REFERENCES zones(id),
  event_type VARCHAR(50) NOT NULL, -- created, assigned, in_transit, delivered, failed, cancelled
  previous_status VARCHAR(50),
  new_status VARCHAR(50),
  location JSONB, -- courier location at event time
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_delivery_history_order_id ON delivery_history(order_id);
CREATE INDEX idx_delivery_history_courier_id ON delivery_history(courier_id);
CREATE INDEX idx_delivery_history_created_at ON delivery_history(created_at DESC);
CREATE INDEX idx_delivery_history_event_type ON delivery_history(event_type);

-- Metrics Snapshots (for analytics and dashboards)
CREATE TABLE IF NOT EXISTS metrics_snapshots (
  id SERIAL PRIMARY KEY,
  metric_key VARCHAR(255) NOT NULL, -- e.g., "orders_per_hour", "avg_eta", "queue_size"
  metric_value DECIMAL(20, 4),
  zone_id INTEGER REFERENCES zones(id),
  courier_id INTEGER REFERENCES couriers(id),
  time_bucket TIMESTAMP NOT NULL, -- hourly, daily bucket
  metadata JSONB, -- additional context
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_metrics_snapshots_metric_key ON metrics_snapshots(metric_key);
CREATE INDEX idx_metrics_snapshots_time_bucket ON metrics_snapshots(time_bucket DESC);
CREATE INDEX idx_metrics_snapshots_zone_id ON metrics_snapshots(zone_id);
CREATE INDEX idx_metrics_snapshots_courier_id ON metrics_snapshots(courier_id);

-- Audit Logs (compliance + debugging)
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255),
  action VARCHAR(255) NOT NULL, -- assign_order, update_status, rebalance_zones, etc.
  resource_type VARCHAR(100), -- order, courier, zone
  resource_id INTEGER,
  old_value JSONB,
  new_value JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  status VARCHAR(50), -- success, failure
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);

-- Routes Table (Multi-stop delivery optimization)
CREATE TABLE IF NOT EXISTS routes (
  id SERIAL PRIMARY KEY,
  courier_id INTEGER NOT NULL REFERENCES couriers(id) ON DELETE CASCADE,
  order_ids JSONB NOT NULL, -- array of order IDs in sequence
  total_distance_meters DECIMAL(10, 2),
  estimated_duration_seconds INTEGER,
  status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed, failed
  optimized_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_routes_courier_id ON routes(courier_id);
CREATE INDEX idx_routes_status ON routes(status);
CREATE INDEX idx_routes_created_at ON routes(created_at DESC);

-- Predictions Table (ML model outputs)
CREATE TABLE IF NOT EXISTS predictions (
  id SERIAL PRIMARY KEY,
  prediction_type VARCHAR(100) NOT NULL, -- demand_forecast, eta_adjustment, load_prediction
  zone_id INTEGER REFERENCES zones(id),
  time_bucket TIMESTAMP NOT NULL,
  predicted_value DECIMAL(20, 4),
  confidence_score DECIMAL(5, 4),
  actual_value DECIMAL(20, 4),
  model_version VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_predictions_prediction_type ON predictions(prediction_type);
CREATE INDEX idx_predictions_time_bucket ON predictions(time_bucket DESC);
CREATE INDEX idx_predictions_zone_id ON predictions(zone_id);

