require('dotenv').config({ path: 'd:/kagzso-kot-appwrite-main/Restaurant-Kagzso/server/.env' });
const { databases, databaseId, COLLECTIONS } = require('../config/appwrite');

async function addVariantAttr() {
    try {
        console.log("Checking order_items collection attributes...");
        const res = await databases.listAttributes(databaseId, COLLECTIONS.order_items);
        const hasVariant = res.attributes.some(a => a.key === 'variant');

        if (!hasVariant) {
            console.log("Adding 'variant' attribute to order_items...");
            await databases.createStringAttribute(databaseId, COLLECTIONS.order_items, 'variant', 5000, false);
            console.log("Done. Please wait 10 seconds for it to become available.");
        } else {
            console.log("'variant' attribute already exists in order_items.");
        }

        // Also check if orders collection needs it if items are denormalized?
        // Usually 'orders' collection has an 'items' attribute which is an array of strings (JSON)
        // Let's check 'orders' attributes too
        const resOrders = await databases.listAttributes(databaseId, COLLECTIONS.orders);
        console.log("--- order_items Attributes ---");
        res.attributes.forEach(a => console.log(`- ${a.key}`));
        console.log("--- orders Attributes ---");
        resOrders.attributes.forEach(a => console.log(`- ${a.key}`));

    } catch (e) {
        console.error("Error:", e.message);
    }
}
addVariantAttr();
