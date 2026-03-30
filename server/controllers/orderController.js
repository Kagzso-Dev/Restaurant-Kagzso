const Order        = require('../models/Order');
const Table        = require('../models/Table');
const Payment      = require('../models/Payment');
const PaymentAudit = require('../models/PaymentAudit');
const { createAndEmitNotification } = require('./notificationController');
const { invalidateCache }           = require('../utils/cache');
const { updateDailyAnalytics }      = require('../utils/analytics');
const logger                 = require('../utils/logger');

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

        // logger.debug(`[getOrders] MySQL returned ${orders.length} orders...`);

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
        logger.error('[getOrders] Fatal error:', {
            message: error.message,
            stack: error.stack,
            query: req.query,
            user: { id: req.userId, role: req.role }
        });
        res.status(500).json({ 
            success: false,
            message: error.message || 'Internal Server Error during order retrieval',
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};


// @desc    Create new order
// @route   POST /api/orders
// @access  Private (Waiter, Cashier, Admin)
const createOrder = async (req, res) => {
    const { orderType, tableId, customerInfo, items, totalAmount, tax, discount, finalAmount } = req.body;

    if (!items || items.length === 0) {
        console.warn('[DEBUG] Rejecting order: No items provided.');
        return res.status(400).json({ message: 'No order items' });
    }

    const missingName = items.find(i => !i.name?.trim());
    if (missingName) {
        return res.status(400).json({ message: `Order item is missing a name (menuItemId: ${missingName.menuItemId || 'unknown'})` });
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
        if (status === 'ready') updates.isPartiallyReady = false;
        if (status === 'completed' && !order.completedAt) updates.completedAt = new Date().toISOString();

        // Heal: if order_number is null (required field), Appwrite rejects any update on this document
        if (!order.orderNumber) {
            const Counter = require('../models/Counter');
            const seq = await Counter.getNextSequence('tokenNumber_global');
            updates.orderNumber = `ORD-${seq}`;
        }


        // 1. If we are marking as Accepted/Preparing/Ready, sync all items FIRST
        if (['accepted', 'preparing', 'ready'].includes(status)) {
            const itemStatus = status.toUpperCase();
            // Filter out items that are already cancelled
            const activeItems = (order.items || []).filter(i => i.status?.toUpperCase() !== 'CANCELLED');
            
            await Promise.all(activeItems.map(item => {
                return Order.updateItemStatus(order._id, item._id, itemStatus);
            }));
        }

        // 2. Perform the main order status update
        const updatedOrder = await Order.updateById(req.params.id, updates);

        // 3. Table lifecycle: completed + paid → cleaning
        if (status === 'completed' &&
            order.paymentStatus === 'paid' &&
            order.orderType === 'dine-in' &&
            order.tableId) {
            const tid = rawTableId(order.tableId);
            await Table.updateById(tid, { status: 'cleaning', currentOrderId: null });
            req.app.get('io').to('restaurant_main').emit('table-updated', {
                tableId: tid, status: 'cleaning', currentOrderId: null, lockedBy: null
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
        
        // Dynamic Status Calculation (Min-Status Logic)
        const activeItems = updatedOrder.items.filter(i => i.status?.toUpperCase() !== 'CANCELLED');
        const itemStatuses = activeItems.map(i => (i.status || 'PENDING').toUpperCase());
        
        let newOrderStatus = updatedOrder.orderStatus;
        
        if (activeItems.length === 0) {
            newOrderStatus = 'cancelled';
        } else if (itemStatuses.some(s => s === 'PENDING')) {
            newOrderStatus = 'pending';
        } else if (itemStatuses.some(s => s === 'ACCEPTED')) {
            newOrderStatus = 'accepted';
        } else if (itemStatuses.some(s => s === 'PREPARING')) {
            newOrderStatus = 'preparing';
        } else if (itemStatuses.every(s => s === 'READY')) {
            newOrderStatus = 'ready';
        }

        if (newOrderStatus !== updatedOrder.orderStatus) {
            const finalOrder = await Order.updateById(id, {
                orderStatus: newOrderStatus,
                // When order becomes fully ready, clear the partial-ready flag
                ...(newOrderStatus === 'ready' && { readyAt: new Date().toISOString(), isPartiallyReady: false }),
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
        if (order.orderStatus !== 'ready' || order.isPartiallyReady) {
            return res.status(400).json({
                message: order.isPartiallyReady 
                    ? 'Payment not allowed. New items are still being prepared.'
                    : 'Payment not allowed. Kitchen process not completed.',
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
                tableId: tid, status: 'cleaning', currentOrderId: null, lockedBy: null
            });
        }

        req.app.get('io').to('restaurant_main').emit('order-updated', updatedOrder);
        req.app.get('io').to('restaurant_main').emit('order-completed', updatedOrder);
        req.app.get('io').to('restaurant_main').emit('payment-success', {
            orderId:       updatedOrder._id,
            orderNumber:   updatedOrder.orderNumber,
            paymentMethod: method,
            amount:        updatedOrder.finalAmount
        });

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
                tableId: tid, status: 'available', currentOrderId: null, lockedBy: null
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
        if (order.orderStatus === 'ready' && currentStatus !== 'PENDING') {
            if (req.role !== 'admin') {
                return res.status(403).json({ message: 'Cannot cancel items in a ready order' });
            }
        }

        // Waiters may only cancel their own PENDING items before kitchen acceptance
        if (req.role?.toLowerCase() === 'waiter' && currentStatus !== 'PENDING') {
            return res.status(403).json({
                message: 'Waiters cannot cancel items once the kitchen has accepted them',
            });
        }

        // Cancel the item
        let updatedOrder = await Order.cancelItem(orderId, itemId, {
            cancelledBy: req.role.toUpperCase(),
            cancelReason: reason || 'Item cancelled',
        });

        // Dynamic Aggregate Status Calculation
        const nonCancelledItems = updatedOrder.items.filter(i => i.status?.toUpperCase() !== 'CANCELLED');
        const itemStatuses = nonCancelledItems.map(i => (i.status || 'PENDING').toUpperCase());
        
        let newOrderStatus = updatedOrder.orderStatus;
        let kotStatus = updatedOrder.kotStatus || 'Open';

        if (nonCancelledItems.length === 0) {
            newOrderStatus = 'cancelled';
            kotStatus = 'Closed';
        } else if (itemStatuses.some(s => s === 'PENDING')) {
            newOrderStatus = 'pending';
        } else if (itemStatuses.some(s => s === 'ACCEPTED')) {
            newOrderStatus = 'accepted';
        } else if (itemStatuses.some(s => s === 'PREPARING')) {
            newOrderStatus = 'preparing';
        } else if (itemStatuses.every(s => s === 'READY')) {
            newOrderStatus = 'ready';
        }

        // Recalculate order totals from scratch (USER PRO-TIP Logic)
        const subtotalSum = nonCancelledItems.reduce((sum, i) => sum + (parseFloat(i.price) * parseInt(i.quantity)), 0);
        const taxRate = (parseFloat(order.totalAmount) > 0) ? (parseFloat(order.tax) / parseFloat(order.totalAmount)) : 0.05;
        const newTax = parseFloat((subtotalSum * taxRate).toFixed(2));
        const newFinal = parseFloat((subtotalSum + newTax - (parseFloat(order.discount) || 0)).toFixed(2));

        const orderUpdates = {
            totalAmount: subtotalSum,
            tax: newTax,
            finalAmount: newFinal,
            orderStatus: newOrderStatus,
            kotStatus: kotStatus,
            // Clear the partially-ready flag once all remaining items are back to ready
            isPartiallyReady: newOrderStatus === 'ready' ? false : updatedOrder.isPartiallyReady,
            ...(newOrderStatus === 'ready' && !order.readyAt && { readyAt: new Date().toISOString() })
        };

        updatedOrder = await Order.updateById(orderId, orderUpdates);



        if (nonCancelledItems.length === 0 && order.orderType === 'dine-in' && order.tableId) {
            const tid = rawTableId(order.tableId);
            await Table.updateById(tid, { status: 'available', currentOrderId: null });
            req.app.get('io').to('restaurant_main').emit('table-updated', {
                tableId: tid, status: 'available', currentOrderId: null, lockedBy: null
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
    
    const { items, totalAmount, tax, finalAmount } = req.body;
    const { id } = req.params;

    if (!items || items.length === 0) return res.status(400).json({ message: 'No items' });

    const missingName = items.find(i => !i.name?.trim());
    if (missingName) {
        return res.status(400).json({ message: `Item is missing a name (menuItemId: ${missingName.menuItemId || 'unknown'})` });
    }

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
