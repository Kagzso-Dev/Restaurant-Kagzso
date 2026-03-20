const Order        = require('../models/Order');
const Table        = require('../models/Table');
const Payment      = require('../models/Payment');
const PaymentAudit = require('../models/PaymentAudit');
const { createAndEmitNotification } = require('./notificationController');
const { invalidateCache }           = require('../utils/cache');
const { updateDailyAnalytics }      = require('../utils/analytics');

// Helper: extract raw table ID from either the populated object or plain value
const rawTableId = (tableId) =>
    tableId && typeof tableId === 'object' ? tableId._id : tableId;

// @desc    Get all orders (filtered by role/status/kotStatus)
// @route   GET /api/orders
// @access  Private
const getOrders = async (req, res) => {
    try {
        const { page = 1, limit = 50, kotStatus, status } = req.query;
        const filter = {};
        if (kotStatus) {
            filter.kotStatus = kotStatus === 'Open' ? { $ne: 'Closed' } : kotStatus;
        }

        if (status === 'active') {
            filter.orderStatus = { $in: ['pending', 'accepted', 'preparing', 'ready'] };
        } else if (status === 'history') {
            filter.orderStatus = { $in: ['completed', 'cancelled'] };
        } else if (status) {
            filter.orderStatus = status;
        }

        // Kitchen only sees active orders by default if no filter is provided
        if (req.role === 'kitchen' && !kotStatus && !status) {
            filter.orderStatus = { $in: ['pending', 'accepted', 'preparing', 'ready'] };
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [orders, total] = await Promise.all([
            Order.find(filter, { skip, limit: parseInt(limit) }),
            Order.count(filter),
        ]);

        console.log(`[getOrders] MySQL returned ${orders.length} orders (total: ${total}) for role=${req.role}, filter=${JSON.stringify(filter)}`);

        res.json({
            orders,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit),
                limit: parseInt(limit),
            },
        });
    } catch (error) {
        console.error('[getOrders] MySQL query error:', error.message);
        res.status(500).json({ message: error.message });
    }
};


