/**
 * Update Menu Item Images
 * Sets images for existing menu items based on their category.
 */
require('dotenv').config();
const { databases, databaseId, COLLECTIONS, Query } = require('../config/appwrite');

const categoryImages = {
    'Starters': '/images/starters.png',
    'Main Course': '/images/main-course.png',
    'Beverages': '/images/beverages.png'
};

const updateImages = async () => {
    try {
        console.log('--- Updating Menu Item Images ---');
        
        // 1. Get all categories to match IDs
        const cats = await databases.listDocuments(databaseId, COLLECTIONS.categories);
        const catMap = {};
        cats.documents.forEach(c => catMap[c.$id] = c.name);
        
        // 2. Get all menu items
        const items = await databases.listDocuments(databaseId, COLLECTIONS.menu_items, [Query.limit(100)]);
        
        for (const item of items.documents) {
            const catName = catMap[item.category_id];
            const imageUrl = categoryImages[catName];
            
            if (imageUrl && !item.image) {
                await databases.updateDocument(databaseId, COLLECTIONS.menu_items, item.$id, {
                    image: imageUrl
                });
                console.log(`Updated image for "${item.name}" -> ${catName}`);
            } else {
                console.log(`Skipping "${item.name}" (image already exists or category not found)`);
            }
        }
        
        console.log('--- Update Complete ---');
        process.exit(0);
    } catch (error) {
        console.error('Update failed:', error.message);
        process.exit(1);
    }
};

updateImages();
