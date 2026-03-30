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
            { id: ID.unique(), username: 'admin',   passwordHash: await hash('admin123'),   role: 'admin',   name: 'Admin' },
            { id: ID.unique(), username: 'waiter',  passwordHash: await hash('waiter123'),  role: 'waiter',  name: 'Waiter' },
            { id: ID.unique(), username: 'kitchen', passwordHash: await hash('kitchen123'), role: 'kitchen', name: 'Kitchen' },
            { id: ID.unique(), username: 'cashier', passwordHash: await hash('cashier123'), role: 'cashier', name: 'Cashier' },
        ];

        for (const u of staff) {
            console.log(`Creating user: ${u.username} (${u.role})...`);
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
            await delay(500);
        }
        const waiterId = staff.find(s => s.role === 'waiter').id;

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
            { id: ID.unique(), name: 'Starters', description: 'Appetizers' },
            { id: ID.unique(), name: 'Main Course', description: 'Heavy meals' },
            { id: ID.unique(), name: 'Beverages', description: 'Drinks' },
        ];
        for (const c of categories) {
            await withRetry(
                () => databases.createDocument(databaseId, COLLECTIONS.categories, c.id, {
                    name: c.name,
                    description: c.description,
                    color: '#f97316',
                    status: 'active'
                }),
                `creating category ${c.name}`
            );
            await delay(500);
        }
        console.log('SUCCESS: Created categories');

        // ── Menu Items ───────────────────────────────────────────────────────
        console.log('Creating menu items...');
        const menuItems = [
            { id: ID.unique(), name: 'Paneer Tikka', price: 250, category_id: categories[0].id, is_veg: true },
            { id: ID.unique(), name: 'Chicken Wings', price: 300, category_id: categories[0].id, is_veg: false },
            { id: ID.unique(), name: 'Butter Chicken', price: 400, category_id: categories[1].id, is_veg: false },
            { id: ID.unique(), name: 'Dal Makhani', price: 200, category_id: categories[1].id, is_veg: true },
            { id: ID.unique(), name: 'Coke', price: 50, category_id: categories[2].id, is_veg: true },
        ];
        for (const m of menuItems) {
            await withRetry(
                () => databases.createDocument(databaseId, COLLECTIONS.menu_items, m.id, {
                    name: m.name,
                    price: parseFloat(m.price),
                    category_id: m.category_id,
                    is_veg: m.is_veg,
                    availability: true
                }),
                `creating menu item ${m.name}`
            );
            await delay(500);
        }
        console.log('SUCCESS: Created menu items');

        // ── Tables ───────────────────────────────────────────────────────────
        console.log('Creating tables...');
        const allTables = [];
        for (let i = 1; i <= 10; i++) {
            const tid = ID.unique();
            await withRetry(
                () => databases.createDocument(databaseId, COLLECTIONS.tables, tid, {
                    number: i,
                    table_number: i,
                    capacity: 4,
                    status: 'available'
                }),
                `creating table ${i}`
            );
            allTables.push({ id: tid });
            await delay(300);
        }
        console.log('SUCCESS: Created 10 tables');

        // ── Sample Orders ────────────────────────────────────────────────────
        console.log('Creating sample orders...');
        const now = new Date();

        for (let i = 0; i < 5; i++) {
            const date = new Date(now);
            date.setHours(date.getHours() - (i % 24));
            if (i > 10) date.setDate(date.getDate() - 1);

            const item1 = menuItems[i % menuItems.length];
            const item2 = menuItems[(i + 1) % menuItems.length];
            const total = Number(item1.price) + Number(item2.price);
            const tableId = allTables[i % allTables.length].id;
            const payMethod = i % 2 === 0 ? 'cash' : 'upi';

            const prepStart = new Date(date); prepStart.setMinutes(date.getMinutes() - 20);
            const readyAt = new Date(date); readyAt.setMinutes(date.getMinutes() - 5);

            const orderId = ID.unique();
            await withRetry(
                () => databases.createDocument(databaseId, COLLECTIONS.orders, orderId, {
                    order_number: `ORD-${100 + i}`,
                    token_number: 100 + i,
                    order_type: 'dine-in',
                    table_id: tableId,
                    order_status: 'completed',
                    payment_status: 'paid',
                    payment_method: payMethod,
                    total_amount: parseFloat(total),
                    tax: 0.0,
                    discount: 0.0,
                    final_amount: parseFloat(total),
                    waiter_id: waiterId,
                    prep_started_at: prepStart.toISOString(),
                    ready_at: readyAt.toISOString(),
                    payment_at: date.toISOString(),
                    completed_at: date.toISOString(),
                    kot_status: 'Closed'
                }),
                `creating order ORD-${100 + i}`
            );
            await delay(500);

            await withRetry(
                () => databases.createDocument(databaseId, COLLECTIONS.order_items, ID.unique(), {
                    order_id: orderId,
                    menu_item_id: item1.id,
                    name: item1.name,
                    price: parseFloat(item1.price),
                    quantity: 1,
                    status: 'READY'
                }),
                `creating order item 1 for order ${orderId}`
            );
            await delay(200);

            await withRetry(
                () => databases.createDocument(databaseId, COLLECTIONS.order_items, ID.unique(), {
                    order_id: orderId,
                    menu_item_id: item2.id,
                    name: item2.name,
                    price: parseFloat(item2.price),
                    quantity: 1,
                    status: 'READY'
                }),
                `creating order item 2 for order ${orderId}`
            );
            await delay(200);
        }
        console.log('SUCCESS: Created sample orders');

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
