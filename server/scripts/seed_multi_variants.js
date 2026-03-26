require('dotenv').config({ path: 'd:/kagzso-kot-appwrite-main/Restaurant-Kagzso/server/.env' });
const { databases, databaseId, COLLECTIONS, Query, ID } = require('../config/appwrite');

async function seedMultipleVariants() {
    try {
        const itemsToUpdate = [
            {
                names: ['Biryani', 'Briyani'],
                variants: [
                    { name: 'Half', price: 150 },
                    { name: 'Full', price: 300 }
                ]
            },
            {
                names: ['Grill', 'Chicken Grill', 'Tandoori Grill'],
                variants: [
                    { name: 'Quarter', price: 120 },
                    { name: 'Half', price: 230 },
                    { name: 'Full', price: 420 }
                ]
            },
            {
                names: ['Coke', 'Pepsi', 'Soft Drink'],
                variants: [
                    { name: 'Small', price: 30 },
                    { name: 'Large', price: 60 }
                ]
            }
        ];

        // Ensure category for new items
        const cats = await databases.listDocuments(databaseId, COLLECTIONS.categories, [Query.limit(1)]);
        const catId = cats.documents[0]?.$id || 'uncategorized';

        for (const config of itemsToUpdate) {
            console.log(`Checking for ${config.names.join(', ')}...`);
            const search = await databases.listDocuments(databaseId, COLLECTIONS.menu_items, [
                Query.or(config.names.map(n => Query.equal('name', n)))
            ]);

            if (search.total > 0) {
                for (const doc of search.documents) {
                    console.log(`Updating ${doc.name} (ID: ${doc.$id})...`);
                    await databases.updateDocument(databaseId, COLLECTIONS.menu_items, doc.$id, {
                        variants: JSON.stringify(config.variants)
                    });
                }
            } else {
                // Create the primary one if missing
                const primaryName = config.names[0];
                console.log(`Creating missing item: ${primaryName}...`);
                await databases.createDocument(databaseId, COLLECTIONS.menu_items, ID.unique(), {
                    name: primaryName,
                    price: config.variants[0].price,
                    category_id: catId,
                    availability: true,
                    is_veg: false,
                    variants: JSON.stringify(config.variants)
                });
            }
        }
        console.log("Seeding complete!");
    } catch (error) {
        console.error("Error:", error.message);
    }
}
seedMultipleVariants();
