const { databases, databaseId, COLLECTIONS, Query } = require('../config/appwrite');

/**
 * @desc    Calculate revenue growth (today vs yesterday)
 * @route   GET /api/dashboard/growth
 * @access  Private (admin only)
 */
const getGrowth = async (req, res) => {
    try {
        const now = new Date();

        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(now);
        todayEnd.setHours(23, 59, 59, 999);

        const yesterdayStart = new Date(todayStart);
        yesterdayStart.setDate(yesterdayStart.getDate() - 1);
        const yesterdayEnd = new Date(todayStart);
        yesterdayEnd.setMilliseconds(-1);

        const [todayResp, yestResp] = await Promise.all([
            databases.listDocuments(databaseId, COLLECTIONS.orders, [
                Query.equal('payment_status', 'paid'),
                Query.between('$createdAt', todayStart.toISOString(), todayEnd.toISOString()),
                Query.limit(5000) // Adjust limit as needed
            ]),
            databases.listDocuments(databaseId, COLLECTIONS.orders, [
                Query.equal('payment_status', 'paid'),
                Query.between('$createdAt', yesterdayStart.toISOString(), yesterdayEnd.toISOString()),
                Query.limit(5000)
            ]),
        ]);

        const sumRevenue = (docs) => docs.reduce((sum, doc) => sum + parseFloat(doc.final_amount || 0), 0);

        const todayRevenue = sumRevenue(todayResp.documents);
        const yesterdayRevenue = sumRevenue(yestResp.documents);
        const todayCount = todayResp.total;
        const yesterdayCount = yestResp.total;

        let growth = 0;
        if (yesterdayRevenue === 0 && todayRevenue > 0) {
            growth = 100;
        } else if (yesterdayRevenue > 0) {
            growth = ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100;
        }
        growth = Math.round(growth * 10) / 10;

        res.json({
            growth,
            today: todayRevenue,
            yesterday: yesterdayRevenue,
            todayCount,
            yesterdayCount,
            period: 'daily',
        });
    } catch (error) {
        console.error('[dashboardController] getGrowth error:', error.message);
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Get today's order stats
 * @route   GET /api/dashboard/stats
 * @access  Private (admin only)
 */
const getStats = async (req, res) => {
    try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const [statusResp, totalResp] = await Promise.all([
            databases.listDocuments(databaseId, COLLECTIONS.orders, [
                Query.greaterThanEqual('$createdAt', todayStart.toISOString()),
                Query.limit(5000)
            ]),
            databases.listDocuments(databaseId, COLLECTIONS.orders, [Query.limit(1)]),
        ]);

        const byStatus = {};
        statusResp.documents.forEach(doc => {
            const status = doc.order_status;
            if (!byStatus[status]) {
                byStatus[status] = { count: 0, revenue: 0 };
            }
            byStatus[status].count++;
            byStatus[status].revenue += parseFloat(doc.final_amount || 0);
        });

        const todayStats = {
            active: (byStatus.pending?.count || 0)
                + (byStatus.accepted?.count || 0)
                + (byStatus.preparing?.count || 0)
                + (byStatus.ready?.count || 0),
            completed: byStatus.completed?.count || 0,
            cancelled: byStatus.cancelled?.count || 0,
            revenue: byStatus.completed?.revenue || 0,
        };

        res.json({
            today: {
                active: (byStatus.pending?.count || 0)
                    + (byStatus.accepted?.count || 0)
                    + (byStatus.preparing?.count || 0)
                    + (byStatus.ready?.count || 0),
                completed: byStatus.completed?.count || 0,
                cancelled: byStatus.cancelled?.count || 0,
                revenue: byStatus.completed?.revenue || 0,
            },
            allTime: totalResp.total,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getGrowth, getStats };
