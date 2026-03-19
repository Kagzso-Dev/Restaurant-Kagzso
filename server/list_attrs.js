require('dotenv').config();
const { databases, databaseId, COLLECTIONS } = require('./config/appwrite');

async function test() {
    try {
        const res = await databases.listAttributes(databaseId, COLLECTIONS.settings);
        console.log('--- ALL ATTRIBUTES ---');
        res.attributes.forEach(a => {
            console.log(`[${a.key}] type=${a.type} status=${a.status} default=${a.default} required=${a.required}`);
        });
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
test();
