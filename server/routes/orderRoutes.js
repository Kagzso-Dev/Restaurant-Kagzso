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
router.get('/orders/search', authorize('admin', 'cashier', 'waiter'), searchOrders);

router.route('/orders')
    .post(authorize('waiter', 'admin', 'cashier'), createOrder)
    .get(authorize('kitchen', 'cashier', 'admin', 'waiter'), getOrders);

// ── Specific /orders/:id/... routes (must be BEFORE generic /orders/:id) ─────────
router.post('/orders/:id/add-items', authorize('waiter', 'admin', 'cashier'), addOrderItems);
router.put('/orders/:id/status', authorize('kitchen', 'admin'), updateOrderStatus);
router.put('/orders/:id/cancel', authorize('waiter', 'kitchen', 'admin'), cancelOrder);
router.put('/orders/:id/payment', authorize('cashier'), processPayment);

router.put('/orders/:id/items/:itemId/status', authorize('kitchen', 'admin'), updateItemStatus);
router.put('/orders/:id/items/:itemId/cancel', authorize('waiter', 'kitchen', 'admin'), cancelOrderItem);

// ── Generic /orders/:id route ──────────────────────────────────────────
router.get('/orders/:id', authorize('admin', 'cashier', 'waiter'), getOrderById);

module.exports = router;
