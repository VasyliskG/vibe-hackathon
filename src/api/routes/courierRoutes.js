const express = require('express');
const { body, param, query } = require('express-validator');
const validate = require('../middleware/validator');
const CourierController = require('../controllers/courierController');

const router = express.Router();

/**
 * @route GET /api/couriers
 * @desc Get all couriers (with optional status filter)
 */
router.get('/',
  query('status')
    .optional()
    .isIn(['Free', 'Busy'])
    .withMessage('Invalid status'),
  validate,
  CourierController.getAllCouriers
);

/**
 * @route GET /api/couriers/:id
 * @desc Get courier by ID
 */
router.get('/:id',
  param('id').notEmpty().withMessage('Courier ID is required'),
  validate,
  CourierController.getCourierById
);

/**
 * @route POST /api/couriers
 * @desc Create new courier
 */
router.post('/',
  body('id')
    .notEmpty().withMessage('Courier ID is required')
    .isString().withMessage('Courier ID must be a string'),
  body('x')
    .notEmpty().withMessage('X coordinate is required')
    .isInt({ min: 0 }).withMessage('X must be a non-negative integer'),
  body('y')
    .notEmpty().withMessage('Y coordinate is required')
    .isInt({ min: 0 }).withMessage('Y must be a non-negative integer'),
  body('transportType')
    .notEmpty().withMessage('Transport type is required')
    .isIn(['walker', 'bicycle', 'scooter', 'car'])
    .withMessage('Invalid transport type'),
  validate,
  CourierController.createCourier
);

/**
 * @route PATCH /api/couriers/:id/location
 * @desc Update courier location
 */
router.patch('/:id/location',
  param('id').notEmpty().withMessage('Courier ID is required'),
  body('x')
    .notEmpty().withMessage('X coordinate is required')
    .isInt({ min: 0 }).withMessage('X must be a non-negative integer'),
  body('y')
    .notEmpty().withMessage('Y coordinate is required')
    .isInt({ min: 0 }).withMessage('Y must be a non-negative integer'),
  validate,
  CourierController.updateLocation
);

/**
 * @route PATCH /api/couriers/:id/status
 * @desc Update courier status
 */
router.patch('/:id/status',
  param('id').notEmpty().withMessage('Courier ID is required'),
  body('status')
    .notEmpty().withMessage('Status is required')
    .isIn(['Free', 'Busy'])
    .withMessage('Invalid status'),
  validate,
  CourierController.updateStatus
);

/**
 * @route POST /api/couriers/:id/reset-counter
 * @desc Reset courier's daily counter
 */
router.post('/:id/reset-counter',
  param('id').notEmpty().withMessage('Courier ID is required'),
  validate,
  CourierController.resetDailyCounter
);

/**
 * @route DELETE /api/couriers/:id
 * @desc Delete courier
 */
router.delete('/:id',
  param('id').notEmpty().withMessage('Courier ID is required'),
  validate,
  CourierController.deleteCourier
);

module.exports = router;

