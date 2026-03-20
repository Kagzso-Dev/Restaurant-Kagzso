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

async function listAll() {
    try {
        const resp = await databases.listCollections(databaseId);
        let out = `Total: ${resp.total}\n`;
        resp.collections.forEach(c => {
            out += `[${c.name}] ID: ${c.$id}\n`;
        });
        fs.writeFileSync('true_list.txt', out);
    } catch (e) {
        fs.writeFileSync('true_list.txt', 'ERROR: ' + e.message);
    }
}
listAll();
