const dotenv = require('dotenv');
dotenv.config();
const { databases, databaseId, COLLECTIONS } = require('./config/appwrite');

async function ensureAttribute(collectionId, key, type, { size = 255, required = false, array = false, min = null, max = null, def = null } = {}) {
    try {
        await databases.getAttribute(databaseId, collectionId, key);
        console.log(`Attribute "${key}" already exists in ${collectionId}`);
    } catch (e) {
        console.log(`Creating attribute "${key}" in ${collectionId}...`);
        if (type === 'string') {
            await databases.createStringAttribute(databaseId, collectionId, key, size, required, def, array);
        } else if (type === 'integer') {
            await databases.createIntegerAttribute(databaseId, collectionId, key, required, min, max, def, array);
        } else if (type === 'float') {
            await databases.createFloatAttribute(databaseId, collectionId, key, required, min, max, def, array);
        } else if (type === 'boolean') {
            await databases.createBooleanAttribute(databaseId, collectionId, key, required, def, array);
        } else if (type === 'datetime') {
            await databases.createDatetimeAttribute(databaseId, collectionId, key, required, def, array);
        }
    }
}

async function fixSchemas() {
    try {
        // --- PAYMENTS ---
        console.log('Fixing PAYMENTS collection...');
        await ensureAttribute(COLLECTIONS.payments, 'order_id', 'string', { required: true });
        await ensureAttribute(COLLECTIONS.payments, 'payment_method', 'string', { required: true });

        await ensureAttribute(COLLECTIONS.payments, 'amount', 'float', { required: true });
        await ensureAttribute(COLLECTIONS.payments, 'amount_received', 'float', { required: true });
        await ensureAttribute(COLLECTIONS.payments, 'change', 'float', { required: false });
        await ensureAttribute(COLLECTIONS.payments, 'cashier_id', 'string', { required: false });

        // --- PAYMENT AUDITS ---
        console.log('Fixing PAYMENT_AUDITS collection...');
        await ensureAttribute(COLLECTIONS.payment_audits, 'order_id', 'string', { required: false });
        await ensureAttribute(COLLECTIONS.payment_audits, 'payment_id', 'string', { required: false });
        await ensureAttribute(COLLECTIONS.payment_audits, 'action', 'string', { required: true });
        await ensureAttribute(COLLECTIONS.payment_audits, 'status', 'string', { required: true });
        await ensureAttribute(COLLECTIONS.payment_audits, 'amount', 'float', { required: false });
        await ensureAttribute(COLLECTIONS.payment_audits, 'payment_method', 'string', { required: false });

        await ensureAttribute(COLLECTIONS.payment_audits, 'performed_by', 'string', { required: false });
        await ensureAttribute(COLLECTIONS.payment_audits, 'performed_by_role', 'string', { required: false });
        await ensureAttribute(COLLECTIONS.payment_audits, 'ip_address', 'string', { required: false });
        await ensureAttribute(COLLECTIONS.payment_audits, 'user_agent', 'string', { size: 500, required: false });
        await ensureAttribute(COLLECTIONS.payment_audits, 'error_message', 'string', { size: 500, required: false });
        await ensureAttribute(COLLECTIONS.payment_audits, 'error_code', 'string', { required: false });
        await ensureAttribute(COLLECTIONS.payment_audits, 'metadata', 'string', { size: 2000, required: false });

        // --- NOTIFICATIONS ---
        console.log('Fixing NOTIFICATIONS collection...');
        await ensureAttribute(COLLECTIONS.notifications, 'title', 'string', { required: true });
        await ensureAttribute(COLLECTIONS.notifications, 'message', 'string', { size: 500, required: true });
        await ensureAttribute(COLLECTIONS.notifications, 'type', 'string', { required: true });
        await ensureAttribute(COLLECTIONS.notifications, 'role_target', 'string', { required: true });
        await ensureAttribute(COLLECTIONS.notifications, 'reference_id', 'string', { required: false });
        await ensureAttribute(COLLECTIONS.notifications, 'reference_type', 'string', { required: false });
        await ensureAttribute(COLLECTIONS.notifications, 'created_by', 'string', { required: false });

        // --- NOTIFICATION_READS ---
        console.log('Fixing NOTIFICATION_READS collection...');
        await ensureAttribute(COLLECTIONS.notification_reads, 'notification_id', 'string', { required: true });
        await ensureAttribute(COLLECTIONS.notification_reads, 'user_id', 'string', { required: true });

        // --- DAILY_ANALYTICS --- (Based on Conversation 6f706e62)
        console.log('Fixing DAILY_ANALYTICS collection...');
        await ensureAttribute(COLLECTIONS.daily_analytics, 'date', 'datetime', { required: true });
        await ensureAttribute(COLLECTIONS.daily_analytics, 'total_orders', 'integer', { required: true });
        await ensureAttribute(COLLECTIONS.daily_analytics, 'completed_orders', 'integer', { required: true });
        await ensureAttribute(COLLECTIONS.daily_analytics, 'cancelled_orders', 'integer', { required: true });
        await ensureAttribute(COLLECTIONS.daily_analytics, 'revenue', 'float', { required: true });
        await ensureAttribute(COLLECTIONS.daily_analytics, 'avg_order_value', 'float', { required: true });
        await ensureAttribute(COLLECTIONS.daily_analytics, 'dine_in_orders', 'integer', { required: true });
        await ensureAttribute(COLLECTIONS.daily_analytics, 'takeaway_orders', 'integer', { required: true });
        
        // --- MENU ITEMS ---
        console.log('Fixing MENU_ITEMS collection...');
        await ensureAttribute(COLLECTIONS.menu_items, 'description', 'string', { size: 1000, required: false });
        await ensureAttribute(COLLECTIONS.menu_items, 'image', 'string', { size: 500, required: false });
        await ensureAttribute(COLLECTIONS.menu_items, 'price', 'float', { required: true });
        await ensureAttribute(COLLECTIONS.menu_items, 'is_veg', 'boolean', { required: true, def: true });
        await ensureAttribute(COLLECTIONS.menu_items, 'availability', 'boolean', { required: true, def: true });

        // --- SETTINGS ---
        console.log('Fixing SETTINGS collection...');
        await ensureAttribute(COLLECTIONS.settings, 'restaurant_name', 'string', { required: false });
        await ensureAttribute(COLLECTIONS.settings, 'address', 'string', { size: 500, required: false });
        await ensureAttribute(COLLECTIONS.settings, 'currency', 'string', { required: false });
        await ensureAttribute(COLLECTIONS.settings, 'currency_symbol', 'string', { required: false });
        await ensureAttribute(COLLECTIONS.settings, 'tax_rate', 'float', { required: false });
        await ensureAttribute(COLLECTIONS.settings, 'gst_number', 'string', { required: false });
        await ensureAttribute(COLLECTIONS.settings, 'standard_qr_url', 'string', { size: 500, required: false });
        await ensureAttribute(COLLECTIONS.settings, 'secondary_qr_url', 'string', { size: 500, required: false });
        await ensureAttribute(COLLECTIONS.settings, 'standard_qr_file_id', 'string', { required: false });
        await ensureAttribute(COLLECTIONS.settings, 'secondary_qr_file_id', 'string', { required: false });

        console.log('--- ALL MISSING SCHEMAS FIXED ---');
    } catch (err) {
        console.error('FAILED to fix schemas:', err.message);
    }
}

fixSchemas();
