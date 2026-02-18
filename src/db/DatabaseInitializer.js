/**
 * Database initialization and configuration
 * Handles connection setup and model definitions
 */

const { Sequelize, DataTypes } = require('sequelize');
const logger = require('../utils/logger');

class DatabaseInitializer {
  constructor(env) {
    this.env = env;
    this.sequelize = null;
    this.models = {};
  }

  /**
   * Initialize database connection
   */
  async initialize() {
    try {
      this.sequelize = new Sequelize(
        this.env.DB_NAME,
        this.env.DB_USER,
        this.env.DB_PASSWORD,
        {
          host: this.env.DB_HOST,
          port: this.env.DB_PORT,
          dialect: 'postgres',
          logging: this.env.NODE_ENV === 'development' ? console.log : false,
          pool: {
            max: 10,
            min: 2,
            acquire: 30000,
            idle: 10000
          },
          timezone: '+00:00'
        }
      );

      // Test connection
      await this.sequelize.authenticate();
      logger.info('Database connection successful');

      // Define all models
      this._defineModels();

      // Sync models
      if (this.env.NODE_ENV === 'development') {
        // In development, allow auto-sync (with alter: true, be careful!)
        // In production, use migrations instead
        // await this.sequelize.sync({ alter: false });
      }

      return this.sequelize;
    } catch (error) {
      logger.error('Database initialization failed:', error);
      throw error;
    }
  }

