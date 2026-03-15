/**
 * dailyAnalytics.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Utility to aggregate order data from Appwrite `orders` collection and upsert
 * per-day snapshots into `daily_analytics`.
 *
 * Called after every significant order lifecycle event and on server startup
 * for backfilling missing historical dates.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { databases, databaseId, COLLECTIONS, Query } = require('../config/appwrite');

/**
 * Fetch all orders for a given UTC day (handles Appwrite pagination).
 * @param {string} isoDate  - 'YYYY-MM-DD'
 * @returns {Promise<Array>}
 */
async function fetchOrdersForDate(isoDate) {
    const start = new Date(`${isoDate}T00:00:00.000Z`);
    const end   = new Date(`${isoDate}T23:59:59.999Z`);
    let all = [];
    let offset = 0;
    const limit = 100;

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
        if (offset >= 5000) break; // safety cap
    }
    return all;
}

/**
 * Aggregate and upsert daily analytics for one specific date.
 * @param {string|Date|null} date  - 'YYYY-MM-DD', JS Date, or null for today
 * @returns {Promise<void>}
 */
async function refreshDailyAnalytics(date = null) {
    try {
        const isoDate = date
            ? (date instanceof Date ? date.toISOString().slice(0, 10) : String(date).slice(0, 10))
            : new Date().toISOString().slice(0, 10);

        const orders = await fetchOrdersForDate(isoDate);

        let total_orders      = orders.length;
        let completed_orders  = 0;
        let cancelled_orders  = 0;
        let revenue           = 0;
        let dine_in_orders    = 0;
        let takeaway_orders   = 0;

        for (const o of orders) {
            if (o.order_status === 'completed')  completed_orders++;
            if (o.order_status === 'cancelled')  cancelled_orders++;
            if (o.payment_status === 'paid')     revenue += parseFloat(o.final_amount || 0);
            if (o.order_type === 'dine-in')      dine_in_orders++;
            else if (o.order_type === 'takeaway') takeaway_orders++;
        }

        revenue = Math.round(revenue * 100) / 100;
        const denom = completed_orders || total_orders || 1;
        const avg_order_value = Math.round((revenue / denom) * 100) / 100;

        const dayStart = new Date(`${isoDate}T00:00:00.000Z`);
        const dayEnd   = new Date(`${isoDate}T23:59:59.999Z`);

        // Check for existing document
        const existing = await databases.listDocuments(databaseId, COLLECTIONS.daily_analytics, [
            Query.greaterThanEqual('date', dayStart.toISOString()),
            Query.lessThanEqual('date', dayEnd.toISOString()),
            Query.limit(1)
        ]);

        const payload = {
            total_orders,
            completed_orders,
            cancelled_orders,
            revenue,
            avg_order_value,
            dine_in_orders,
            takeaway_orders
        };

        if (existing.total > 0) {
            await databases.updateDocument(databaseId, COLLECTIONS.daily_analytics, existing.documents[0].$id, payload);
        } else {
            await databases.createDocument(databaseId, COLLECTIONS.daily_analytics, 'unique()', {
                date: dayStart.toISOString(),
                ...payload
            });
        }

        console.log(`[dailyAnalytics] Refreshed ${isoDate} — orders: ${total_orders}, revenue: ${revenue}`);
    } catch (err) {
        console.error('[dailyAnalytics] refreshDailyAnalytics failed:', err.message);
    }
}

/**
 * Backfill `daily_analytics` for all dates that have orders but no analytics
 * row yet (or all dates if `forceAll` is true). Run on server startup.
 *
 * @param {boolean} forceAll
 * @returns {Promise<{processed: number, skipped: number}>}
 */
async function backfillDailyAnalytics(forceAll = false) {
    try {
        console.log(`[dailyAnalytics] Starting backfill (forceAll=${forceAll})…`);

        // Get existing analytics dates to skip
        const existingDates = new Set();
        if (!forceAll) {
            let offset = 0;
            while (true) {
                const rows = await databases.listDocuments(databaseId, COLLECTIONS.daily_analytics, [
                    Query.limit(100),
                    Query.offset(offset)
                ]);
                rows.documents.forEach(r => {
                    existingDates.add(new Date(r.date).toISOString().slice(0, 10));
                });
                if (rows.documents.length < 100) break;
                offset += 100;
            }
        }

        // Discover all distinct order dates (fetch oldest orders first, paginate)
        const orderDates = new Set();
        let offset = 0;
        while (true) {
            const resp = await databases.listDocuments(databaseId, COLLECTIONS.orders, [
                Query.orderAsc('$createdAt'),
                Query.limit(100),
                Query.offset(offset)
            ]);
            resp.documents.forEach(o => {
                orderDates.add(new Date(o.$createdAt).toISOString().slice(0, 10));
            });
            if (resp.documents.length < 100) break;
            offset += 100;
            if (offset >= 5000) break;
        }

        if (!orderDates.size) {
            console.log('[dailyAnalytics] No orders found — backfill skipped.');
            return { processed: 0, skipped: 0 };
        }

        let processed = 0;
        let skipped = 0;

        for (const isoDate of [...orderDates].sort()) {
            if (!forceAll && existingDates.has(isoDate)) {
                skipped++;
                continue;
            }
            await refreshDailyAnalytics(isoDate);
            processed++;
        }

        console.log(`[dailyAnalytics] Backfill complete — processed: ${processed}, skipped: ${skipped}`);
        return { processed, skipped };
    } catch (err) {
        console.error('[dailyAnalytics] backfillDailyAnalytics failed:', err.message);
        return { processed: 0, skipped: 0 };
    }
}

module.exports = { refreshDailyAnalytics, backfillDailyAnalytics };
