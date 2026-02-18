const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validator');
const SimulationController = require('../controllers/simulationController');

const router = express.Router();

router.post('/start',
  body('ordersCount').isInt({ min: 1 }).withMessage('ordersCount must be >= 1'),
  body('couriersCount').isInt({ min: 1 }).withMessage('couriersCount must be >= 1'),
  validate,
  SimulationController.start
);

router.post('/stop', SimulationController.stop);
router.get('/status', SimulationController.status);

module.exports = router;

