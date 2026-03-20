const { databases, databaseId, COLLECTIONS, Query } = require('../config/appwrite');

// Debounce handle — collapses bursts of mutations into one aggregation pass
let _debounceTimer = null;

/**
 * Recalculates and updates the daily_analytics table for the current date.
 * Debounced: multiple calls within 10 s are collapsed into a single Appwrite write.
 * This should be called whenever an order is created, completed, or cancelled.
 */
const updateDailyAnalytics = () => {
    if (_debounceTimer) return; // already scheduled
    _debounceTimer = setTimeout(async () => {
        _debounceTimer = null;
        await _runUpdate();
    }, 10_000);
};

const _runUpdate = async () => {
    try {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        // Fetch all orders for today
        // Note: Appwrite listDocuments handles datetime comparisons with ISO strings
        const orders = await fetchAllTodayOrders(startOfDay, endOfDay);

        const stats = {
            date: startOfDay.toISOString(),
            total_orders: orders.length,
            completed_orders: 0,
            cancelled_orders: 0,
            revenue: 0,
            dine_in_orders: 0,
            takeaway_orders: 0,
            avg_order_value: 0
        };

        orders.forEach(order => {
            if (order.order_status === 'completed') {
                stats.completed_orders++;
            }
            if (order.order_status === 'cancelled') {
                stats.cancelled_orders++;
            }
            if (order.payment_status === 'paid') {
                stats.revenue += parseFloat(order.final_amount || 0);
            }
            if (order.order_type === 'dine-in') {
                stats.dine_in_orders++;
            } else if (order.order_type === 'takeaway') {
                stats.takeaway_orders++;
            }
        });

        if (stats.completed_orders > 0) {
            // Usually revenue is based on paid orders, but the user might want avg of completed orders 
            // Here we use the standard: total revenue / number of paid/completed orders
            // Let's use completed_orders for the denominator to get average value of successfully finished transactions
            stats.avg_order_value = stats.revenue / stats.completed_orders;
        } else if (stats.total_orders > 0) {
            stats.avg_order_value = stats.revenue / stats.total_orders;
        }

        // Round revenue and avg_order_value
        stats.revenue = Math.round(stats.revenue * 100) / 100;
        stats.avg_order_value = Math.round(stats.avg_order_value * 100) / 100;

        // Find if a record for today already exists
        const existing = await databases.listDocuments(databaseId, COLLECTIONS.daily_analytics, [
            Query.greaterThanEqual('date', startOfDay.toISOString()),
            Query.lessThanEqual('date', endOfDay.toISOString()),
            Query.limit(1)
        ]);

        if (existing.total > 0) {
            // Update existing
            await databases.updateDocument(
                databaseId,
                COLLECTIONS.daily_analytics,
                existing.documents[0].$id,
                {
                    total_orders: stats.total_orders,
                    completed_orders: stats.completed_orders,
                    cancelled_orders: stats.cancelled_orders,
                    revenue: stats.revenue,
                    avg_order_value: stats.avg_order_value,
                    dine_in_orders: stats.dine_in_orders,
                    takeaway_orders: stats.takeaway_orders
                }
            );
        } else {
            // Create new
            await databases.createDocument(
                databaseId,
                COLLECTIONS.daily_analytics,
                'unique()',
                stats
            );
        }
    } catch (error) {
        console.error('[Analytics] Failed to update daily analytics:', error.message);
    }
};

/**
 * Helper to fetch all orders for the current day, handling pagination
 */
async function fetchAllTodayOrders(start, end) {
    let all = [];
    let offset = 0;
    const limit = 100; // Small batch size for safety

    while (true) {
        const resp = await databases.listDocuments(databaseId, COLLECTIONS.orders, [
            Query.greaterThanEqual('$createdAt', start.toISOString()),
            Query.lessThanEqual('$createdAt', end.toISOString()),
            Query.limit(limit),
            Query.offset(offset)
        ]);
        
        all = all.concat(resp.documents);
        if (resp.documents.length < limit) break;
        offset += limit;
        if (offset >= 5000) break; // Safety cap
    }
    return all;
}

module.exports = { updateDailyAnalytics };
