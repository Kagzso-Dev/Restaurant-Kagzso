const { Client, Databases } = require('node-appwrite');
require('dotenv').config();

const client = new Client();
client
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const databaseId = process.env.APPWRITE_DATABASE_ID;

async function checkSpecific() {
    try {
        // Try known IDs
        const ids = ['tables', 'categories', 'users', 'Categories', 'Tables', 'Users'];
        for (const id of ids) {
            try {
                const resp = await databases.getCollection(databaseId, id);
                console.log(`FOUND Collection: ${id} (Internal Name: ${resp.name})`);
            } catch (e) {
                console.log(`NOT FOUND: ${id}`);
            }
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkSpecific();