// @desc    Create new order
// @route   POST /api/orders
// @access  Private (Waiter, Cashier, Admin)
const createOrder = async (req, res) => {
    const { orderType, tableId, customerInfo, items, totalAmount, tax, discount, finalAmount } = req.body;
    console.log('[DEBUG] Received order payload on API /api/orders:', JSON.stringify(req.body, null, 2));

    if (!items || items.length === 0) {
        console.warn('[DEBUG] Rejecting order: No items provided.');
        return res.status(400).json({ message: 'No order items' });
    }

    try {
        // Validate table availability before creating order
        if (orderType === 'dine-in' && tableId) {
            const table = await Table.findById(tableId);
            if (!table) {
                return res.status(404).json({ message: 'Table not found' });
            }
            if (!['available', 'reserved'].includes(table.status)) {
                return res.status(400).json({
                    message: `Table is currently "${table.status}" and cannot be booked`,
                });
            }
        }

        const createdOrder = await Order.create({
            orderType, tableId, customerInfo, items,
            totalAmount, tax, discount, finalAmount,
            waiterId: req.userId,
        });

        // Transition table → occupied
        if (orderType === 'dine-in' && tableId) {
            await Table.updateById(tableId, {
                status: 'occupied',
                currentOrderId: createdOrder._id,
                reservedAt: null,
            });
            const table = await Table.findById(tableId);
            req.app.get('io').to('restaurant_main').emit('table-updated', {
                tableId: table._id,
                status: 'occupied',
                lockedBy: table.lockedBy,
            });
        }

        req.app.get('io').to('restaurant_main').emit('new-order', createdOrder);

        createAndEmitNotification(req.app.get('io'), {
            title: `New Order #${createdOrder.orderNumber}`,
            message: `${createdOrder.items.length} item(s) — ${createdOrder.orderType === 'dine-in' ? 'Dine-In' : 'Takeaway'}`,
            type: 'NEW_ORDER',
            roleTarget: 'kitchen',
            referenceId: createdOrder._id,
            referenceType: 'order',
            createdBy: req.userId,
        });

        invalidateCache('dashboard');
        invalidateCache('analytics');
        updateDailyAnalytics();
        res.status(201).json(createdOrder);
    } catch (error) {
        console.error(`API Error (${error.code || 500}):`, error.message);
        res.status(error.code || 500).json({ message: error.message });
    }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private (Kitchen, Admin, Cashier)
const updateOrderStatus = async (req, res) => {
    const { status } = req.body;
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (req.role === 'kitchen' && status === 'completed') {
            return res.status(403).json({ message: 'Kitchen cannot mark orders as completed' });
        }
        const updates = { orderStatus: status };
        // KOT only closes on payment — not on ready (kitchen keeps ticket visible until paid)
        if (status === 'completed' && order.paymentStatus === 'paid') updates.kotStatus = 'Closed';
        if (status === 'preparing' && !order.prepStartedAt) updates.prepStartedAt = new Date().toISOString();
        if (status === 'ready' && !order.readyAt) updates.readyAt = new Date().toISOString();
        if (status === 'completed' && !order.completedAt) updates.completedAt = new Date().toISOString();

        console.log(`[updateOrderStatus] Processing update for ID=${req.params.id}:`, {
            role: req.role,
            status,
            updates
        });

        const updatedOrder = await Order.updateById(req.params.id, updates);

        // Sync items status for Accepted/Preparing/Ready actions
        if (['accepted', 'preparing', 'ready'].includes(status)) {
            const itemStatus = status.toUpperCase();
            const activeItems = (order.items || []).filter(i => i.status !== 'CANCELLED');
            
            console.log(`[updateOrderStatus] Syncing ${activeItems.length} items to ${itemStatus} for Order=${order._id}`);
            
            await Promise.all(activeItems.map(item => {
                console.log(`  -> Syncing Item ID=${item._id} to ${itemStatus}`);
                return Order.updateItemStatus(order._id, item._id, itemStatus);
            }));
        }

        // Table lifecycle: completed + paid → cleaning
        if (status === 'completed' &&
            order.paymentStatus === 'paid' &&
            order.orderType === 'dine-in' &&
            order.tableId) {
            const tid = rawTableId(order.tableId);
            await Table.updateById(tid, { status: 'cleaning', currentOrderId: null });
            req.app.get('io').to('restaurant_main').emit('table-updated', {
                tableId: tid, status: 'cleaning',
            });
        }

        req.app.get('io').to('restaurant_main').emit('order-updated', updatedOrder);

        if (status === 'ready') {
            createAndEmitNotification(req.app.get('io'), {
                title: `Order #${order.orderNumber} Ready`,
                message: 'Order is ready for pickup/serving',
                type: 'ORDER_READY',
                roleTarget: 'waiter',
                referenceId: order._id,
                referenceType: 'order',
                createdBy: req.userId,
            });
        }

        invalidateCache('dashboard');
        invalidateCache('analytics');
        updateDailyAnalytics();
        res.json(updatedOrder);
    } catch (error) {
        console.error(`API Error (${error.code || 500}):`, error.message);
        res.status(error.code || 500).json({ message: error.message });
    }
};

