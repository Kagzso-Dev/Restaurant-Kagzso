const { Client, Databases } = require('node-appwrite');
const fs = require('fs');
require('dotenv').config();

const client = new Client();
client
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const databaseId = process.env.APPWRITE_DATABASE_ID;

async function checkCollections() {
    try {
        const response = await databases.listCollections(databaseId);
        fs.writeFileSync('raw_collections.json', JSON.stringify(response, null, 2));
        console.log(`Found ${response.collections.length} collections.`);
    } catch (error) {
        fs.writeFileSync('error_raw.txt', error.stack || error.message);
        console.error('Error:', error.message);
    }
}

checkCollections();
