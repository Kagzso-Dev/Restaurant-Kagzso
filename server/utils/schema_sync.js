const { databases, databaseId, COLLECTIONS } = require('../config/appwrite');
const logger = require('./logger');

/**
 * Schema Definition for the Restaurant POS
 * key: attribute name
 * type: string | integer | float | boolean | email | url | datetime | enum
 * size: for strings
 * required: boolean
 * default: default value
 * array: boolean (not used yet but good for future)
 */
const SCHEMA = {
    [COLLECTIONS.users]: {
        name: 'Users',
        attributes: [
            { key: 'username', type: 'string', size: 100, required: true },
            { key: 'passwordHash', type: 'string', size: 255, required: true },
            { key: 'name', type: 'string', size: 100, required: false, default: null },
            { key: 'role', type: 'string', size: 20, required: true },
            { key: 'image', type: 'string', size: 1000, required: false, default: null },
            { key: 'isVerified', type: 'boolean', required: false, default: false },
            { key: 'lastLoginAt', type: 'string', size: 50, required: false, default: null }
        ],
        indexes: [
            { key: 'idx_username', type: 'unique', attributes: ['username'] }
        ]
    },
    [COLLECTIONS.categories]: {
        name: 'Categories',
        attributes: [
            { key: 'name', type: 'string', size: 100, required: true },
            { key: 'description', type: 'string', size: 500, required: false, default: null },
            { key: 'image', type: 'string', size: 1000, required: false, default: null },
            { key: 'color', type: 'string', size: 20, required: false, default: '#f97316' },
            { key: 'status', type: 'string', size: 20, required: false, default: 'active' }
        ],
        indexes: [
            { key: 'idx_name', type: 'key', attributes: ['name'] },
            { key: 'idx_status', type: 'key', attributes: ['status'] }
        ]
    },
    [COLLECTIONS.menu_items]: {
        name: 'Menu Items',
        attributes: [
            { key: 'name', type: 'string', size: 100, required: true },
            { key: 'description', type: 'string', size: 500, required: false, default: null },
            { key: 'price', type: 'float', required: true },
            { key: 'category_id', type: 'string', size: 50, required: false, default: null },
            { key: 'image', type: 'string', size: 1000, required: false, default: null },
            { key: 'availability', type: 'boolean', required: false, default: true },
            { key: 'is_veg', type: 'boolean', required: false, default: true },
            { key: 'variants', type: 'string', size: 2000, required: false, default: null }
        ],
        indexes: [
            { key: 'idx_name', type: 'key', attributes: ['name'] },
            { key: 'idx_availability', type: 'key', attributes: ['availability'] },
            { key: 'idx_category_id', type: 'key', attributes: ['category_id'] }
        ]
    },
    [COLLECTIONS.tables]: {
        name: 'Tables',
        attributes: [
            { key: 'number', type: 'integer', required: true },
            { key: 'capacity', type: 'integer', required: true },
            { key: 'status', type: 'string', size: 50, required: false, default: 'available' },
            { key: 'locked_by', type: 'string', size: 50, required: false, default: null },
            { key: 'reserved_at', type: 'string', size: 50, required: false, default: null },
            { key: 'reservation_expires_at', type: 'string', size: 50, required: false, default: null },
            { key: 'current_order_id', type: 'string', size: 50, required: false, default: null }
        ],
        indexes: [
            { key: 'idx_number', type: 'unique', attributes: ['number'] }
        ]
    },
    [COLLECTIONS.orders]: {
        name: 'Orders',
        attributes: [
            { key: 'order_number', type: 'string', size: 50, required: true },
            { key: 'token_number', type: 'integer', required: true },
            { key: 'order_type', type: 'string', size: 20, required: true },
            { key: 'table_id', type: 'string', size: 50, required: false, default: null },
            { key: 'customer_name', type: 'string', size: 100, required: false, default: null },
            { key: 'customer_phone', type: 'string', size: 20, required: false, default: null },
            { key: 'total_amount', type: 'float', required: true },
            { key: 'tax', type: 'float', required: false, default: 0 },
            { key: 'discount', type: 'float', required: false, default: 0 },
            { key: 'discount_label', type: 'string', size: 100, required: false, default: '' },
            { key: 'final_amount', type: 'float', required: true },
            { key: 'waiter_id', type: 'string', size: 50, required: false, default: null },
            { key: 'order_status', type: 'string', size: 20, required: true },
            { key: 'payment_status', type: 'string', size: 20, required: true },
            { key: 'payment_method', type: 'string', size: 20, required: false, default: null },
            { key: 'kot_status', type: 'string', size: 20, required: false, default: 'Open' },
            { key: 'is_partially_ready', type: 'boolean', required: false, default: false },
            { key: 'prep_started_at', type: 'string', size: 50, required: false, default: null },
            { key: 'ready_at', type: 'string', size: 50, required: false, default: null },
            { key: 'completed_at', type: 'string', size: 50, required: false, default: null },
            { key: 'payment_at', type: 'string', size: 50, required: false, default: null },
            { key: 'paid_at', type: 'string', size: 50, required: false, default: null },
            { key: 'cancelled_by', type: 'string', size: 50, required: false, default: null },
            { key: 'cancel_reason', type: 'string', size: 500, required: false, default: null }
        ],
        indexes: [
            { key: 'idx_order_number', type: 'unique', attributes: ['order_number'] },
            { key: 'idx_order_status', type: 'key', attributes: ['order_status'] },
            { key: 'idx_payment_status', type: 'key', attributes: ['payment_status'] },
            { key: 'idx_kot_status', type: 'key', attributes: ['kot_status'] },
            { key: 'idx_order_type', type: 'key', attributes: ['order_type'] },
            { key: 'idx_table_id', type: 'key', attributes: ['table_id'] },
            { key: 'search_orders', type: 'fulltext', attributes: ['order_number', 'customer_name'] }
        ]
    },
    [COLLECTIONS.order_items]: {
        name: 'Order Items',
        attributes: [
            { key: 'order_id', type: 'string', size: 50, required: true },
            { key: 'menu_item_id', type: 'string', size: 50, required: true },
            { key: 'name', type: 'string', size: 100, required: true },
            { key: 'price', type: 'float', required: true },
            { key: 'quantity', type: 'integer', required: true },
            { key: 'notes', type: 'string', size: 500, required: false, default: null },
            { key: 'variant', type: 'string', size: 1000, required: false, default: null },
            { key: 'status', type: 'string', size: 20, required: true },
            { key: 'is_newly_added', type: 'boolean', required: false, default: false },
            { key: 'cancelled_by', type: 'string', size: 50, required: false, default: null },
            { key: 'cancel_reason', type: 'string', size: 500, required: false, default: null },
            { key: 'cancelled_at', type: 'string', size: 50, required: false, default: null }
        ],
        indexes: [
            { key: 'idx_order_id', type: 'key', attributes: ['order_id'] },
            { key: 'idx_status', type: 'key', attributes: ['status'] }
        ]
    },
    [COLLECTIONS.payments]: {
        name: 'Payments',
        attributes: [
            { key: 'order_id', type: 'string', size: 50, required: true },
            { key: 'payment_method', type: 'string', size: 20, required: true },
            { key: 'amount', type: 'float', required: true },
            { key: 'amount_received', type: 'float', required: false, default: 0 },
            { key: 'change', type: 'float', required: false, default: 0 },
            { key: 'cashier_id', type: 'string', size: 50, required: false, default: null },
            { key: 'payment_at', type: 'string', size: 50, required: false, default: null },
            { key: 'transaction_id', type: 'string', size: 100, required: false, default: null }
        ]
    },
    [COLLECTIONS.payment_audits]: {
        name: 'Payment Audits',
        attributes: [
            { key: 'order_id', type: 'string', size: 50, required: false, default: null },
            { key: 'payment_id', type: 'string', size: 50, required: false, default: null },
            { key: 'action', type: 'string', size: 50, required: true },
            { key: 'status', type: 'string', size: 20, required: true },
            { key: 'amount', type: 'float', required: false, default: null },
            { key: 'payment_method', type: 'string', size: 20, required: false, default: null },
            { key: 'performed_by', type: 'string', size: 50, required: false, default: null },
            { key: 'performed_by_role', type: 'string', size: 20, required: false, default: null },
            { key: 'ip_address', type: 'string', size: 50, required: false, default: null },
            { key: 'user_agent', type: 'string', size: 255, required: false, default: null },
            { key: 'error_message', type: 'string', size: 500, required: false, default: null },
            { key: 'error_code', type: 'string', size: 100, required: false, default: null },
            { key: 'metadata', type: 'string', size: 2000, required: false, default: null }
        ]
    },
    [COLLECTIONS.counters]: {
        name: 'Counters',
        attributes: [
            { key: 'sequence_value', type: 'integer', required: true }
        ]
    },
    [COLLECTIONS.settings]: {
        name: 'Settings',
        attributes: [
            { key: 'restaurant_name', type: 'string', size: 100, required: false, default: 'KAGSZO' },
            { key: 'address', type: 'string', size: 500, required: false, default: '' },
            { key: 'currency', type: 'string', size: 10, required: false, default: 'INR' },
            { key: 'currency_symbol', type: 'string', size: 10, required: false, default: '₹' },
            { key: 'tax_rate', type: 'float', required: false, default: 5 },
            { key: 'gst_number', type: 'string', size: 50, required: false, default: '' },
            { key: 'pending_color', type: 'string', size: 10, required: false, default: '#3b82f6' },
            { key: 'accepted_color', type: 'string', size: 10, required: false, default: '#8b5cf6' },
            { key: 'preparing_color', type: 'string', size: 10, required: false, default: '#f59e0b' },
            { key: 'ready_color', type: 'string', size: 10, required: false, default: '#10b981' },
            { key: 'dashboard_view', type: 'string', size: 50, required: false, default: 'all' },
            { key: 'menu_view', type: 'string', size: 50, required: false, default: 'grid' },
            { key: 'dine_in_enabled', type: 'boolean', required: false, default: true },
            { key: 'table_map_enabled', type: 'boolean', required: false, default: true },
            { key: 'takeaway_enabled', type: 'boolean', required: false, default: true },
            { key: 'waiter_service_enabled', type: 'boolean', required: false, default: true },
            { key: 'standard_qr_url', type: 'string', size: 1000, required: false, default: null },
            { key: 'secondary_qr_url', type: 'string', size: 1000, required: false, default: null },
            { key: 'standard_qr_file_id', type: 'string', size: 100, required: false, default: null },
            { key: 'secondary_qr_file_id', type: 'string', size: 100, required: false, default: null },
            { key: 'enforce_menu_view', type: 'boolean', required: false, default: false },
            { key: 'cashier_offer_enabled', type: 'boolean', required: false, default: false },
            { key: 'cashier_offer_label', type: 'string', size: 100, required: false, default: '' },
            { key: 'cashier_offer_discount', type: 'float', required: false, default: 0 },
            { key: 'cashier_qr_upload_enabled', type: 'boolean', required: false, default: true }
        ]
    },
    [COLLECTIONS.daily_analytics]: {
        name: 'Daily Analytics',
        attributes: [
            { key: 'date', type: 'string', size: 50, required: true },
            { key: 'total_orders', type: 'integer', required: true },
            { key: 'completed_orders', type: 'integer', required: true },
            { key: 'cancelled_orders', type: 'integer', required: true },
            { key: 'revenue', type: 'float', required: true },
            { key: 'avg_order_value', type: 'float', required: true },
            { key: 'dine_in_orders', type: 'integer', required: true },
            { key: 'takeaway_orders', type: 'integer', required: true }
        ],
        indexes: [
            { key: 'idx_date', type: 'unique', attributes: ['date'] }
        ]
    }
};

