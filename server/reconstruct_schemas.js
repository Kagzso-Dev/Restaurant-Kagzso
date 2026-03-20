const { Client, Databases } = require('node-appwrite');
require('dotenv').config();

const client = new Client();
client
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const databaseId = process.env.APPWRITE_DATABASE_ID;

const COLLECTIONS = {
    users: 'users',
    categories: 'categories',
    menu_items: 'menu_items',
    tables: 'tables',
    orders: 'orders',
    order_items: 'order_items',
    payments: 'payments',
    payment_audits: 'payment_audits',
    settings: 'settings',
    counters: 'counters',
    daily_analytics: 'daily_analytics'
};

const delay = (ms) => new Promise(res => setTimeout(res, ms));

async function ensureAttribute(collId, key, type, config = {}) {
    try {
        await databases.getAttribute(databaseId, collId, key);
        console.log(`Attribute [${key}] exists in ${collId}`);
    } catch (e) {
        console.log(`Creating [${key}] (${type}) in ${collId}...`);
        const { size = 255, required = false, array = false, min = null, max = null, def = null } = config;
        
        try {
            if (type === 'string') await databases.createStringAttribute(databaseId, collId, key, size, required, def, array);
            else if (type === 'integer') await databases.createIntegerAttribute(databaseId, collId, key, required, min, max, def, array);
            else if (type === 'float') await databases.createFloatAttribute(databaseId, collId, key, required, min, max, def, array);
            else if (type === 'boolean') await databases.createBooleanAttribute(databaseId, collId, key, required, def, array);
            else if (type === 'datetime') await databases.createDatetimeAttribute(databaseId, collId, key, required, def, array);
            
            await delay(1000); // Allow some time for indexer
        } catch (err) {
            console.error(`  Failed to create ${key}: ${err.message}`);
        }
    }
}

