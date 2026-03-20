const { Client, Databases } = require('node-appwrite');
const fs = require('fs');
require('dotenv').config();

const client = new Client();
client
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

async function checkDatabases() {
    let output = '';
    try {
        const response = await databases.list();
        response.databases.forEach(db => {
            output += `Name: ${db.name}, ID: ${db.$id}\n`;
        });
        fs.writeFileSync('databases.txt', output);
        console.log('Done.');
    } catch (error) {
        fs.writeFileSync('error_db.txt', error.message);
        console.error('Error fetching databases:', error.message);
    }
}

checkDatabases();
