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
    let output = '';
    try {
        console.log(`Checking Database: ${databaseId}`);
        const response = await databases.listCollections(databaseId);
        response.collections.forEach(c => {
            output += `Name: ${c.name}, ID: ${c.$id}\n`;
        });
        fs.writeFileSync('collections.txt', output);
        console.log('Done.');
    } catch (error) {
        fs.writeFileSync('error.txt', error.message);
        console.error('Error fetching collections:', error.message);
    }
}

checkCollections();