async function run() {
    try {
        // 1. USERS
        await ensureAttribute(COLLECTIONS.users, 'username', 'string', { required: true });
        await ensureAttribute(COLLECTIONS.users, 'passwordHash', 'string', { required: true });
        await ensureAttribute(COLLECTIONS.users, 'role', 'string', { required: true });
        await ensureAttribute(COLLECTIONS.users, 'name', 'string', { required: false });
        await ensureAttribute(COLLECTIONS.users, 'isVerified', 'boolean', { required: false, def: false });
        await ensureAttribute(COLLECTIONS.users, 'lastLoginAt', 'datetime', { required: false });

        // 2. CATEGORIES
        await ensureAttribute(COLLECTIONS.categories, 'name', 'string', { required: true });
        await ensureAttribute(COLLECTIONS.categories, 'description', 'string', { required: false });
        await ensureAttribute(COLLECTIONS.categories, 'color', 'string', { required: false });
        await ensureAttribute(COLLECTIONS.categories, 'status', 'string', { required: false, def: 'active' });

        // 3. MENU ITEMS
        await ensureAttribute(COLLECTIONS.menu_items, 'name', 'string', { required: true });
        await ensureAttribute(COLLECTIONS.menu_items, 'price', 'float', { required: true });
        await ensureAttribute(COLLECTIONS.menu_items, 'category_id', 'string', { required: true });
        await ensureAttribute(COLLECTIONS.menu_items, 'is_veg', 'boolean', { required: true }); // No default if required
        await ensureAttribute(COLLECTIONS.menu_items, 'availability', 'boolean', { required: true }); // No default if required
        await ensureAttribute(COLLECTIONS.menu_items, 'description', 'string', { size: 1000, required: false });
        await ensureAttribute(COLLECTIONS.menu_items, 'image', 'string', { size: 500, required: false });

        // 4. TABLES
        await ensureAttribute(COLLECTIONS.tables, 'number', 'integer', { required: true });
        await ensureAttribute(COLLECTIONS.tables, 'capacity', 'integer', { required: false, def: 4 });
        await ensureAttribute(COLLECTIONS.tables, 'status', 'string', { required: false, def: 'available' });

        // 5. ORDERS
        await ensureAttribute(COLLECTIONS.orders, 'order_number', 'string', { required: true });
        await ensureAttribute(COLLECTIONS.orders, 'token_number', 'integer', { required: false });
        await ensureAttribute(COLLECTIONS.orders, 'order_type', 'string', { required: true });
        await ensureAttribute(COLLECTIONS.orders, 'table_id', 'string', { required: false });
        await ensureAttribute(COLLECTIONS.orders, 'order_status', 'string', { required: true }); // No default if required
        await ensureAttribute(COLLECTIONS.orders, 'payment_status', 'string', { required: true }); // No default if required
        await ensureAttribute(COLLECTIONS.orders, 'payment_method', 'string', { required: false });
        await ensureAttribute(COLLECTIONS.orders, 'total_amount', 'float', { required: true }); // No default if required
        await ensureAttribute(COLLECTIONS.orders, 'tax', 'float', { required: false, def: 0 });
        await ensureAttribute(COLLECTIONS.orders, 'discount', 'float', { required: false, def: 0 });
        await ensureAttribute(COLLECTIONS.orders, 'final_amount', 'float', { required: true }); // No default if required
        await ensureAttribute(COLLECTIONS.orders, 'waiter_id', 'string', { required: false });
        await ensureAttribute(COLLECTIONS.orders, 'prep_started_at', 'datetime', { required: false });
        await ensureAttribute(COLLECTIONS.orders, 'ready_at', 'datetime', { required: false });
        await ensureAttribute(COLLECTIONS.orders, 'payment_at', 'datetime', { required: false });
        await ensureAttribute(COLLECTIONS.orders, 'completed_at', 'datetime', { required: false });
        await ensureAttribute(COLLECTIONS.orders, 'kot_status', 'string', { required: false, def: 'Open' });

        // 6. ORDER ITEMS
        await ensureAttribute(COLLECTIONS.order_items, 'order_id', 'string', { required: true });
        await ensureAttribute(COLLECTIONS.order_items, 'menu_item_id', 'string', { required: true });
        await ensureAttribute(COLLECTIONS.order_items, 'name', 'string', { required: true });
        await ensureAttribute(COLLECTIONS.order_items, 'price', 'float', { required: true });
        await ensureAttribute(COLLECTIONS.order_items, 'quantity', 'integer', { required: true }); // No default if required
        await ensureAttribute(COLLECTIONS.order_items, 'status', 'string', { required: false, def: 'PENDING' });

        // 7. PAYMENTS
        await ensureAttribute(COLLECTIONS.payments, 'order_id', 'string', { required: true });
        await ensureAttribute(COLLECTIONS.payments, 'payment_method', 'string', { required: true });
        await ensureAttribute(COLLECTIONS.payments, 'amount', 'float', { required: true });
        await ensureAttribute(COLLECTIONS.payments, 'amount_received', 'float', { required: true });
        await ensureAttribute(COLLECTIONS.payments, 'change', 'float', { required: false, def: 0 });
        await ensureAttribute(COLLECTIONS.payments, 'cashier_id', 'string', { required: false });
        await ensureAttribute(COLLECTIONS.payments, 'payment_at', 'datetime', { required: false });

        // 8. COUNTERS
        await ensureAttribute(COLLECTIONS.counters, 'sequence_value', 'integer', { required: true });

        // 9. DAILY ANALYTICS
        await ensureAttribute(COLLECTIONS.daily_analytics, 'date', 'datetime', { required: true });
        await ensureAttribute(COLLECTIONS.daily_analytics, 'total_orders', 'integer', { required: true });
        await ensureAttribute(COLLECTIONS.daily_analytics, 'completed_orders', 'integer', { required: true });
        await ensureAttribute(COLLECTIONS.daily_analytics, 'cancelled_orders', 'integer', { required: true });
        await ensureAttribute(COLLECTIONS.daily_analytics, 'revenue', 'float', { required: true });
        await ensureAttribute(COLLECTIONS.daily_analytics, 'avg_order_value', 'float', { required: true });
        await ensureAttribute(COLLECTIONS.daily_analytics, 'dine_in_orders', 'integer', { required: true });
        await ensureAttribute(COLLECTIONS.daily_analytics, 'takeaway_orders', 'integer', { required: true });

        // 10. SETTINGS
        await ensureAttribute(COLLECTIONS.settings, 'restaurant_name', 'string', { required: false, def: 'KAGSZO' });
        await ensureAttribute(COLLECTIONS.settings, 'address', 'string', { size: 500, required: false });
        await ensureAttribute(COLLECTIONS.settings, 'currency', 'string', { required: false, def: 'INR' });
        await ensureAttribute(COLLECTIONS.settings, 'currency_symbol', 'string', { required: false, def: '₹' });
        await ensureAttribute(COLLECTIONS.settings, 'tax_rate', 'float', { required: false, def: 5.0 });
        await ensureAttribute(COLLECTIONS.settings, 'gst_number', 'string', { required: false });
        await ensureAttribute(COLLECTIONS.settings, 'pending_color', 'string', { required: false, def: '#3b82f6' });
        await ensureAttribute(COLLECTIONS.settings, 'accepted_color', 'string', { required: false, def: '#8b5cf6' });
        await ensureAttribute(COLLECTIONS.settings, 'preparing_color', 'string', { required: false, def: '#f59e0b' });
        await ensureAttribute(COLLECTIONS.settings, 'ready_color', 'string', { required: false, def: '#10b981' });
        await ensureAttribute(COLLECTIONS.settings, 'dashboard_view', 'string', { required: false, def: 'all' });
        await ensureAttribute(COLLECTIONS.settings, 'menu_view', 'string', { required: false, def: 'grid' });
        await ensureAttribute(COLLECTIONS.settings, 'dine_in_enabled', 'boolean', { required: false, def: true });
        await ensureAttribute(COLLECTIONS.settings, 'table_map_enabled', 'boolean', { required: false, def: true });
        await ensureAttribute(COLLECTIONS.settings, 'takeaway_enabled', 'boolean', { required: false, def: true });
        await ensureAttribute(COLLECTIONS.settings, 'waiter_service_enabled', 'boolean', { required: false, def: true });
        await ensureAttribute(COLLECTIONS.settings, 'standard_qr_url', 'string', { size: 500, required: false });
        await ensureAttribute(COLLECTIONS.settings, 'secondary_qr_url', 'string', { size: 500, required: false });
        await ensureAttribute(COLLECTIONS.settings, 'standard_qr_file_id', 'string', { required: false });
        await ensureAttribute(COLLECTIONS.settings, 'secondary_qr_file_id', 'string', { required: false });

        console.log('--- SCHEMA RECONSTRUCTION COMPLETE ---');
    } catch (error) {
        console.error('CRITICAL SCHEMA ERROR:', error.message);
    }
}

run();
