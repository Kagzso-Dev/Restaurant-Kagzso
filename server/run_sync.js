require('dotenv').config();
const { syncSchema } = require('./utils/schema_sync');

async function runSync() {
    console.log('Starting standalone schema sync...');
    await syncSchema();
    process.exit(0);
}

runSync();