/**
 * Ensures a collection exists. Creates it if missing.
 */
async function ensureCollection(collId, metadata) {
    try {
        await databases.getCollection(databaseId, collId);
        // logger.debug(`[SchemaSync] Collection "${metadata.name}" exists.`);
    } catch (error) {
        if (error.code === 404) {
            logger.info(`[SchemaSync] Creating collection: ${metadata.name} (${collId})`);
            await databases.createCollection(databaseId, collId, metadata.name);
            // Wait a small amount for Appwrite to register the collection
            await new Promise(r => setTimeout(r, 1000));
        } else {
            throw error;
        }
    }
}

/**
 * Ensures all attributes in a collection exist. Creates missing ones.
 */
async function ensureAttributes(collId, attributes) {
    let existingKeys = [];
    let offset = 0;
    while (true) {
        const resp = await databases.listAttributes(databaseId, collId, [require('../config/appwrite').Query.limit(100), require('../config/appwrite').Query.offset(offset)]);
        resp.attributes.forEach(a => existingKeys.push(a.key));
        if (resp.attributes.length < 100) break;
        offset += 100;
        if (offset >= 1000) break; // sanity cap
    }

    for (const attr of attributes) {
        if (existingKeys.includes(attr.key)) continue;

        logger.debug(`[SchemaSync] Creating attribute: ${collId}.${attr.key} (${attr.type})`);
        
        try {
            switch (attr.type) {
                case 'string':
                    await databases.createStringAttribute(databaseId, collId, attr.key, attr.size, attr.required, attr.default);
                    break;
                case 'integer':
                    await databases.createIntegerAttribute(databaseId, collId, attr.key, attr.required, 0, 100000000, attr.default);
                    break;
                case 'float':
                    await databases.createFloatAttribute(databaseId, collId, attr.key, attr.required, -1000000, 100000000, attr.default);
                    break;
                case 'boolean':
                    await databases.createBooleanAttribute(databaseId, collId, attr.key, attr.required, attr.default);
                    break;
                case 'datetime':
                    await databases.createDatetimeAttribute(databaseId, collId, attr.key, attr.required, attr.default);
                    break;
                case 'email':
                    await databases.createEmailAttribute(databaseId, collId, attr.key, attr.required, attr.default);
                    break;
                case 'url':
                    await databases.createUrlAttribute(databaseId, collId, attr.key, attr.required, attr.default);
                    break;
            }
        } catch (e) {
            logger.error(`[SchemaSync] Failed to create attribute ${attr.key}: ${e.message}`);
        }
    }
}


