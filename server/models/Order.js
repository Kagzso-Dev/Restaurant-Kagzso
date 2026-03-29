const { databases, databaseId, COLLECTIONS, ID, Query } = require('../config/appwrite');
const Counter = require('./Counter');
const Table = require('./Table');


// ─── Document formatters ──────────────────────────────────────────────────────────

const fmtItem = (doc) => ({
    _id: doc.$id,
    menuItemId: doc.menu_item_id,
    name: doc.name,
    price: parseFloat(doc.price),
    quantity: doc.quantity,
    notes: doc.notes,
    variant: doc.variant ? JSON.parse(doc.variant) : null,
    status: doc.status,
    cancelledBy: doc.cancelled_by,
    cancelReason: doc.cancel_reason,
    cancelledAt: doc.cancelled_at,
    isNewlyAdded: !!doc.is_newly_added,
    addedAt: doc.$createdAt,
    createdAt: doc.$createdAt,
});

const fmtOrder = (doc, items = [], tableNum = null) => ({
    _id: doc.$id,
    orderNumber: doc.order_number,
    tokenNumber: doc.token_number,
    orderType: doc.order_type,
    tableId: doc.table_id
        ? { _id: doc.table_id, number: tableNum || doc.table_id }
        : null,
    customerInfo: { name: doc.customer_name || null, phone: doc.customer_phone || null },
    items,
    orderStatus: doc.order_status,
    paymentStatus: doc.payment_status,
    paymentMethod: doc.payment_method,
    kotStatus: doc.kot_status,
    totalAmount: parseFloat(doc.total_amount),
    tax: parseFloat(doc.tax || 0),
    discount: parseFloat(doc.discount || 0),
    discountLabel: doc.discount_label || '',
    finalAmount: parseFloat(doc.final_amount),
    waiterId: doc.waiter_id,
    prepStartedAt: doc.prep_started_at,
    isPartiallyReady: !!doc.is_partially_ready,
    readyAt: doc.ready_at,
    completedAt: doc.completed_at,
    paymentAt: doc.payment_at,
    paidAt: doc.paid_at,
    cancelledBy: doc.cancelled_by,
    cancelReason: doc.cancel_reason,
    createdAt: doc.$createdAt,
    updatedAt: doc.$updatedAt,
});

const loadItems = async (orderId) => {
    const response = await databases.listDocuments(
        databaseId,
        COLLECTIONS.order_items,
        [Query.equal('order_id', orderId), Query.orderAsc('$createdAt'), Query.limit(100)]
    );
    return response.documents.map(fmtItem);
};