  /**
   * Define all Sequelize models
   */
  _defineModels() {
    // Zone Model
    this.models.Zone = this.sequelize.define('Zone', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true
      },
      bounds: {
        type: DataTypes.JSONB,
        allowNull: false
      },
      capacity: {
        type: DataTypes.INTEGER,
        defaultValue: 100
      },
      current_load: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      status: {
        type: DataTypes.STRING(50),
        defaultValue: 'active'
      }
    }, {
      tableName: 'zones',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    });

    // Courier Model
    this.models.Courier = this.sequelize.define('Courier', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      email: {
        type: DataTypes.STRING(255),
        unique: true,
        allowNull: true
      },
      phone: {
        type: DataTypes.STRING(20),
        allowNull: true
      },
      transport_type: {
        type: DataTypes.STRING(50),
        allowNull: false
      },
      current_location: {
        type: DataTypes.JSONB,
        allowNull: true
      },
      current_zone_id: {
        type: DataTypes.INTEGER,
        references: { model: 'zones', key: 'id' },
        allowNull: true,
        onDelete: 'SET NULL'
      },
      status: {
        type: DataTypes.STRING(50),
        defaultValue: 'idle'
      },
      queue_size: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      capacity: {
        type: DataTypes.INTEGER,
        defaultValue: 10
      },
      availability: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },
      average_rating: {
        type: DataTypes.DECIMAL(3, 2),
        allowNull: true
      },
      total_deliveries: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      successful_deliveries: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      failed_deliveries: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      }
    }, {
      tableName: 'couriers',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    });

    // Order Model
    this.models.Order = this.sequelize.define('Order', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      external_id: {
        type: DataTypes.STRING(255),
        unique: true,
        allowNull: true
      },
      sender_location: {
        type: DataTypes.JSONB,
        allowNull: false
      },
      receiver_location: {
        type: DataTypes.JSONB,
        allowNull: false
      },
      weight: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
      },
      dimensions: {
        type: DataTypes.JSONB,
        allowNull: true
      },
      status: {
        type: DataTypes.STRING(50),
        defaultValue: 'pending'
      },
      assigned_courier_id: {
        type: DataTypes.INTEGER,
        references: { model: 'couriers', key: 'id' },
        allowNull: true,
        onDelete: 'SET NULL'
      },
      assigned_zone_id: {
        type: DataTypes.INTEGER,
        references: { model: 'zones', key: 'id' },
        allowNull: true,
        onDelete: 'SET NULL'
      },
      priority: {
        type: DataTypes.STRING(50),
        defaultValue: 'normal'
      },
      sla_deadline: {
        type: DataTypes.DATE,
        allowNull: true
      },
      estimated_delivery_time: {
        type: DataTypes.DATE,
        allowNull: true
      },
      actual_delivery_time: {
        type: DataTypes.DATE,
        allowNull: true
      },
      distance_meters: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
      },
      delivery_duration_seconds: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      completed_at: {
        type: DataTypes.DATE,
        allowNull: true
      }
    }, {
      tableName: 'orders',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    });

    // DeliveryHistory Model
    this.models.DeliveryHistory = this.sequelize.define('DeliveryHistory', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      order_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'orders', key: 'id' },
        onDelete: 'CASCADE'
      },
      courier_id: {
        type: DataTypes.INTEGER,
        references: { model: 'couriers', key: 'id' },
        allowNull: true
      },
      zone_id: {
        type: DataTypes.INTEGER,
        references: { model: 'zones', key: 'id' },
        allowNull: true
      },
      event_type: {
        type: DataTypes.STRING(50),
        allowNull: false
      },
      previous_status: {
        type: DataTypes.STRING(50),
        allowNull: true
      },
      new_status: {
        type: DataTypes.STRING(50),
        allowNull: true
      },
      location: {
        type: DataTypes.JSONB,
        allowNull: true
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true
      }
    }, {
      tableName: 'delivery_history',
      timestamps: false,
      createdAt: 'created_at'
    });

    // MetricsSnapshot Model
    this.models.MetricsSnapshot = this.sequelize.define('MetricsSnapshot', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      metric_key: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      metric_value: {
        type: DataTypes.DECIMAL(20, 4),
        allowNull: true
      },
      zone_id: {
        type: DataTypes.INTEGER,
        references: { model: 'zones', key: 'id' },
        allowNull: true
      },
      courier_id: {
        type: DataTypes.INTEGER,
        references: { model: 'couriers', key: 'id' },
        allowNull: true
      },
      time_bucket: {
        type: DataTypes.DATE,
        allowNull: false
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: true
      }
    }, {
      tableName: 'metrics_snapshots',
      timestamps: false,
      createdAt: 'created_at'
    });

    // AuditLog Model
    this.models.AuditLog = this.sequelize.define('AuditLog', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      action: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      resource_type: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      resource_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      old_value: {
        type: DataTypes.JSONB,
        allowNull: true
      },
      new_value: {
        type: DataTypes.JSONB,
        allowNull: true
      },
      ip_address: {
        type: DataTypes.STRING(45),
        allowNull: true
      },
      user_agent: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      status: {
        type: DataTypes.STRING(50),
        defaultValue: 'success'
      },
      error_message: {
        type: DataTypes.TEXT,
        allowNull: true
      }
    }, {
      tableName: 'audit_logs',
      timestamps: false,
      createdAt: 'created_at'
    });

    // Route Model
    this.models.Route = this.sequelize.define('Route', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      courier_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'couriers', key: 'id' },
        onDelete: 'CASCADE'
      },
      order_ids: {
        type: DataTypes.JSONB,
        allowNull: false
      },
      total_distance_meters: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
      },
      estimated_duration_seconds: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      status: {
        type: DataTypes.STRING(50),
        defaultValue: 'pending'
      },
      optimized_at: {
        type: DataTypes.DATE,
        allowNull: true
      },
      completed_at: {
        type: DataTypes.DATE,
        allowNull: true
      }
    }, {
      tableName: 'routes',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    });

    // Prediction Model
    this.models.Prediction = this.sequelize.define('Prediction', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      prediction_type: {
        type: DataTypes.STRING(100),
        allowNull: false
      },
      zone_id: {
        type: DataTypes.INTEGER,
        references: { model: 'zones', key: 'id' },
        allowNull: true
      },
      time_bucket: {
        type: DataTypes.DATE,
        allowNull: false
      },
      predicted_value: {
        type: DataTypes.DECIMAL(20, 4),
        allowNull: true
      },
      confidence_score: {
        type: DataTypes.DECIMAL(5, 4),
        allowNull: true
      },
      actual_value: {
        type: DataTypes.DECIMAL(20, 4),
        allowNull: true
      },
      model_version: {
        type: DataTypes.STRING(50),
        allowNull: true
      }
    }, {
      tableName: 'predictions',
      timestamps: false,
      createdAt: 'created_at'
    });
  }

  /**
   * Get models
   */
  getModels() {
    return this.models;
  }

  /**
   * Get Sequelize instance
   */
  getSequelize() {
    return this.sequelize;
  }

  /**
   * Close connection
   */
  async close() {
    if (this.sequelize) {
      await this.sequelize.close();
      logger.info('Database connection closed');
    }
  }
}

module.exports = DatabaseInitializer;

