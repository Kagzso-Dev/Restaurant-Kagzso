const { databases, databaseId, COLLECTIONS, ID, Query } = require('../config/appwrite');
const Counter    = require('./Counter');

// ─── Document formatters ──────────────────────────────────────────────────────────

const fmtItem = (doc) => ({
    _id:          doc.$id,
    menuItemId:   doc.menu_item_id,
    name:         doc.name,
    price:        parseFloat(doc.price),
    quantity:     doc.quantity,
    notes:        doc.notes,
    status:       doc.status,
    cancelledBy:  doc.cancelled_by,
    cancelReason: doc.cancel_reason,
    cancelledAt:  doc.cancelled_at,
    addedAt:      doc.$createdAt,
    createdAt:    doc.$createdAt,
});

const fmtOrder = (doc, items = [], tableNum = null) => ({
    _id:           doc.$id,
    orderNumber:   doc.order_number,
    tokenNumber:   doc.token_number,
    orderType:     doc.order_type,
    tableId:       doc.table_id
        ? { _id: doc.table_id, number: tableNum || doc.table_id }
        : null,
    customerInfo:  { name: doc.customer_name || null, phone: doc.customer_phone || null },
    items,
    orderStatus:   doc.order_status,
    paymentStatus: doc.payment_status,
    paymentMethod: doc.payment_method,
    kotStatus:     doc.kot_status,
    totalAmount:   parseFloat(doc.total_amount),
    tax:           parseFloat(doc.tax    || 0),
    discount:      parseFloat(doc.discount || 0),
    finalAmount:   parseFloat(doc.final_amount),
    waiterId:      doc.waiter_id,
    prepStartedAt: doc.prep_started_at,
    readyAt:       doc.ready_at,
    completedAt:   doc.completed_at,
    paymentAt:     doc.payment_at,
    paidAt:        doc.paid_at,
    cancelledBy:   doc.cancelled_by,
    cancelReason:  doc.cancel_reason,
    createdAt:     doc.$createdAt,
    updatedAt:     doc.$updatedAt,
});

const loadItems = async (orderId) => {
    const response = await databases.listDocuments(
        databaseId,
        COLLECTIONS.order_items,
        [Query.equal('order_id', orderId), Query.orderAsc('$createdAt'), Query.limit(100)]
    );
    return response.documents.map(fmtItem);
};

// ─── Order model ─────────────────────────────────────────────────────────────

