require('dotenv').config();
const { databases, databaseId, COLLECTIONS, Query } = require('../config/appwrite');

const C_MAP = {
    'Starters': '/images/starters.png',
    'Main Course': '/images/main-course.png',
    'Beverages': '/images/beverages.png',
    'Desserts': '/images/desserts.png',
    'Breads': '/images/breads.png',
    'Salads': '/images/salads.png',
    'Tandoor': '/images/tandoor.png'
};
const DEFAULT = '/images/main-course.png';

const fixAllImages = async () => {
    try {
        console.log('--- Applying Fallback Images to ALL Menu Items ---');
        
        let existingCats = await databases.listDocuments(databaseId, COLLECTIONS.categories, [Query.limit(100)]);
        const categoryMap = {}; 
        existingCats.documents.forEach(c => categoryMap[c.$id] = c.name.trim());

        const items = await databases.listDocuments(databaseId, COLLECTIONS.menu_items, [Query.limit(100)]);
        
        for (const item of items.documents) {
            const catName = categoryMap[item.category_id] || '';
            const correctImage = C_MAP[catName] || DEFAULT;
            
            // If it's missing, or if it points to a non-existent URL or previous broken Unsplash URL, fix it!
            if (!item.image || item.image.trim() === '' || item.image.includes('unsplash.com')) {
                await databases.updateDocument(databaseId, COLLECTIONS.menu_items, item.$id, {
                    image: correctImage
                });
                console.log(`[FIXED]  "${item.name}" -> ${correctImage}`);
            } else {
                console.log(`[OK]     "${item.name}" -> ${item.image}`);
            }
        }
        
        console.log('--- Complete ---');
        process.exit(0);
    } catch (err) {
        console.error('Failed:', err.message);
        process.exit(1);
    }
};

fixAllImages();
