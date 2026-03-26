require('dotenv').config({ path: 'd:/kagzso-kot-appwrite-main/Restaurant-Kagzso/server/.env' });
const { databases, databaseId, COLLECTIONS, Query } = require('../config/appwrite');

async function seedBiryaniVariants() {
    try {
        console.log("Searching for Biryani item...");
        const response = await databases.listDocuments(databaseId, COLLECTIONS.menu_items, [
            Query.or([
                Query.equal('name', 'Biryani'),
                Query.equal('name', 'Briyani')
            ])
        ]);

        if (response.total === 0) {
            console.log("Biryani not found. Creating it...");
            // Find a category first
            const cats = await databases.listDocuments(databaseId, COLLECTIONS.categories, [Query.limit(1)]);
            const catId = cats.documents[0]?.$id || 'uncategorized';

            await databases.createDocument(databaseId, COLLECTIONS.menu_items, 'biryani', {
                name: 'Biryani',
                price: 250,
                category_id: catId,
                availability: true,
                is_veg: false,
                variants: JSON.stringify([
                    { name: 'Half', price: 150 },
                    { name: 'Full', price: 300 }
                ])
            });
            console.log("Biryani created with variants!");
        } else {
            await Promise.all(response.documents.map(async (doc) => {
                console.log(`Found ${doc.name} (ID: ${doc.$id}). Updating variants...`);
                await databases.updateDocument(databaseId, COLLECTIONS.menu_items, doc.$id, {
                    variants: JSON.stringify([
                        { name: 'Half', price: 150 },
                        { name: 'Full', price: 300 }
                    ])
                });
            }));
            console.log("All matching items updated with variants!");
        }

    } catch (error) {
        console.error("Error:", error.message);
    }
}

seedBiryaniVariants();
