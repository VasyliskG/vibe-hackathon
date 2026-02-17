const express = require('express');
const { body, param, query } = require('express-validator');
const validate = require('../middleware/validator');
const OrderController = require('../controllers/orderController');

const router = express.Router();

/**
 * @route GET /api/orders/queue
 * @desc Get current order queue
 */
router.get('/queue', OrderController.getQueue);

/**
 * @route GET /api/orders
 * @desc Get all orders (with optional status filter)
 */
router.get('/',
  query('status')
    .optional()
    .isIn(['pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled'])
    .withMessage('Invalid status'),
  validate,
  OrderController.getAllOrders
);

/**
 * @route GET /api/orders/:id
 * @desc Get order by ID
 */
router.get('/:id',
  param('id').notEmpty().withMessage('Order ID is required'),
  validate,
  OrderController.getOrderById
);

/**
 * @route POST /api/orders
 * @desc Create new order
 */
router.post('/',
  body('id')
    .notEmpty().withMessage('Order ID is required')
    .isString().withMessage('Order ID must be a string'),
  body('restaurantX')
    .notEmpty().withMessage('Restaurant X coordinate is required')
    .isInt({ min: 0 }).withMessage('Restaurant X must be a non-negative integer'),
  body('restaurantY')
    .notEmpty().withMessage('Restaurant Y coordinate is required')
    .isInt({ min: 0 }).withMessage('Restaurant Y must be a non-negative integer'),
  body('weight')
    .optional()
    .isFloat({ min: 0.1 }).withMessage('Weight must be at least 0.1 kg'),
  validate,
  OrderController.createOrder
);

/**
 * @route POST /api/orders/:id/assign
 * @desc Manually assign order to courier
 */
router.post('/:id/assign',
  param('id').notEmpty().withMessage('Order ID is required'),
  body('courierId')
    .notEmpty().withMessage('Courier ID is required')
    .isString().withMessage('Courier ID must be a string'),
  validate,
  OrderController.assignOrder
);

/**
 * @route PATCH /api/orders/:id/status
 * @desc Update order status
 */
router.patch('/:id/status',
  param('id').notEmpty().withMessage('Order ID is required'),
  body('status')
    .notEmpty().withMessage('Status is required')
    .isIn(['picked_up', 'in_transit', 'delivered', 'cancelled'])
    .withMessage('Invalid status'),
  validate,
  OrderController.updateOrderStatus
);

/**
 * @route DELETE /api/orders/:id
 * @desc Cancel/delete order
 */
router.delete('/:id',
  param('id').notEmpty().withMessage('Order ID is required'),
  validate,
  OrderController.deleteOrder
);

module.exports = router;