const orderLocks = new Set();

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
                } catch (e) { }
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
            } catch (e) { }
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
        if (response.documents.length === 0) return [];

        const orderIds = response.documents.map(r => r.$id);
        const Table = require('./Table');
        const [itemsResp, tableMap] = await Promise.all([
            databases.listDocuments(databaseId, COLLECTIONS.order_items, [
                Query.equal('order_id', orderIds),
                Query.limit(1000)
            ]),
            Table.getTableMap()
        ]);

        const itemsByOrderId = {};
        for (const item of itemsResp.documents) {
            if (!itemsByOrderId[item.order_id]) itemsByOrderId[item.order_id] = [];
            itemsByOrderId[item.order_id].push(fmtItem(item));
        }

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
        const Table = require('./Table');
        try {
            // 1. Validate all menu items in a single batch query
            const menuItemIds = (data.items || []).map(i => i.menuItemId).filter(Boolean);
            if (menuItemIds.length > 0) {
                const checkResp = await databases.listDocuments(databaseId, COLLECTIONS.menu_items, [
                    Query.equal('$id', menuItemIds),
                    Query.limit(menuItemIds.length)
                ]);
                if (checkResp.total < menuItemIds.length) {
                    throw new Error('One or more menu items no longer exist');
                }
            }

            const seq = await Counter.getNextSequence('tokenNumber_global');
            const orderNumber = `ORD-${seq}`;

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

            // 2. Insert items in parallel
            const itemDocs = await Promise.all(data.items.map(item =>
                databases.createDocument(
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
                        variant: item.variant ? JSON.stringify(item.variant) : null,
                        status: 'PENDING'
                    }
                )
            ));

            // 3. Construct the response object in-memory to save 3+ API calls (find, items-load, table-load)
            const tableMap = await Table.getTableMap();
            return fmtOrder(orderDoc, itemDocs.map(fmtItem), tableMap[orderDoc.table_id] || null);
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
            discountLabel: 'discount_label',
            finalAmount: 'final_amount',
            prepStartedAt: 'prep_started_at',
            readyAt: 'ready_at',
            completedAt: 'completed_at',
            paymentAt: 'payment_at',
            paidAt: 'paid_at',
            cancelledBy: 'cancelled_by',
            cancelReason: 'cancel_reason',
            isPartiallyReady: 'is_partially_ready',
        };

        const data = {};
        for (const [key, val] of Object.entries(updates)) {
            const col = fieldMap[key] || key;
            data[col] = val === undefined ? null : val;
        }

        if (Object.keys(data).length === 0) return this.findById(id);

        // logger.debug(`[Order.updateById] Updating ID=${id}...`);
        try {
            await databases.updateDocument(databaseId, COLLECTIONS.orders, id, data);
            return this.findById(id);
        } catch (error) {
            // Self-repair: If attribute is missing, try to create it
            if (error.code === 400 && (error.message?.includes('Unknown attribute') || error.message?.includes('invalid document structure'))) {
                try {
                    await ensureSchema('orders');
                    return this.updateById(id, updates);
                } catch (schemaErr) {
                    console.error('[Order] Schema auto-repair failed:', schemaErr.message);
                    throw error; // Re-throw original error
                }
            }
            throw error;
        }
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
        try {
            await databases.updateDocument(databaseId, COLLECTIONS.order_items, itemId, {
                status: status
            });
            return this.findById(orderId);
        } catch (error) {
             if (error.code === 400) {
                 await ensureSchema('order_items');
                 return databases.updateDocument(databaseId, COLLECTIONS.order_items, itemId, { status: status });
             }
             throw error;
        }
    },

    async cancelItem(orderId, itemId, { cancelledBy, cancelReason }) {
        const updates = {
            status: 'CANCELLED',
            cancelled_by: cancelledBy,
            cancel_reason: cancelReason,
            cancelled_at: new Date().toISOString()
        };
        try {
            await databases.updateDocument(databaseId, COLLECTIONS.order_items, itemId, updates);
            return this.findById(orderId);
        } catch (error) {
             if (error.code === 400) {
                 await ensureSchema('order_items');
                 return databases.updateDocument(databaseId, COLLECTIONS.order_items, itemId, updates);
             }
             throw error;
        }
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

        if (response.documents.length === 0) return [];

        const orderIds = response.documents.map(r => r.$id);
        const Table = require('./Table');
        const [itemsResp, tableMap] = await Promise.all([
            databases.listDocuments(databaseId, COLLECTIONS.order_items, [
                Query.equal('order_id', orderIds),
                Query.limit(1000)
            ]),
            Table.getTableMap()
        ]);

        const itemsByOrderId = {};
        for (const item of itemsResp.documents) {
            if (!itemsByOrderId[item.order_id]) itemsByOrderId[item.order_id] = [];
            itemsByOrderId[item.order_id].push(fmtItem(item));
        }

        return response.documents.map(doc => fmtOrder(doc, itemsByOrderId[doc.$id] || [], tableMap[doc.table_id]));
    },

    async addItems(orderId, items, { totalAmount, tax, finalAmount }) {
        if (orderLocks.has(orderId)) {
            // Wait slightly or just reject to prevent double-deposit
            throw new Error("Order update in progress, please wait...");
        }

        try {
            orderLocks.add(orderId);

            // 1. Fetch latest order to ensure we have current totals
            const orderCount = await databases.getDocument(databaseId, COLLECTIONS.orders, orderId);
            if (['completed', 'cancelled'].includes(orderCount.order_status)) {
                throw new Error(`Cannot add items to ${orderCount.order_status} order`);
            }

            // 2. Fetch existing items BEFORE adding new ones
            const existingItems = await loadItems(orderId);

            // 3. Insert new items
            const newItemDocs = await Promise.all(items.map(async (item) => {
                const itemData = {
                    order_id: orderId,
                    menu_item_id: item.menuItemId || null,
                    name: item.name,
                    price: parseFloat(item.price),
                    quantity: parseInt(item.quantity),
                    notes: item.notes || null,
                    variant: item.variant ? JSON.stringify(item.variant) : null,
                    status: 'PENDING',
                    is_newly_added: true
                };

                try {
                    return await databases.createDocument(databaseId, COLLECTIONS.order_items, ID.unique(), itemData);
                } catch (err) {
                    if (err.code === 400 && (err.message?.includes('Unknown attribute') || err.message?.includes('invalid document structure'))) {
                        console.warn(`[Order] Schema mismatch in order_items. Attempting to add "is_newly_added"...`);
                        try {
                            await databases.createBooleanAttribute(databaseId, COLLECTIONS.order_items, 'is_newly_added', false, false);
                            await new Promise(r => setTimeout(r, 2000)); // wait for indexer
                            return await databases.createDocument(databaseId, COLLECTIONS.order_items, ID.unique(), itemData);
                        } catch (schemaErr) {
                            console.error('[Order] Schema repair failed for order_items:', schemaErr.message);
                            // Fallback: remove the offending attribute and retry once
                            delete itemData.is_newly_added;
                            return await databases.createDocument(databaseId, COLLECTIONS.order_items, ID.unique(), itemData);
                        }
                    }
                    throw err;
                }
            }));

            // 4. Single Source calculation
            const allItems = [...existingItems, ...newItemDocs.map(fmtItem)];
            const activeItems = allItems.filter(i => i.status?.toUpperCase() !== 'CANCELLED');
            const subtotalSum = activeItems.reduce((sum, i) => sum + (parseFloat(i.price) * parseInt(i.quantity)), 0);

            const taxRate = (parseFloat(orderCount.total_amount) > 0) ? (parseFloat(orderCount.tax) / parseFloat(orderCount.total_amount)) : 0.05;
            const newTax = parseFloat((subtotalSum * taxRate).toFixed(2));
            const newFinal = parseFloat((subtotalSum + newTax - (parseFloat(orderCount.discount) || 0)).toFixed(2));

            // Flag is true if ANY existing item was already READY before we added new ones
            const hasExistingReadyItems = existingItems.some(i => i.status?.toUpperCase() === 'READY');

            const orderUpdates = {
                total_amount: subtotalSum,
                tax: newTax,
                final_amount: newFinal,
                kot_status: 'Open',
                order_status: 'pending',
                is_partially_ready: hasExistingReadyItems || !!orderCount.is_partially_ready,
            };

            try {
                await databases.updateDocument(databaseId, COLLECTIONS.orders, orderId, orderUpdates);
            } catch (err) {
                if (err.code === 400 && (err.message?.includes('Unknown attribute') || err.message?.includes('invalid document structure'))) {
                    console.warn(`[Order] Schema mismatch in orders. Attempting to add "is_partially_ready"...`);
                    try {
                        await databases.createBooleanAttribute(databaseId, COLLECTIONS.orders, 'is_partially_ready', false, false);
                        await new Promise(r => setTimeout(r, 2000)); // wait for indexer
                        await databases.updateDocument(databaseId, COLLECTIONS.orders, orderId, orderUpdates);
                    } catch (schemaErr) {
                        console.error('[Order] Schema repair failed for orders:', schemaErr.message);
                        delete orderUpdates.is_partially_ready;
                        await databases.updateDocument(databaseId, COLLECTIONS.orders, orderId, orderUpdates);
                    }
                } else {
                    throw err;
                }
            }

            // Return fresh formatted order
            const fullOrder = await databases.getDocument(databaseId, COLLECTIONS.orders, orderId);
            const tableMap = await Table.getTableMap();
            return fmtOrder(fullOrder, allItems, tableMap[fullOrder.table_id] || null);

        } finally {
            orderLocks.delete(orderId);
        }
    },
};

