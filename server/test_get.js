const { Client, Databases } = require('node-appwrite');
const fs = require('fs');
require('dotenv').config({ path: 'd:\\kagzso-kot-appwrite-main\\Restaurant-Kagzso\\server\\.env' });

const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const databaseId = process.env.APPWRITE_DATABASE_ID;
const collectionId = 'settings';
const docId = 'global_settings';

async function testGet() {
    try {
        const doc = await databases.getDocument(databaseId, collectionId, docId);
        fs.writeFileSync('test_get_status.txt', 'SUCCESS: ' + JSON.stringify(doc, null, 2));
    } catch (e) {
        fs.writeFileSync('test_get_status.txt', 'ERROR: ' + e.message + (e.code ? ' (code:' + e.code + ')' : ''));
    }
}

testGet().then(() => console.log('Done'));