const Order = {

    async findById(id) {
        try {
            const doc = await databases.getDocument(databaseId, COLLECTIONS.orders, id);
            let tableNum = null;
            if (doc.table_id) {
                try {
                    const table = await databases.getDocument(databaseId, COLLECTIONS.tables, doc.table_id);
                    tableNum = table.number;
                } catch (e) {}
            }
            const items = await loadItems(id);
            return fmtOrder(doc, items, tableNum);
        } catch (error) {
            // 404 from Appwrite means the document genuinely doesn't exist → return null
            // Any other error (permissions, network, schema) should surface, not hide
            if (error?.code === 404) {
                console.warn(`[Order.findById] No document found in Appwrite for id="${id}" — collection="${COLLECTIONS.orders}" db="${databaseId}"`);
                return null;
            }
            console.error(`[Order.findById] Appwrite exception for id="${id}":`, {
                code: error?.code,
                message: error?.message,
                type: error?.type,
                db: databaseId,
                collection: COLLECTIONS.orders,
            });
            throw error;
        }
    },

    async findOne(conditions) {
        const queries = [];
        for (const [key, val] of Object.entries(conditions)) {
            queries.push(Query.equal(key, val));
        }
        queries.push(Query.limit(1));
        
        const response = await databases.listDocuments(databaseId, COLLECTIONS.orders, queries);
        if (response.total === 0) return null;
        
        const doc = response.documents[0];
        let tableNum = null;
        if (doc.table_id) {
            try {
                const table = await databases.getDocument(databaseId, COLLECTIONS.tables, doc.table_id);
                tableNum = table.number;
            } catch (e) {}
        }
        const items = await loadItems(doc.$id);
        return fmtOrder(doc, items, tableNum);
    },

    async find(filter = {}, { skip = 0, limit = 50 } = {}) {
        const queries = buildQueries(filter);
        queries.push(Query.orderDesc('$createdAt'));
        queries.push(Query.limit(parseInt(limit)));
        queries.push(Query.offset(parseInt(skip)));

        const response = await databases.listDocuments(databaseId, COLLECTIONS.orders, queries);
        if (response.total === 0) return [];

        const orderIds = response.documents.map(r => r.$id);
        const [itemsResp, tablesResp] = await Promise.all([
            databases.listDocuments(databaseId, COLLECTIONS.order_items, [
                Query.equal('order_id', orderIds),
                Query.limit(1000)
            ]),
            databases.listDocuments(databaseId, COLLECTIONS.tables, [Query.limit(100)])
        ]);

        const itemsByOrderId = {};
        for (const item of itemsResp.documents) {
            if (!itemsByOrderId[item.order_id]) itemsByOrderId[item.order_id] = [];
            itemsByOrderId[item.order_id].push(fmtItem(item));
        }

        const tableMap = {};
        tablesResp.documents.forEach(t => tableMap[t.$id] = t.number);

        return response.documents.map(doc => fmtOrder(doc, itemsByOrderId[doc.$id] || [], tableMap[doc.table_id]));
    },

    async count(filter = {}) {
        const queries = buildQueries(filter);
        queries.push(Query.limit(1));
        const response = await databases.listDocuments(databaseId, COLLECTIONS.orders, queries);
        return response.total;
    },

    async countAll() {
        const response = await databases.listDocuments(databaseId, COLLECTIONS.orders, [Query.limit(1)]);
        return response.total;
    },

    async create(data) {
        console.log('[DEBUG] Executing Order.create() with data:', JSON.stringify(data, null, 2));

        // 1. Format and validate Enum Values
        let rawType = String(data.orderType || '').toLowerCase().replace('_', '-');
        const orderType = ['dine-in', 'takeaway'].includes(rawType) ? rawType : 'dine-in';
        
        const orderStatus = 'pending';
        const paymentStatus = 'pending';

        // 2. Validate required numeric values & Defaults
        const totalAmount = Number(data.totalAmount) || 0;
        const tax = Number(data.tax) || 0;
        const discount = Number(data.discount) || 0;
        let finalAmount = Number(data.finalAmount);
        if (isNaN(finalAmount) || finalAmount === 0) {
            finalAmount = totalAmount - discount + tax;
        }

        // 3. Validate relationships: existing menu_item_ids
        // Appwrite $id is a system field — use getDocument per item, not Query.equal('$id')
        if (data.items && data.items.length > 0) {
            const menuItemIds = data.items.map(item => item.menuItemId).filter(Boolean);
            console.log(`[DEBUG] Validating menu items: ${menuItemIds.join(', ')}`);

            const invalidIds = [];
            await Promise.all(menuItemIds.map(async (mid) => {
                try {
                    await databases.getDocument(databaseId, COLLECTIONS.menu_items, mid);
                } catch {
                    invalidIds.push(mid);
                }
            }));

            if (invalidIds.length > 0) {
                const errorMsg = `Invalid menu_item_id(s): ${invalidIds.join(', ')}. Ensure all items exist in the database.`;
                console.error(`[ERROR] ${errorMsg}`);
                throw new Error(errorMsg);
            }
        }

        const seq = await Counter.getNextSequence('tokenNumber_global');
        const orderNumber = `ORD-${seq}`;
        
        try {
            const orderDoc = await databases.createDocument(
                databaseId,
                COLLECTIONS.orders,
                ID.unique(),
                {
                    order_number: orderNumber,
                    token_number: seq,
                    order_type: orderType,
                    table_id: data.tableId || null,
                    customer_name: data.customerInfo?.name || null,
                    customer_phone: data.customerInfo?.phone || null,
                    total_amount: parseFloat(data.totalAmount),
                    tax: parseFloat(data.tax || 0),
                    discount: parseFloat(data.discount || 0),
                    final_amount: parseFloat(data.finalAmount),
                    waiter_id: data.waiterId || null,
                    order_status: 'pending',
                    payment_status: 'pending',
                    payment_method: data.paymentMethod || null,
                    kot_status: 'Open'
                }
            );

            const orderId = orderDoc.$id;
            for (const item of data.items) {
                await databases.createDocument(
                    databaseId,
                    COLLECTIONS.order_items,
                    ID.unique(),
                    {
                        order_id: orderId,
                        menu_item_id: item.menuItemId,
                        name: item.name,
                        price: parseFloat(item.price),
                        quantity: parseInt(item.quantity),
                        notes: item.notes || null,
                        status: 'PENDING'
                    }
                );
            }
            
            return this.findById(orderId);
        } catch (err) {
            console.error('Order creation failed:', err);
            throw err;
        }
    },

    async updateById(id, updates) {
        const fieldMap = {
            orderStatus: 'order_status',
            paymentStatus: 'payment_status',
            paymentMethod: 'payment_method',
            kotStatus: 'kot_status',
            totalAmount: 'total_amount',
            tax: 'tax',
            discount: 'discount',
            finalAmount: 'final_amount',
            prepStartedAt: 'prep_started_at',
            readyAt: 'ready_at',
            completedAt: 'completed_at',
            paymentAt: 'payment_at',
            paidAt: 'paid_at',
            cancelledBy: 'cancelled_by',
            cancelReason: 'cancel_reason',
        };
        
        const data = {};
        for (const [key, val] of Object.entries(updates)) {
            const col = fieldMap[key] || key;
            data[col] = val === undefined ? null : val;
        }
        
        if (Object.keys(data).length === 0) return this.findById(id);
        
        await databases.updateDocument(databaseId, COLLECTIONS.orders, id, data);
        return this.findById(id);
    },

    async atomicPaymentStatusUpdate(id, fromStatus, toStatus) {
        try {
            const doc = await databases.getDocument(databaseId, COLLECTIONS.orders, id);
            if (doc.payment_status !== fromStatus) return null;

            const updated = await databases.updateDocument(databaseId, COLLECTIONS.orders, id, {
                payment_status: toStatus
            });
            return this.findById(id);
        } catch (error) {
            return null;
        }
    },

    async getItemById(orderId, itemId) {
        try {
            const doc = await databases.getDocument(databaseId, COLLECTIONS.order_items, itemId);
            if (doc.order_id !== orderId) return null;
            return fmtItem(doc);
        } catch (error) {
            return null;
        }
    },

    async updateItemStatus(orderId, itemId, status) {
        await databases.updateDocument(databaseId, COLLECTIONS.order_items, itemId, {
            status: status
        });
        return this.findById(orderId);
    },

    async cancelItem(orderId, itemId, { cancelledBy, cancelReason }) {
        await databases.updateDocument(databaseId, COLLECTIONS.order_items, itemId, {
            status: 'CANCELLED',
            cancelled_by: cancelledBy,
            cancel_reason: cancelReason,
            cancelled_at: new Date().toISOString()
        });
        return this.findById(orderId);
    },

    async search(q, limit = 30) {
        // Appwrite search is restricted. We'll search by order number primarily, 
        // or just fetch recent and filter in memory if needed. 
        // For now, let's try searching order_number and customer_name.
        const response = await databases.listDocuments(
            databaseId,
            COLLECTIONS.orders,
            [
                Query.or([
                    Query.equal('order_number', q),
                    Query.search('customer_name', q)
                ]),
                Query.orderDesc('$createdAt'),
                Query.limit(parseInt(limit))
            ]
        );
        
        if (response.total === 0) return [];
        
        const orderIds = response.documents.map(r => r.$id);
        const [itemsResp, tablesResp] = await Promise.all([
            databases.listDocuments(databaseId, COLLECTIONS.order_items, [
                Query.equal('order_id', orderIds),
                Query.limit(1000)
            ]),
            databases.listDocuments(databaseId, COLLECTIONS.tables, [Query.limit(100)])
        ]);

        const itemsByOrderId = {};
        for (const item of itemsResp.documents) {
            if (!itemsByOrderId[item.order_id]) itemsByOrderId[item.order_id] = [];
            itemsByOrderId[item.order_id].push(fmtItem(item));
        }

        const tableMap = {};
        tablesResp.documents.forEach(t => tableMap[t.$id] = t.number);

        return response.documents.map(doc => fmtOrder(doc, itemsByOrderId[doc.$id] || [], tableMap[doc.table_id]));
    },

    async addItems(orderId, items, { totalAmount, tax, finalAmount }) {
        // 1. Fetch latest order to ensure we have current totals
        const order = await databases.getDocument(databaseId, COLLECTIONS.orders, orderId);
        if (['completed', 'cancelled'].includes(order.order_status)) {
            throw new Error(`Cannot add items to ${order.order_status} order`);
        }

        // 2. Insert new items into database
        for (const item of items) {
            // Senior Validation Guard
            if (!item.name || item.price === undefined || item.quantity === undefined) {
                console.warn("[DEBUG] Invalid item data received:", item);
                throw new Error(`Incomplete item details for "${item.name || 'Unknown'}"`);
            }

            try {
                await databases.createDocument(
                    databaseId,
                    COLLECTIONS.order_items,
                    ID.unique(),
                    {
                        order_id: orderId,
                        menu_item_id: item.menuItemId || null,
                        name: item.name,
                        price: parseFloat(item.price),
                        quantity: parseInt(item.quantity),
                        notes: item.notes || null,
                        status: 'PENDING'
                    }
                );
            } catch (err) {
                console.error(`[Order.addItems] Failed to insert item "${item.name}":`, err?.message || err);
                throw err;
            }
        }

        // 3. Recalculate totals from ALL items (old and new)
        const allItems = await loadItems(orderId);
        const activeItems = allItems.filter(i => i.status !== 'CANCELLED');
        
        const rawTotal = activeItems.reduce((sum, item) => sum + (parseFloat(item.price) * parseInt(item.quantity)), 0);
        const newTotalAmount = parseFloat(rawTotal.toFixed(2));

        // Recalculate tax based on previous order's tax rate or system default
        const oldTotal = parseFloat(order.total_amount) || 0;
        const oldTax = parseFloat(order.tax) || 0;
        const currentTaxRate = oldTotal > 0 ? (oldTax / oldTotal) : 0.05;
        
        const newTax = parseFloat((newTotalAmount * currentTaxRate).toFixed(2));
        const newFinalAmount = parseFloat((newTotalAmount + newTax - (parseFloat(order.discount) || 0)).toFixed(2));

        const updates = {
            total_amount: newTotalAmount,
            tax: newTax,
            final_amount: newFinalAmount,
        };

        // 4. Update status if necessary
        if (order.order_status === 'ready' || order.order_status === 'accepted') {
            updates.order_status = 'preparing';
        }

        await databases.updateDocument(databaseId, COLLECTIONS.orders, orderId, updates);
        return this.findById(orderId);
    },
};

// ─── Query builder ─────────────────────────────────────────────────────
function buildQueries(filter) {
    const queries = [];
    if (filter.kotStatus !== undefined) {
        if (filter.kotStatus && typeof filter.kotStatus === 'object' && filter.kotStatus.$ne) {
            queries.push(Query.notEqual('kot_status', filter.kotStatus.$ne));
        } else if (filter.kotStatus) {
            queries.push(Query.equal('kot_status', filter.kotStatus));
        }
    }
    if (filter.orderStatus !== undefined) {
        if (filter.orderStatus && typeof filter.orderStatus === 'object' && filter.orderStatus.$in) {
            queries.push(Query.equal('order_status', filter.orderStatus.$in));
        } else if (filter.orderStatus) {
            queries.push(Query.equal('order_status', filter.orderStatus));
        }
    }
    if (filter.paymentStatus) {
        queries.push(Query.equal('payment_status', filter.paymentStatus));
    }
    return queries;
}

module.exports = Order;