// ─── Automated Schema Maintenance ──────────────────────────────────────
const schemaRepaired = { orders: false, order_items: false };
async function ensureSchema(colName = 'orders') {
    if (schemaRepaired[colName]) return; 
    
    const collectionId = COLLECTIONS[colName];
    if (!collectionId) return;

    try {
        console.warn(`[Order.Schema] Checking ${colName} attributes...`);
        const existingAttrs = await databases.listAttributes(databaseId, collectionId);
        const attrNames = existingAttrs.attributes.map(a => a.key);

        let repairCount = 0;
        const required = {
            orders: [
                { key: 'is_partially_ready', type: 'boolean', default: false },
                { key: 'discount_label', type: 'string', size: 100, default: '' },
                { key: 'prep_started_at', type: 'string', size: 50, default: null },
                { key: 'ready_at', type: 'string', size: 50, default: null },
                { key: 'completed_at', type: 'string', size: 50, default: null },
                { key: 'payment_at', type: 'string', size: 50, default: null },
                { key: 'paid_at', type: 'string', size: 50, default: null },
                { key: 'cancelled_by', type: 'string', size: 100, default: null },
                { key: 'cancel_reason', type: 'string', size: 300, default: null }
            ],
            order_items: [
                { key: 'is_newly_added', type: 'boolean', default: false },
                { key: 'cancelled_by', type: 'string', size: 100, default: null },
                { key: 'cancel_reason', type: 'string', size: 300, default: null },
                { key: 'cancelled_at', type: 'string', size: 50, default: null }
            ]
        };

        for (const attr of (required[colName] || [])) {
            if (!attrNames.includes(attr.key)) {
                console.log(`[Order.Schema] Adding ${attr.key} to ${colName}...`);
                if (attr.type === 'string') {
                    await databases.createStringAttribute(databaseId, collectionId, attr.key, attr.size, false, attr.default);
                } else if (attr.type === 'boolean') {
                    await databases.createBooleanAttribute(databaseId, collectionId, attr.key, false, attr.default);
                }
                repairCount++;
            }
        }

        if (repairCount > 0) {
            console.warn(`[Order.Schema] ${repairCount} repairs dispatched. Waiting for indexer (4s)...`);
            await new Promise(r => setTimeout(r, 4000));
        }
        schemaRepaired[colName] = true;
    } catch (err) {
        console.error(`[Order.Schema] Batch repair failed for ${colName}:`, err.message);
        throw err;
    }
}

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
