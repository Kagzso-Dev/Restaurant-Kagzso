/**
 * Appwrite Seeder
 */
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
dotenv.config();

const { databases, databaseId, COLLECTIONS, ID, Query } = require('./config/appwrite');

const hash = async (pw) => bcrypt.hash(pw, await bcrypt.genSalt(10));

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const withRetry = async (fn, desc = 'operation', maxRetries = 3) => {
    let lastErr;
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (err) {
            lastErr = err;
            const isTimeout = err.message?.includes('fetch failed') || err.message?.includes('timeout') || err.code === 'UND_ERR_CONNECT_TIMEOUT';
            if (isTimeout) {
                console.warn(`[Retry ${i + 1}/${maxRetries}] ${desc} failed: ${err.message}. Retrying in 2s...`);
                await delay(2000);
                continue;
            }
            throw err;
        }
    }
    throw lastErr;
};

const clearCollection = async (collId) => {
    let hasMore = true;
    while (hasMore) {
        try {
            const resp = await withRetry(
                () => databases.listDocuments(databaseId, collId, [Query.limit(10)]),
                `listing docs in ${collId}`
            );
            if (resp.documents.length === 0) {
                hasMore = false;
            } else {
                for (const doc of resp.documents) {
                    await withRetry(
                        () => databases.deleteDocument(databaseId, collId, doc.$id),
                        `deleting doc ${doc.$id} from ${collId}`
                    );
                    await delay(100);
                }
            }
        } catch (e) {
            console.warn(`Error clearing collection ${collId}: ${e.message}`);
            hasMore = false;
        }
    }
};

