const express = require('express');
const SystemController = require('../controllers/systemController');

const router = express.Router();

/**
 * @route GET /api/system/health
 * @desc Health check endpoint
 */
router.get('/health', SystemController.health);

/**
 * @route GET /api/system/metrics
 * @desc Get system metrics and statistics
 */
router.get('/metrics', SystemController.metrics);

/**
 * @route GET /api/system/info
 * @desc Get system information
 */
router.get('/info', SystemController.info);

/**
 * @route POST /api/system/auto-assign
 * @desc Auto-assign pending orders to couriers
 */
router.post('/auto-assign', SystemController.autoAssign);

/**
 * @route POST /api/system/reset
 * @desc Reset all data (for testing)
 */
router.post('/reset', SystemController.reset);

module.exports = router;

