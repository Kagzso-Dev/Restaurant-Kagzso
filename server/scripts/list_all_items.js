require('dotenv').config({ path: 'd:/kagzso-kot-appwrite-main/Restaurant-Kagzso/server/.env' });
const { databases, databaseId, COLLECTIONS } = require('../config/appwrite');

async function listItems() {
    try {
        const response = await databases.listDocuments(databaseId, COLLECTIONS.menu_items);
        console.log("Documents in menu_items:");
        response.documents.forEach(d => console.log(`${d.$id}: "${d.name}" (variants: ${d.variants})`));
    } catch (error) {
        console.error("Error:", error.message);
    }
}
listItems();