/**
 * Ensures all indexes in a collection exist.
 */
async function ensureIndexes(collId, indexes) {
    if (!indexes || indexes.length === 0) return;

    let existingIndexes = [];
    try {
        const resp = await databases.listIndexes(databaseId, collId);
        existingIndexes = resp.indexes.map(idx => idx.key);
    } catch (e) {
        logger.error(`[SchemaSync] Failed to list indexes for ${collId}: ${e.message}`);
        return;
    }

    for (const idx of indexes) {
        if (existingIndexes.includes(idx.key)) continue;

        logger.debug(`[SchemaSync] Creating index: ${collId}.${idx.key} (${idx.type})`);
        try {
            switch (idx.type) {
                case 'key':
                    await databases.createIndex(databaseId, collId, idx.key, 'key', idx.attributes, idx.orders || []);
                    break;
                case 'unique':
                    await databases.createIndex(databaseId, collId, idx.key, 'unique', idx.attributes, idx.orders || []);
                    break;
                case 'fulltext':
                    await databases.createIndex(databaseId, collId, idx.key, 'fulltext', idx.attributes, []);
                    break;
            }
        } catch (e) {
            logger.error(`[SchemaSync] Failed to create index ${idx.key}: ${e.message}`);
        }
    }
}

async function seedInitialData() {
    try {
        // 1. Check if ANY user exists
        const users = await databases.listDocuments(databaseId, COLLECTIONS.users, [require('../config/appwrite').Query.limit(1)]);
        if (users.total === 0) {
            logger.info('[SchemaSync] Seeding default admin user...');
            const bcrypt = require('bcryptjs');
            const hash = await bcrypt.hash('admin123', 10);
            await databases.createDocument(databaseId, COLLECTIONS.users, 'admin', {
                username: 'admin',
                passwordHash: hash,
                role: 'admin',
                name: 'System Admin',
                isVerified: true
            });
        }

        // 2. Initialize global order sequence
        try {
            await databases.getDocument(databaseId, COLLECTIONS.counters, 'tokenNumber_global');
        } catch (e) {
            if (e.code === 404) {
                logger.info('[SchemaSync] Seeding default order counter...');
                await databases.createDocument(databaseId, COLLECTIONS.counters, 'tokenNumber_global', {
                    sequence_value: 0
                });
            }
        }

        // 3. Initialize Global Settings
        try {
            await databases.getDocument(databaseId, COLLECTIONS.settings, 'global_settings');
        } catch (e) {
            if (e.code === 404) {
                logger.info('[SchemaSync] Seeding default global settings...');
                await databases.createDocument(databaseId, COLLECTIONS.settings, 'global_settings', {
                    restaurant_name: 'KAGSZO',
                    address: '',
                    currency: 'INR',
                    currency_symbol: '₹',
                    tax_rate: 5.0,
                    gst_number: '',
                    pending_color: '#3b82f6',
                    accepted_color: '#8b5cf6',
                    preparing_color: '#f59e0b',
                    ready_color: '#10b981',
                    dashboard_view: 'all',
                    menu_view: 'grid',
                    dine_in_enabled: true,
                    table_map_enabled: true,
                    takeaway_enabled: true,
                    waiter_service_enabled: true
                });
            }
        }
    } catch (err) {
        logger.warn('[SchemaSync] Seeding error (non-critical):', err.message);
    }
}

/**
 * Main Sync Function
 */
async function syncSchema() {
    if (!databaseId) {
        logger.error('[SchemaSync] DATABASE_ID not configured in .env. Skipping sync.');
        return;
    }

    logger.info('[SchemaSync] Starting Appwrite Schema Synchronization...');

    try {
        try {
            await databases.get(databaseId);
        } catch (e) {
            logger.error(`[SchemaSync] Database "${databaseId}" NOT FOUND. Please create it first in Appwrite Console.`);
            return;
        }

        // 2. Process each collection
        for (const [collId, metadata] of Object.entries(SCHEMA)) {
            try {
                await ensureCollection(collId, metadata);
                await ensureAttributes(collId, metadata.attributes);
                if (metadata.indexes) {
                    await ensureIndexes(collId, metadata.indexes);
                }
            } catch (err) {
                logger.debug(`[SchemaSync] Skip/Exists: ${metadata.name} - ${err.message}`);
            }
        }

        // 3. Seed basics
        await seedInitialData();

        logger.info('[SchemaSync] Schema Synchronization complete.');
    } catch (error) {
        logger.error('[SchemaSync] Critical Error during synchronization:', error.message);
        console.error(error);
    }
}

module.exports = { syncSchema };
