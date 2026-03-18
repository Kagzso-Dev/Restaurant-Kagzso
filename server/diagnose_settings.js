const { Client, Databases } = require('node-appwrite');
require('dotenv').config({ path: 'd:\\kagzso-kot-appwrite-main\\Restaurant-Kagzso\\server\\.env' });

const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const databaseId = process.env.APPWRITE_DATABASE_ID;
const collectionId = 'settings';
const docId = 'global_settings';

async function diagnose() {
    console.log('--- Diagnosis Start ---');
    try {
        console.log(`Checking Collection: ${collectionId}...`);
        const collection = await databases.getCollection(databaseId, collectionId);
        console.log('Attributes found:', collection.attributes.map(a => `${a.key} (${a.type})`));
        
        console.log(`Checking Document: ${docId}...`);
        const doc = await databases.getDocument(databaseId, collectionId, docId);
        console.log('Document details:', JSON.stringify(doc, null, 2));
    } catch (error) {
        console.error('DIAGNOSIS ERROR:', error.message);
        if (error.code) console.error('Error Code:', error.code);
    }
    console.log('--- Diagnosis Complete ---');
}

diagnose();
