const { Client, Databases, Permission, Role } = require('node-appwrite');
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
    notifications: 'notifications',
    notification_reads: 'notification_reads',
    settings: 'settings',
    counters: 'counters',
    daily_analytics: 'daily_analytics'
};

const permissions = [
    Permission.read(Role.any()),
    Permission.create(Role.any()),
    Permission.update(Role.any()),
    Permission.delete(Role.any())
];

async function setup() {
    try {
        console.log(`Setting up collections in DB: ${databaseId}`);
        for (const [key, id] of Object.entries(COLLECTIONS)) {
            try {
                await databases.getCollection(databaseId, id);
                console.log(`PRESENT: ${id}`);
            } catch (e) {
                console.log(`CREATING: ${id} (${key})...`);
                // name = key capitalized
                const name = key.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
                await databases.createCollection(databaseId, id, name, permissions);
                console.log(`SUCCESS: ${id}`);
            }
        }
    } catch (error) {
        console.error('ERROR:', error.message);
    }
}

setup();
