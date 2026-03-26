require('dotenv').config({ path: 'd:/kagzso-kot-appwrite-main/Restaurant-Kagzso/server/.env' });
const { databases, databaseId, COLLECTIONS } = require('../config/appwrite');

async function fixBiryani() {
    try {
        const id = '69bd5b790008fcd31deb';
        console.log(`Updating item ${id}...`);
        await databases.updateDocument(databaseId, COLLECTIONS.menu_items, id, {
            name: 'Biryani',
            variants: JSON.stringify([
                { name: 'Half', price: 150 },
                { name: 'Full', price: 300 }
            ])
        });
        console.log("Successfully fixed Biryani name and variants!");
    } catch (error) {
        console.error("Error:", error.message);
    }
}
fixBiryani();
