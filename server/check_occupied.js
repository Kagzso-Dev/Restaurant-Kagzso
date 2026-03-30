require('dotenv').config();
const { databases, databaseId, COLLECTIONS, Query } = require('./config/appwrite');

async function checkOccupiedTables() {
    try {
        const tables = await databases.listDocuments(databaseId, COLLECTIONS.tables, [
            Query.equal('status', 'occupied')
        ]);
        console.log(`Found ${tables.total} occupied tables.`);
        for (const t of tables.documents) {
            console.log(`Table ${t.number} ($id: ${t.$id}) - currentOrderId: ${t.current_order_id}`);
            if (t.current_order_id) {
                try {
                    const order = await databases.getDocument(databaseId, COLLECTIONS.orders, t.current_order_id);
                    console.log(`  Order Status: ${order.order_status}, Payment Status: ${order.payment_status}`);
                } catch (e) {
                    console.log(`  Order ${t.current_order_id} NOT FOUND!`);
                }
            } else {
                console.log(`  No currentOrderId set!`);
            }
        }
    } catch (e) {
        console.error('ERROR:', e.message);
    }
}
checkOccupiedTables();
