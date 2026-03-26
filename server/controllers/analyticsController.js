const { databases, databaseId, COLLECTIONS, Query } = require('../config/appwrite');

// ── Label formatter ───────────────────────────────────────────────────────────
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const FULL_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function formatGroupLabel(raw, range) {
    if (raw === null || raw === undefined) return String(raw);
    if (range === 'year') {
        const m = parseInt(raw);
        return FULL_MONTHS[m] ?? String(raw);
    }
    if (range === 'week' || range === 'month') {
        const d = new Date(raw);
        return `${d.getDate()} ${SHORT_MONTHS[d.getMonth()]}`;
    }
    // 'today' / default: raw = hour integer
    return String(raw).padStart(2, '0') + ':00';
}

// ── Shared helper: converts a range string into a start Date ────────────────
function rangeStart(range) {
    const now = new Date();
    switch (range) {
        case 'today':
            { const d = new Date(now); d.setHours(0, 0, 0, 0); return d; }
        case 'week':
            { const d = new Date(now); d.setDate(now.getDate() - 7); d.setHours(0, 0, 0, 0); return d; }
        case 'month':
            { const d = new Date(now); d.setDate(now.getDate() - 30); d.setHours(0, 0, 0, 0); return d; }
        case 'year':
            { const d = new Date(now); d.setFullYear(now.getFullYear() - 1); d.setHours(0, 0, 0, 0); return d; }
        default:
            return null; // no date filter — all time
    }
}

// ── Shared helper: fetch all documents with pagination ──────────────────────
async function fetchAll(collection, queries = []) {
    let all = [];
    let offset = 0;
    const limit = 5000;
    while (true) {
        const resp = await databases.listDocuments(databaseId, collection, [...queries, Query.limit(limit), Query.offset(offset)]);
        all = all.concat(resp.documents);
        if (resp.documents.length < limit) break;
        offset += limit;
        if (offset >= 15000) break; // Safety cap
    }
    return all;
}

/**
 * @desc    Comprehensive analytics summary
 */
