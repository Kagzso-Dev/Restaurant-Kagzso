const { Client, Databases } = require('node-appwrite');
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
        console.log(`Checking Database: ${databaseId}`);
        const response = await databases.listCollections(databaseId);
        response.collections.forEach(c => {
            console.log(`Name: ${c.name}, ID: ${c.$id}`);
        });
    } catch (error) {
        console.error('Error fetching collections:', error.message);
    }
}

checkCollections();
