// ─── Helper: emit to restaurant-wide room ─────────────────────────────────────
const emitNotification = (io, roleTarget, notification) => {
    // Generate a simple unique ID and timestamp for client-side storage
    const payload = {
        _id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: notification.title,
        message: notification.message,
        type: notification.type || 'SYSTEM_ALERT',
        roleTarget: roleTarget || 'all',
        referenceId: notification.referenceId || null,
        referenceType: notification.referenceType || null,
        createdAt: new Date().toISOString(),
        isRead: false
    };

    const targetRoom = (roleTarget && roleTarget !== 'all') ? `role_${roleTarget}` : 'restaurant_main';
    io.to(targetRoom).emit('notification', payload);
    return payload;
};

// ─── Helper: emit (called from other controllers) ──────────
const createAndEmitNotification = async (io, data) => {
    try {
        // No DB storage anymore. Just emit.
        return emitNotification(io, data.roleTarget, data);
    } catch (err) {
        console.error('[Notification] Emit error:', err.message);
        return null;
    }
};

// @desc    Create and broadcast an offer announcement
const createOfferNotification = async (req, res) => {
    try {
        const { title, message, roleTarget } = req.body;
        if (!title || !message) {
            return res.status(400).json({ message: 'Title and message are required' });
        }
        const validTargets = ['kitchen', 'admin', 'waiter', 'cashier', 'all'];
        const target       = validTargets.includes(roleTarget) ? roleTarget : 'all';

        const notification = emitNotification(req.app.get('io'), target, {
            title: title.trim(),
            message: message.trim(),
            type: 'OFFER_ANNOUNCEMENT'
        });

        res.status(201).json({
            success: true,
            message: 'Offer notification broadcasted',
            notification
        });
    } catch (err) {
        console.error('[Notification] Offer broadcast error:', err);
        res.status(500).json({ message: 'Failed to broadcast offer notification' });
    }
};

const testNotification = async (req, res) => {
    try {
        const { type, title, message, roleTarget } = req.body;
        const notification = emitNotification(req.app.get('io'), roleTarget || 'all', {
            title: title || 'Test Notification',
            message: message || 'This is a real-time test notification.',
            type: type || 'SYSTEM_ALERT'
        });
        res.status(201).json({ success: true, notification });
    } catch (err) {
        console.error('[Notification] Test error:', err);
        res.status(500).json({ message: 'Failed to broadcast test notification' });
    }
};

module.exports = {
    createOfferNotification,
    createAndEmitNotification,
    emitNotification,
    testNotification,
};
