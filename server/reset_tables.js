require('dotenv').config();
const { databases, databaseId, COLLECTIONS } = require('./config/appwrite');

async function resetTables() {
    try {
        const table1 = '69c9f9f6000a4c3d3172';
        const table2 = '69c9f9f60039ff7d7eab';
        
        console.log('Resetting Table 1 to available...');
        await databases.updateDocument(databaseId, COLLECTIONS.tables, table1, {
            status: 'available',
            current_order_id: null
        });
        
        console.log('Resetting Table 2 to available...');
        await databases.updateDocument(databaseId, COLLECTIONS.tables, table2, {
            status: 'available',
            current_order_id: null
        });
        
        console.log('SUCCESS: Tables 1 and 2 reset safely.');
    } catch (e) {
        console.error('ERROR:', e.message);
    }
}
resetTables();
