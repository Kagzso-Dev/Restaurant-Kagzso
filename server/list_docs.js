require('dotenv').config();
const { databases, databaseId, COLLECTIONS } = require('./config/appwrite');

async function test() {
    try {
        const res = await databases.listDocuments(databaseId, COLLECTIONS.settings);
        console.log('--- DOCUMENTS ---');
        res.documents.forEach(d => {
            console.log(`Document [${d.$id}] present`);
        });
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
test();
