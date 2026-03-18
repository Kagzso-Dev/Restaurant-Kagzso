const express = require('express');
const router = express.Router();
const {
    createOrder,
    getOrders,
    searchOrders,
    updateOrderStatus,
    updateItemStatus,
    processPayment,
    cancelOrder,
    cancelOrderItem,
    addOrderItems,
    getOrderById,
} = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All order routes require valid JWT
router.use(protect);

// ── Search (must be BEFORE /:id to avoid "search" being treated as an ID) ───
router.get('/search', authorize('admin', 'cashier', 'waiter'), searchOrders);

router.route('/')
    .post(authorize('waiter', 'admin', 'cashier'), createOrder)
    .get(authorize('kitchen', 'cashier', 'admin', 'waiter'), getOrders);

// ── Specific /:id/... routes (must be BEFORE generic /:id) ─────────
router.post('/:id/add-items', authorize('waiter', 'admin', 'cashier'), addOrderItems);
router.put('/:id/status', authorize('kitchen', 'admin', 'cashier'), updateOrderStatus);
router.put('/:id/cancel', authorize('waiter', 'kitchen', 'admin'), cancelOrder);
router.put('/:id/payment', authorize('cashier', 'admin'), processPayment);

router.put('/:id/items/:itemId/status', authorize('kitchen', 'admin'), updateItemStatus);
router.put('/:id/items/:itemId/cancel', authorize('waiter', 'kitchen', 'admin'), cancelOrderItem);

// ── Generic /:id route ──────────────────────────────────────────────
router.get('/:id', authorize('admin', 'cashier', 'waiter'), getOrderById);

module.exports = router;
