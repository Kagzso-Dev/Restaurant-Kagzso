const { Client, Databases } = require('node-appwrite');
const fs = require('fs');
require('dotenv').config();

const client = new Client();
client
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

async function listEverything() {
    let output = '';
    try {
        const dbs = await databases.list();
        output += `Databases found: ${dbs.total}\n`;
        for (const db of dbs.databases) {
            output += `\nDB: ${db.name} (ID: ${db.$id})\n`;
            try {
                const colls = await databases.listCollections(db.$id);
                output += `  Collections: ${colls.total}\n`;
                colls.collections.forEach(c => {
                    output += `  - ${c.name} (ID: ${c.$id})\n`;
                });
            } catch (e) {
                output += `  Error listing collections: ${e.message}\n`;
            }
        }
        fs.writeFileSync('full_list.txt', output);
        console.log('Done.');
    } catch (error) {
        fs.writeFileSync('error_full.txt', error.stack || error.message);
        console.error('Error:', error.message);
    }
}

listEverything();