// @desc    Update individual item status
// @route   PUT /api/orders/:id/items/:itemId/status
// @access  Private (Kitchen, Admin)
const updateItemStatus = async (req, res) => {
    const { status } = req.body;
    const { id, itemId } = req.params;
    try {
        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const item = await Order.getItemById(id, itemId);
        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }
        if (item.status === 'CANCELLED') {
            return res.status(400).json({ message: 'Cannot update status of a cancelled item' });
        }

        const updatedOrder = await Order.updateItemStatus(id, itemId, status);
        
        // Auto-Ready: check if all active items are now READY
        const activeItems = updatedOrder.items.filter(i => i.status !== 'CANCELLED');
        const allReady    = activeItems.length > 0 && activeItems.every(i => i.status?.toUpperCase() === 'READY');
        
        if (allReady && updatedOrder.orderStatus !== 'ready') {
            const finalOrder = await Order.updateById(id, { 
                orderStatus: 'ready',
                readyAt: new Date()
            });
            req.app.get('io').to('restaurant_main').emit('order-updated', finalOrder);
            return res.json(finalOrder);
        }

        req.app.get('io').to('restaurant_main').emit('itemUpdated', updatedOrder);
        req.app.get('io').to('restaurant_main').emit('order-updated', updatedOrder);

        invalidateCache('dashboard');
        invalidateCache('analytics');
        updateDailyAnalytics();
        res.json(updatedOrder);
    } catch (error) {
        console.error(`API Error (${error.code || 500}):`, error.message);
        res.status(error.code || 500).json({ message: error.message });
    }
};

// @desc    Quick payment (inline cashier shortcut)
// @route   PUT /api/orders/:id/payment
// @access  Private (Cashier, Admin)
const processPayment = async (req, res) => {
    const { paymentMethod, amountPaid } = req.body;
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        if (order.paymentStatus === 'paid') {
            return res.json({ success: true, message: 'Payment already processed', order });
        }
        if (order.orderStatus !== 'ready') {
            return res.status(400).json({
                message: 'Payment not allowed. Kitchen process not completed.',
            });
        }

        const method   = paymentMethod || 'cash';
        const received = (amountPaid != null && !isNaN(Number(amountPaid))) ? Number(amountPaid) : order.finalAmount;
        const change   = method === 'cash'
            ? Math.round((received - order.finalAmount) * 100) / 100
            : 0;

        // Check if a payments record already exists (idempotent)
        const existingPayment = await Payment.findByOrderId(req.params.id);
        let payment = existingPayment;
        if (!existingPayment) {
            payment = await Payment.create({
                orderId:        order._id,
                paymentMethod:  method,
                amount:         order.finalAmount,
                amountReceived: received,
                change,
                cashierId:      req.userId,
            });
        }

        const updatedOrder = await Order.updateById(req.params.id, {
            paymentStatus: 'paid',
            paymentMethod: method,
            orderStatus:   'completed',
            kotStatus:     'Closed',
            paymentAt:     new Date(),
            paidAt:        new Date(),
            completedAt:   order.completedAt || new Date(),
        });

        if (order.orderType === 'dine-in' && order.tableId) {
            const tid = rawTableId(order.tableId);
            await Table.updateById(tid, { status: 'cleaning', currentOrderId: null });
            req.app.get('io').to('restaurant_main').emit('table-updated', {
                tableId: tid, status: 'cleaning',
            });
        }

        req.app.get('io').to('restaurant_main').emit('order-updated', updatedOrder);
        req.app.get('io').to('restaurant_main').emit('order-completed', updatedOrder);

        // Audit trail
        PaymentAudit.create({
            orderId:         order._id,
            paymentId:       payment?._id,
            action:          'PAYMENT_PROCESSED',
            status:          'success',
            amount:          order.finalAmount,
            paymentMethod:   method,
            performedBy:     req.userId,
            performedByRole: req.role,
            ipAddress:       req.ip,
            userAgent:       req.get('user-agent'),
            metadata:        { change, orderNumber: order.orderNumber, via: 'quick-payment' },
        }).catch(e => console.error('[orderController] audit log failed:', e.message));

        invalidateCache('dashboard');
        invalidateCache('analytics');
        updateDailyAnalytics();

        res.json({ success: true, message: 'Payment successful & token closed', order: updatedOrder });
    } catch (error) {
        console.error(`API Error (${error.code || 500}):`, error.message);
        res.status(error.code || 500).json({ message: error.message });
    }
};

