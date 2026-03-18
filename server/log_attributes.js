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

async function logAttributes() {
    try {
        const c = await databases.getCollection(databaseId, collectionId);
        const log = c.attributes.map(a => `${a.key}: ${a.type} (size:${a.size||'N/A'}, req:${a.required})`).join('\n');
        fs.writeFileSync('attributes_log.txt', log);
        console.log('Attributes written to attributes_log.txt');
    } catch (e) {
        fs.writeFileSync('attributes_log.txt', e.message);
    }
}

logAttributes();