const getSummary = async (req, res) => {
    try {
        const { startDate, endDate, range } = req.query;
        const now = new Date();
        let start, end = new Date(now);

        const rs = rangeStart(range);
        if (rs) {
            start = rs;
        } else {
            start = new Date(startDate || new Date().setDate(new Date().getDate() - 30));
            end = new Date(endDate || now);
        }

        const analytics = await fetchAll(COLLECTIONS.daily_analytics, [
            Query.greaterThanEqual('date', start.toISOString()),
            Query.lessThanEqual('date', end.toISOString())
        ]);

        const totalRevenue = analytics.reduce((sum, a) => sum + parseFloat(a.revenue || 0), 0);
        const orderCount = analytics.reduce((sum, a) => sum + parseInt(a.completed_orders || 0), 0);
        const avgOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;

        // Fetch payment method distribution from actual orders in this range
        const orders = await fetchAll(COLLECTIONS.orders, [
            Query.equal('payment_status', 'paid'),
            Query.greaterThanEqual('$createdAt', start.toISOString()),
            Query.lessThanEqual('$createdAt', end.toISOString())
        ]);

        const paymentMethods = { cash: 0, qr: 0, online: 0 };
        orders.forEach(o => {
            const method = (o.payment_method || 'cash').toLowerCase();
            paymentMethods[method] = (paymentMethods[method] || 0) + parseFloat(o.final_amount || 0);
        });

        res.json({
            totalRevenue,
            orderCount,
            avgOrderValue,
            paymentSummary: paymentMethods
        });

    } catch (error) {
        console.error('[analyticsController] getSummary error:', error.message);
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Hourly/Daily revenue distribution
 */
const getHeatmap = async (req, res) => {
    try {
        const { type, range } = req.query;
        const start = rangeStart(range);
        
        const queries = [Query.equal('payment_status', 'paid')];
        if (start) queries.push(Query.greaterThanEqual('$createdAt', start.toISOString()));

        const orders = await fetchAll(COLLECTIONS.orders, queries);

        const stats = {};
        orders.forEach(o => {
            const date = new Date(o.$createdAt);
            const key = type === 'hourly' ? date.getHours() : date.getDay() + 1; // MySQL DAYOFWEEK is 1-7 (Sun-Sat)
            if (!stats[key]) stats[key] = { revenue: 0, count: 0 };
            stats[key].revenue += parseFloat(o.final_amount || 0);
            stats[key].count++;
        });

        const result = Object.entries(stats).map(([key, val]) => ({
            [type === 'hourly' ? 'hour' : 'day']: parseInt(key),
            ...val
        })).sort((a, b) => (a.hour || a.day) - (b.hour || b.day));

        res.json(result);
    } catch (error) {
        console.error('[analyticsController] getHeatmap error:', error.message);
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Waiter productivity ranking
 */
const getWaitersRanking = async (req, res) => {
    try {
        const { range } = req.query;
        const start = rangeStart(range);
        
        const queries = [Query.equal('payment_status', 'paid')];
        if (start) queries.push(Query.greaterThanEqual('$createdAt', start.toISOString()));

        const [orders, users] = await Promise.all([
            fetchAll(COLLECTIONS.orders, queries),
            databases.listDocuments(databaseId, COLLECTIONS.users, [Query.limit(100)])
        ]);

        const userMap = {};
        users.documents.forEach(u => userMap[u.$id] = u.username);

        const ranking = {};
        orders.forEach(o => {
            if (!o.waiter_id) return;
            const waiterName = userMap[o.waiter_id] || 'Unknown';
            if (!ranking[o.waiter_id]) {
                ranking[o.waiter_id] = {
                    waiterName,
                    totalOrders: 0,
                    totalRevenue: 0,
                    totalTime: 0,
                    completedCount: 0
                };
            }
            const r = ranking[o.waiter_id];
            r.totalOrders++;
            r.totalRevenue += parseFloat(o.final_amount || 0);
            
            if (o.completed_at) {
                const start = new Date(o.$createdAt);
                const end = new Date(o.completed_at);
                r.totalTime += (end - start) / 1000;
                r.completedCount++;
            }
        });

        const result = Object.values(ranking).map(r => ({
            waiterName: r.waiterName,
            totalOrders: r.totalOrders,
            totalRevenue: r.totalRevenue,
            avgCompletionTime: r.completedCount > 0 ? (r.totalTime / r.completedCount) / 60 : 0
        })).sort((a, b) => b.totalRevenue - a.totalRevenue);

        res.json(result);
    } catch (error) {
        console.error('[analyticsController] getWaitersRanking error:', error.message);
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Kitchen performance
 */
const getKitchenPerformance = async (req, res) => {
    try {
        const { range } = req.query;
        const startDay = rangeStart(range);
        
        const queries = [
            Query.equal('payment_status', 'paid'),
            Query.isNotNull('completed_at')
        ];
        if (startDay) queries.push(Query.greaterThanEqual('$createdAt', startDay.toISOString()));

        const orders = await fetchAll(COLLECTIONS.orders, queries);

        const groups = {};
        orders.forEach(o => {
            const date = new Date(o.$createdAt);
            let labelKey;
            switch (range) {
                case 'week':
                case 'month': labelKey = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString(); break;
                case 'year':  labelKey = date.getMonth(); break;
                default:      labelKey = date.getHours(); break;
            }

            if (!groups[labelKey]) {
                groups[labelKey] = { totalPrepTime: 0, count: 0, delayedCount: 0 };
            }
            const g = groups[labelKey];
            
            const start = new Date(o.prep_started_at || o.$createdAt);
            const end = new Date(o.ready_at || o.completed_at);
            const prepTime = (end - start) / 1000;
            
            g.totalPrepTime += prepTime;
            g.count++;
            if (prepTime > 1200) g.delayedCount++;
        });

        const result = Object.entries(groups).map(([label, g]) => ({
            label: formatGroupLabel(label, range),
            avgPrepTime: (g.totalPrepTime / g.count) / 60,
            ordersCompleted: g.count,
            delayRate: (g.delayedCount / g.count) * 100
        })).sort((a, b) => {
            if (range === 'week' || range === 'month') return new Date(a.label) - new Date(b.label);
            return parseInt(a.label) - parseInt(b.label);
        });

        res.json(result);
    } catch (error) {
        console.error('[analyticsController] getKitchenPerformance error:', error.message);
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Time-based revenue report
 */
const getReport = async (req, res) => {
    try {
        const { range } = req.query;
        const start = rangeStart(range);
        if (!start) return res.status(400).json({ message: 'Invalid range' });

        if (range === 'today') {
            const orders = await fetchAll(COLLECTIONS.orders, [
                Query.equal('payment_status', 'paid'),
                Query.greaterThanEqual('$createdAt', start.toISOString())
            ]);

            const groups = {};
            orders.forEach(o => {
                const date = new Date(o.$createdAt);
                const labelKey = date.getHours();
                if (!groups[labelKey]) groups[labelKey] = { revenue: 0, orders: 0 };
                groups[labelKey].revenue += parseFloat(o.final_amount || 0);
                groups[labelKey].orders++;
            });

            const result = Object.entries(groups).map(([label, g]) => ({
                label: formatGroupLabel(label, range),
                revenue: g.revenue,
                orders: g.orders
            })).sort((a, b) => parseInt(a.label) - parseInt(b.label));

            return res.json(result);
        }

        const analytics = await fetchAll(COLLECTIONS.daily_analytics, [
            Query.greaterThanEqual('date', start.toISOString())
        ]);

        const result = analytics.map(a => ({
            label: formatGroupLabel(a.date, range),
            revenue: a.revenue,
            orders: a.completed_orders
        })).sort((a, b) => {
            if (range === 'week' || range === 'month') return new Date(a.date) - new Date(b.date);
            return 0; // Already handled for today, year might need more logic but let's keep it simple
        });

        res.json(result);
    } catch (error) {
        console.error('[analyticsController] getReport error:', error.message);
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Per-item performance
 */
const getItemPerformance = async (req, res) => {
    try {
        const { range } = req.query;
        const start = rangeStart(range);
        
        const queries = [Query.equal('payment_status', 'paid')];
        if (start) queries.push(Query.greaterThanEqual('$createdAt', start.toISOString()));

        const orders = await fetchAll(COLLECTIONS.orders, queries);
        const orderIds = orders.map(o => o.$id);

        if (orderIds.length === 0) return res.json([]);

        // O(1) lookup map — avoids O(n²) orders.find() inside item loop
        const ordersMap = new Map(orders.map(o => [o.$id, o]));

        // Batch fetch items in chunks of 100 (Appwrite Query.equal array limit)
        let allItems = [];
        for (let i = 0; i < orderIds.length; i += 100) {
            const chunk = orderIds.slice(i, i + 100);
            const itemsResp = await databases.listDocuments(databaseId, COLLECTIONS.order_items, [
                Query.equal('order_id', chunk),
                Query.notEqual('status', 'CANCELLED'),
                Query.limit(5000)
            ]);
            allItems = allItems.concat(itemsResp.documents);
        }

        const stats = {};
        allItems.forEach(item => {
            const order = ordersMap.get(item.order_id);
            if (!order) return;

            if (!stats[item.name]) {
                stats[item.name] = { totalOrders: 0, totalRevenue: 0, totalPrepTime: 0, prepCount: 0 };
            }
            const s = stats[item.name];
            s.totalOrders += parseInt(item.quantity);
            s.totalRevenue += parseFloat(item.price) * parseInt(item.quantity);
            
            if (order.prep_started_at && (order.ready_at || order.completed_at)) {
                const st = new Date(order.prep_started_at);
                const en = new Date(order.ready_at || order.completed_at);
                s.totalPrepTime += (en - st) / 1000;
                s.prepCount++;
            }
        });

        const result = Object.entries(stats).map(([itemName, s]) => ({
            itemName,
            totalOrders: s.totalOrders,
            totalRevenue: s.totalRevenue,
            avgPrepTime: s.prepCount > 0 ? (s.totalPrepTime / s.prepCount) / 60 : 0
        })).sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 50);

        res.json(result);
    } catch (error) {
        console.error('[analyticsController] getItemPerformance error:', error.message);
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getSummary, getHeatmap, getWaitersRanking, getKitchenPerformance, getReport, getItemPerformance };