// @desc    Cancel entire order
// @route   PUT /api/orders/:id/cancel
// @access  Private (Waiter, Kitchen, Admin)
const cancelOrder = async (req, res) => {
    const { reason } = req.body;
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        if (['ready', 'completed', 'cancelled'].includes(order.orderStatus)) {
            if (req.role !== 'admin') {
                return res.status(400).json({
                    message: `Cannot cancel an order that is already ${order.orderStatus}`,
                });
            }
        }

        // Role-based cancellation rules
        if (req.role === 'waiter') {
            if (order.orderStatus !== 'pending') {
                return res.status(403).json({ message: 'Waiters can only cancel pending orders' });
            }
        } else if (req.role === 'kitchen') {
            if (!['pending', 'accepted', 'preparing'].includes(order.orderStatus)) {
                return res.status(403).json({
                    message: 'Kitchen can only cancel orders that are pending or being prepared',
                });
            }
        } else if (!['waiter', 'kitchen', 'admin'].includes(req.role)) {
            return res.status(403).json({ message: 'Your role is not authorized to cancel orders' });
        }

        const updatedOrder = await Order.updateById(req.params.id, {
            orderStatus: 'cancelled',
            kotStatus: 'Closed',
            cancelledBy: req.role.toUpperCase(),
            cancelReason: reason || 'No reason provided',
        });

        if (order.orderType === 'dine-in' && order.tableId) {
            const tid = rawTableId(order.tableId);
            await Table.updateById(tid, { status: 'available', currentOrderId: null });
            req.app.get('io').to('restaurant_main').emit('table-updated', {
                tableId: tid, status: 'available',
            });
        }

        req.app.get('io').to('restaurant_main').emit('orderCancelled', updatedOrder);
        req.app.get('io').to('restaurant_main').emit('order-updated', updatedOrder);

        invalidateCache('dashboard');
        invalidateCache('analytics');
        updateDailyAnalytics();
        res.json(updatedOrder);
    } catch (error) {
        console.error(`API Error (${error.code || 500}):`, error.message);
        res.status(error.code || 500).json({ message: error.message });
    }
};

// @desc    Cancel individual item from order
// @route   PUT /api/orders/:orderId/items/:itemId/cancel
// @access  Private (Waiter, Kitchen)
const cancelOrderItem = async (req, res) => {
    const { id: orderId, itemId } = req.params;
    const { reason } = req.body;

    try {
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const item = await Order.getItemById(orderId, itemId);
        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }

        const currentStatus = item.status?.toUpperCase();
        if (currentStatus === 'CANCELLED') {
            return res.status(400).json({ message: 'Item is already cancelled' });
        }
        if (['READY'].includes(currentStatus)) {
            if (req.role !== 'admin') {
                return res.status(403).json({ message: 'Cannot cancel an item that is already ready' });
            }
        }
        if (order.orderStatus === 'ready') {
            if (req.role !== 'admin') {
                return res.status(403).json({ message: 'Cannot cancel items in a ready order' });
            }
        }

        if (req.role === 'waiter' && ['PREPARING'].includes(currentStatus)) {
            return res.status(403).json({
                message: 'Waiters cannot cancel items that are preparing',
            });
        }

        // Cancel the item
        let updatedOrder = await Order.cancelItem(orderId, itemId, {
            cancelledBy: req.role.toUpperCase(),
            cancelReason: reason || 'Item cancelled',
        });

        // Recalculate order totals from remaining active items
        const activeItems    = updatedOrder.items.filter(i => i.status !== 'CANCELLED');
        const newTotalAmount = activeItems.reduce((sum, i) => sum + ((i.price || 0) * (i.quantity || 0)), 0);

        let newTax = 0;
        if (order.totalAmount > 0) {
            const taxRate = order.tax / order.totalAmount;
            newTax = Math.round(newTotalAmount * taxRate * 100) / 100;
        }
        const newFinalAmount = newTotalAmount + newTax - order.discount;

        const orderUpdates = { totalAmount: newTotalAmount, tax: newTax, finalAmount: newFinalAmount };

        if (activeItems.length === 0) {
            orderUpdates.orderStatus = 'cancelled';
            orderUpdates.kotStatus = 'Closed';
        }

        updatedOrder = await Order.updateById(orderId, orderUpdates);

        if (activeItems.length === 0 && order.orderType === 'dine-in' && order.tableId) {
            const tid = rawTableId(order.tableId);
            await Table.updateById(tid, { status: 'available', currentOrderId: null });
            req.app.get('io').to('restaurant_main').emit('table-updated', {
                tableId: tid, status: 'available',
            });
        }

        req.app.get('io').to('restaurant_main').emit('itemUpdated', updatedOrder);
        req.app.get('io').to('restaurant_main').emit('order-updated', updatedOrder);
        invalidateCache('dashboard');
        invalidateCache('analytics');
        updateDailyAnalytics();
        res.json(updatedOrder);
    } catch (error) {
        console.error(`API Error (${error.code || 500}):`, error.message);
        res.status(error.code || 500).json({ message: error.message });
    }
};

const getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found' });
        res.json(order);
    } catch (error) {
        console.error(`API Error (${error.code || 500}):`, error.message);
        res.status(error.code || 500).json({ message: error.message });
    }
};

// @desc    Search orders by orderNumber, customerName, or tableNumber
// @route   GET /api/orders/search?q=<query>
// @access  Private (admin, cashier, waiter)
const searchOrders = async (req, res) => {
    try {
        const q = (req.query.q || '').trim();
        if (!q) return res.json({ orders: [] });
        const limit = Math.min(parseInt(req.query.limit) || 30, 50); // honour client hint, hard-cap at 50
        const orders = await Order.search(q, limit);
        res.json({ orders });
    } catch (error) {
        console.error(`API Error (${error.code || 500}):`, error.message);
        res.status(error.code || 500).json({ message: error.message });
    }
};

// @desc    Add items to an existing order
// @route   PUT /api/orders/:id/add-items
// @access  Private (Waiter, Admin, Cashier)
const addOrderItems = async (req, res) => {
    console.log('[DEBUG] addOrderItems REQ BODY:', JSON.stringify(req.body, null, 2));
    console.log('[DEBUG] addOrderItems ORDER ID:', req.params.id);
    
    const { items, totalAmount, tax, finalAmount } = req.body;
    const { id } = req.params;

    if (!items || items.length === 0) return res.status(400).json({ message: 'No items' });

    try {
        const order = await Order.findById(id);
        if (!order) return res.status(404).json({ message: 'Order not found' });
        
        if (['completed', 'cancelled'].includes(order.orderStatus)) {
            return res.status(400).json({ message: `Cannot add items to ${order.orderStatus} order` });
        }

        const updatedOrder = await Order.addItems(id, items, { totalAmount, tax, finalAmount });

        req.app.get('io').to('restaurant_main').emit('order-updated', updatedOrder);

        createAndEmitNotification(req.app.get('io'), {
            title: `New items on Order #${updatedOrder.orderNumber}`,
            message: `${items.length} new item(s) added`,
            type: 'ORDER_UPDATED',
            roleTarget: 'kitchen',
            referenceId: updatedOrder._id,
            referenceType: 'order',
            createdBy: req.userId,
        });

        invalidateCache('dashboard');
        invalidateCache('analytics');
        updateDailyAnalytics();
        res.json(updatedOrder);
    } catch (error) {
        console.error('[addOrderItems] Failed:', {
            orderId: id,
            errorCode: error?.code,
            errorType: error?.type,
            message: error?.message,
        });
        res.status(500).json({ message: error.message || 'Failed to add items to order' });
    }
};

module.exports = {
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
};
