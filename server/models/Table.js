const { databases, databaseId, COLLECTIONS, ID, Query } = require('../config/appwrite');

const fmt = (doc) => {
    if (!doc) return null;
    return {
        _id: doc.$id,
        number: doc.number,
        capacity: doc.capacity,
        status: doc.status,
        currentOrderId: doc.current_order_id || null,
        lockedBy: doc.locked_by || null,
        reservedAt: doc.reserved_at || null,
        reservationExpiresAt: doc.reservation_expires_at || null,
        createdAt: doc.$createdAt,
        updatedAt: doc.$updatedAt,
    };
};

let tableMapCache = null;
let cacheExpiry = 0;

const Table = {
    // ── Internal helper for efficient table number lookups ──────────────────
    async getTableMap() {
        const now = Date.now();
        if (tableMapCache && now < cacheExpiry) return tableMapCache;

        const all = await this.findAll();
        const map = {};
        all.forEach(t => map[t._id] = t.number);
        
        tableMapCache = map;
        cacheExpiry = now + (60 * 60 * 1000); // 1 hour cache
        return map;
    },

    async clearMapCache() {
        tableMapCache = null;
    },

    async findAll() {
        const response = await databases.listDocuments(
            databaseId,
            COLLECTIONS.tables,
            [Query.orderAsc('number'), Query.limit(100)]
        );
        return response.documents.map(fmt);
    },

    async findById(id) {
        try {
            const doc = await databases.getDocument(databaseId, COLLECTIONS.tables, id);
            return fmt(doc);
        } catch (error) {
            return null;
        }
    },

    async numberExists(number) {
        const response = await databases.listDocuments(
            databaseId,
            COLLECTIONS.tables,
            [Query.equal('number', number), Query.limit(1)]
        );
        return response.total > 0;
    },

    async create({ number, capacity }) {
        const doc = await databases.createDocument(
            databaseId,
            COLLECTIONS.tables,
            ID.unique(),
            {
                number: parseInt(number),
                capacity: parseInt(capacity),
                status: 'available'
            }
        );
        return fmt(doc);
    },

    async updateById(id, updates) {
        const fieldMap = {
            status: 'status',
            currentOrderId: 'current_order_id',
            lockedBy: 'locked_by',
            reservedAt: 'reserved_at',
            reservationExpiresAt: 'reservation_expires_at',
        };
        const data = {};
        for (const [key, val] of Object.entries(updates)) {
            const col = fieldMap[key] || key;
            data[col] = val === undefined ? null : val;
        }
        if (Object.keys(data).length === 0) return this.findById(id);
        
        const doc = await databases.updateDocument(
            databaseId,
            COLLECTIONS.tables,
            id,
            data
        );
        return fmt(doc);
    },

    // Atomic reserve: emulated with read-then-check
    async atomicReserve(id, lockedBy) {
        try {
            const table = await databases.getDocument(databaseId, COLLECTIONS.tables, id);
            if (table.status !== 'available') return null;

            const updated = await databases.updateDocument(
                databaseId,
                COLLECTIONS.tables,
                id,
                {
                    status: 'reserved',
                    locked_by: lockedBy,
                    reserved_at: new Date().toISOString()
                }
            );
            return fmt(updated);
        } catch (error) {
            return null;
        }
    },

    async deleteById(id) {
        await databases.deleteDocument(databaseId, COLLECTIONS.tables, id);
    },

    async findExpiredReservations(cutoff) {
        const response = await databases.listDocuments(
            databaseId,
            COLLECTIONS.tables,
            [
                Query.equal('status', 'reserved'),
                Query.lessThan('reserved_at', cutoff instanceof Date ? cutoff.toISOString() : cutoff),
                Query.isNull('current_order_id')
            ]
        );
        return response.documents.map(fmt);
    },
};

module.exports = Table;
