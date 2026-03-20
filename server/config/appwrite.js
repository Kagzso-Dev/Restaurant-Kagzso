const { Client, Databases, Storage, ID, Query } = require('node-appwrite');
const { InputFile } = require('node-appwrite/file');

const client = new Client();

client
    .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const storage = new Storage(client);
const databaseId = process.env.APPWRITE_DATABASE_ID;
const storageBucketId = process.env.APPWRITE_STORAGE_BUCKET_ID || '69b6b7070031575acce8';

// Collection IDs
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

module.exports = {
    client,
    databases,
    storage,
    storageBucketId,
    InputFile,
    databaseId,
    COLLECTIONS,
    ID,
    Query
};
