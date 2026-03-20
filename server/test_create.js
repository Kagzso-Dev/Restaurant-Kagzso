const { Client, Databases, ID } = require('node-appwrite');
require('dotenv').config();

const client = new Client();
client
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const databaseId = process.env.APPWRITE_DATABASE_ID;

async function testCreate() {
    try {
        console.log(`Database: ${databaseId}`);
        // Try common collection IDs from the seeder
        const colls = ['users', 'Users', 'categories', 'Categories'];
        for (const coll of colls) {
            try {
                await databases.createDocument(databaseId, coll, ID.unique(), { test: 'test' });
                console.log(`Successfully created doc in ${coll}`);
            } catch (e) {
                console.log(`FAILED in ${coll}: ${e.message}`);
                if (e.message.includes('Collection not found')) {
                    // Try to list schemas to see what IS there
                    try {
                        const all = await databases.listCollections(databaseId);
                        console.log(`LIST shows ${all.total} collections.`);
                    } catch (e2) {}
                }
            }
        }
    } catch (error) {
        console.error('CRITICAL:', error.message);
    }
}

testCreate();
