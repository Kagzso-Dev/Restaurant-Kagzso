const { Client, Databases } = require('node-appwrite');
require('dotenv').config();

const client = new Client();
client
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const databaseId = process.env.APPWRITE_DATABASE_ID;

async function testCreateColl() {
    try {
        console.log(`Database: ${databaseId}`);
        const resp = await databases.createCollection(databaseId, 'users', 'Users');
        console.log(`Successfully created collection: ${resp.$id}`);
    } catch (e) {
        console.log(`FAILED: ${e.message}`);
    }
}

testCreateColl();