const importData = async () => {
    try {
        console.log('Clearing existing data from Appwrite...');
        const colls = [
            COLLECTIONS.order_items,
            COLLECTIONS.orders,
            COLLECTIONS.menu_items,
            COLLECTIONS.categories,
            COLLECTIONS.tables,
            COLLECTIONS.settings,
            COLLECTIONS.users,
            COLLECTIONS.counters,
            COLLECTIONS.daily_analytics,
            COLLECTIONS.payments,
            COLLECTIONS.payment_audits,
            COLLECTIONS.notifications,
            COLLECTIONS.notification_reads
        ];

        for (const coll of colls) {
            if (!coll) continue;
            console.log(`Clearing ${coll}...`);
            await clearCollection(coll);
        }

        // ── Users ────────────────────────────────────────────────────────────
        console.log('Creating staff...');
        const staff = [
            { id: 'staff_admin',   username: 'admin',   passwordHash: await hash('admin123'),   role: 'admin',   name: 'Admin' },
            { id: 'staff_waiter',  username: 'waiter',  passwordHash: await hash('waiter123'),  role: 'waiter',  name: 'Waiter' },
            { id: 'staff_kitchen', username: 'kitchen', passwordHash: await hash('kitchen123'), role: 'kitchen', name: 'Kitchen' },
            { id: 'staff_cashier', username: 'cashier', passwordHash: await hash('cashier123'), role: 'cashier', name: 'Cashier' },
        ];

        for (const u of staff) {
            console.log(`Ensuring user: ${u.username} (${u.role})...`);
            // Delete if exists
            await databases.deleteDocument(databaseId, COLLECTIONS.users, u.id).catch(() => {});
            
            await withRetry(
                () => databases.createDocument(databaseId, COLLECTIONS.users, u.id, {
                    username:     u.username,
                    passwordHash: u.passwordHash,
                    role:         u.role,
                    name:         u.name,
                    isVerified:   true,
                }),
                `creating user ${u.username}`
            );
            console.log(`SUCCESS: Created user ${u.username}`);
            await delay(300);
        }
        const waiterId = 'staff_waiter';


        // ── Settings ─────────────────────────────────────────────────────────
        console.log('Creating settings...');
        await databases.deleteDocument(databaseId, COLLECTIONS.settings, 'global_settings').catch(() => {});
        await withRetry(
            () => databases.createDocument(databaseId, COLLECTIONS.settings, 'global_settings', {
                key: 'global_settings',
                restaurant_name: 'KAGSZO',
                currency: 'INR',
                currency_symbol: '₹',
                tax_rate: 5.0,
                gst_number: 'GST123456'
            }),
            'creating settings'
        );
        console.log('SUCCESS: Created settings');
        await delay(500);

        // ── Counters ─────────────────────────────────────────────────────────
        await databases.deleteDocument(databaseId, COLLECTIONS.counters, 'tokenNumber_global').catch(() => {});
        await withRetry(
            () => databases.createDocument(databaseId, COLLECTIONS.counters, 'tokenNumber_global', {
                sequence_value: 0
            }),
            'creating counter'
        ).catch(() => {});
        console.log('SUCCESS: Created counters');
        await delay(500);

        // ── Categories ───────────────────────────────────────────────────────
        console.log('Creating categories...');
        const categories = [
            { id: ID.unique(), name: 'Starters', description: 'Appetizers & Quick Bites', color: '#f97316' },
            { id: ID.unique(), name: 'Main Course', description: 'Authentic Indian Curries', color: '#8b5cf6' },
            { id: ID.unique(), name: 'Chinese', description: 'Indo-Chinese Fusion', color: '#ef4444' },
            { id: ID.unique(), name: 'Breads', description: 'Fresh Tandoori Breads', color: '#10b981' },
            { id: ID.unique(), name: 'Beverages', description: 'Cold Drinks & Mocktails', color: '#3b82f6' },
            { id: ID.unique(), name: 'Desserts', description: 'Sweet Endings', color: '#ec4899' },
        ];
        for (const c of categories) {
            await withRetry(
                () => databases.createDocument(databaseId, COLLECTIONS.categories, c.id, {
                    name: c.name,
                    description: c.description,
                    color: c.color,
                    status: 'active'
                }),
                `creating category ${c.name}`
            );
            await delay(300);
        }
        console.log('SUCCESS: Created categories');

        // ── Menu Items ───────────────────────────────────────────────────────
        console.log('Creating menu items...');
        const menuItemsData = [
            // Starters
            { name: 'Paneer Tikka', price: 280, cat: 0, veg: true },
            { name: 'Hara Bhara Kabab', price: 240, cat: 0, veg: true },
            { name: 'Chicken Wings', price: 320, cat: 0, veg: false },
            { name: 'Fish Amritsari', price: 380, cat: 0, veg: false },
            // Main Course
            { name: 'Butter Chicken', price: 450, cat: 1, veg: false },
            { name: 'Kadhai Paneer', price: 320, cat: 1, veg: true },
            { name: 'Dal Makhani', price: 280, cat: 1, veg: true },
            { name: 'Mutton Rogan Josh', price: 550, cat: 1, veg: false },
            // Chinese
            { name: 'Veg Manchurian', price: 260, cat: 2, veg: true },
            { name: 'Chilli Chicken', price: 340, cat: 2, veg: false },
            { name: 'Hakka Noodles', price: 220, cat: 2, veg: true },
            // Breads
            { name: 'Butter Naan', price: 60, cat: 3, veg: true },
            { name: 'Garlic Naan', price: 80, cat: 3, veg: true },
            { name: 'Tandoori Roti', price: 30, cat: 3, veg: true },
            // Beverages
            { name: 'Coke', price: 60, cat: 4, veg: true },
            { name: 'Virgin Mojito', price: 180, cat: 4, veg: true },
            { name: 'Cold Coffee', price: 150, cat: 4, veg: true },
            // Desserts
            { name: 'Gulab Jamun', price: 120, cat: 5, veg: true },
            { name: 'Brownie with Ice Cream', price: 220, cat: 5, veg: true },
        ];

        const menuItems = [];
        for (const m of menuItemsData) {
            const mid = ID.unique();
            await withRetry(
                () => databases.createDocument(databaseId, COLLECTIONS.menu_items, mid, {
                    name: m.name,
                    price: parseFloat(m.price),
                    category_id: categories[m.cat].id,
                    is_veg: m.veg,
                    availability: true
                }),
                `creating menu item ${m.name}`
            );
            menuItems.push({ id: mid, name: m.name, price: m.price });
            await delay(300);
        }
        console.log('SUCCESS: Created menu items');

        // ── Tables ───────────────────────────────────────────────────────────
        console.log('Creating tables...');
        const allTables = [];
        for (let i = 1; i <= 15; i++) {
            const tid = ID.unique();
            await withRetry(
                () => databases.createDocument(databaseId, COLLECTIONS.tables, tid, {
                    number: i,
                    table_number: i,
                    capacity: i <= 5 ? 2 : i <= 12 ? 4 : 8,
                    status: i <= 5 ? 'occupied' : i === 8 ? 'booked' : 'available'
                }),
                `creating table ${i}`
            );
            allTables.push({ id: tid, number: i });
            await delay(300);
        }
        console.log('SUCCESS: Created 15 tables');

        // ── Sample Orders ────────────────────────────────────────────────────
        console.log('Creating sample orders...');
        const now = new Date();

        // 5 Completed Orders
        for (let i = 0; i < 5; i++) {
            const date = new Date(now);
            date.setHours(date.getHours() - (i + 1));
            
            const total = 1200;
            const table = allTables[i + 10];
            const orderId = ID.unique();

            await withRetry(
                () => databases.createDocument(databaseId, COLLECTIONS.orders, orderId, {
                    order_number: `ORD-${1000 + i}`,
                    token_number: 1000 + i,
                    order_type: 'dine-in',
                    table_id: table.id,
                    order_status: 'completed',
                    payment_status: 'paid',
                    payment_method: i % 2 === 0 ? 'cash' : 'upi',
                    total_amount: parseFloat(total),
                    final_amount: parseFloat(total),
                    waiter_id: waiterId,
                    kot_status: 'Closed',
                    completed_at: date.toISOString(),
                    payment_at: date.toISOString()
                }),
                `creating order ORD-${1000 + i}`
            );
            await delay(300);
        }

        // 3 Active/Pending Orders (to show in Dashboard)
        const activeStatuses = ['pending', 'preparing', 'ready'];
        for (let i = 0; i < 3; i++) {
            const status = activeStatuses[i];
            const table = allTables[i];
            const orderId = ID.unique();
            const token = 2000 + i;

            await withRetry(
                () => databases.createDocument(databaseId, COLLECTIONS.orders, orderId, {
                    order_number: `ORD-${token}`,
                    token_number: token,
                    order_type: 'dine-in',
                    table_id: table.id,
                    order_status: status,
                    payment_status: 'unpaid',
                    total_amount: 850.50,
                    final_amount: 850.50,
                    waiter_id: waiterId,
                    kot_status: status === 'pending' ? 'Open' : 'Running'
                }),
                `creating active order ORD-${token}`
            );

            // Add an item to this active order
            await databases.createDocument(databaseId, COLLECTIONS.order_items, ID.unique(), {
                order_id: orderId,
                menu_item_id: menuItems[0].id,
                name: menuItems[0].name,
                price: parseFloat(menuItems[0].price),
                quantity: 2,
                status: status === 'pending' ? 'PENDING' : status === 'preparing' ? 'COOKING' : 'READY'
            });

            await delay(300);
        }

        console.log('SUCCESS: Generated full data set');
        console.log('\nSeed complete!\n');


        console.log('\nSeed complete!\n');
    } catch (error) {
        console.error('--- SEED ERROR ---');
        console.error('Message:', error.message);
        console.error('Code:', error.code);
        if (error.response) console.error('Response:', JSON.stringify(error.response));
        console.error(error.stack);
    }
};

importData().then(() => {
    console.log('Seed process finished naturally.');
});
