require('dotenv').config({ path: 'd:/kagzso-kot-appwrite-main/Restaurant-Kagzso/server/.env' });
const { databases, databaseId, COLLECTIONS } = require('../config/appwrite');

async function checkStatus() {
    try {
        const res = await databases.listAttributes(databaseId, COLLECTIONS.order_items);
        const attr = res.attributes.find(a => a.key === 'variant');
        if (attr) {
            console.log(`Attribute 'variant' exists with status: ${attr.status}`);
        } else {
            console.log("Attribute 'variant' NOT found.");
        }
    } catch (e) {
        console.error(e.message);
    }
}
checkStatus();
