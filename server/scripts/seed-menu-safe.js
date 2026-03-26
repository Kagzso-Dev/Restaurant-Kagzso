/**
 * Targeted Menu Seeder
 * Adds default categories and items only if they don't already exist.
 */
require('dotenv').config();
const { databases, databaseId, COLLECTIONS, ID, Query } = require('../config/appwrite');


const menuData = [
    {
        category: 'Starters',
        items: [
            { name: 'Chicken 65', price: 220, is_veg: false, image: '/images/starters.png' },
            { name: 'Paneer Tikka', price: 250, is_veg: true, image: '/images/starters.png' },
            { name: 'Gobi Manchurian', price: 180, is_veg: true, image: '/images/starters.png' },
            { name: 'Chilli Chicken', price: 240, is_veg: false, image: '/images/starters.png' }
        ]
    },
    {
        category: 'Main Course',
        items: [
            { name: 'Butter Chicken', price: 320, is_veg: false, image: '/images/main-course.png' },
            { name: 'Paneer Butter Masala', price: 280, is_veg: true, image: '/images/main-course.png' },
            { name: 'Dal Tadka', price: 200, is_veg: true, image: '/images/main-course.png' },
            { name: 'Veg Korma', price: 220, is_veg: true, image: '/images/main-course.png' },
            { name: 'Chicken Biryani', price: 350, is_veg: false, image: '/images/main-course.png' },
            { name: 'Mutton Curry', price: 450, is_veg: false, image: '/images/main-course.png' }
        ]
    },
    {
        category: 'Beverages',
        items: [
            { name: 'Fresh Lime Juice', price: 60, is_veg: true, image: '/images/beverages.png' },
            { name: 'Cold Coffee', price: 90, is_veg: true, image: '/images/beverages.png' },
            { name: 'Iced Tea', price: 80, is_veg: true, image: '/images/beverages.png' },
            { name: 'Soft Drink', price: 40, is_veg: true, image: '/images/beverages.png' }
        ]
    }
];


const seedMenu = async () => {
    try {
        console.log('--- Starting Targeted Menu Seeding ---');
        
        for (const cat of menuData) {
            // 1. Check if category exists
            let categoryDoc;
            const existingCat = await databases.listDocuments(databaseId, COLLECTIONS.categories, [
                Query.equal('name', cat.category),
                Query.limit(1)
            ]);
            
            if (existingCat.total > 0) {
                categoryDoc = existingCat.documents[0];
                console.log(`Category "${cat.category}" already exists.`);
            } else {
                categoryDoc = await databases.createDocument(databaseId, COLLECTIONS.categories, ID.unique(), {
                    name: cat.category,
                    description: cat.category,
                    status: 'active',
                    color: '#f97316'
                });
                console.log(`Created category "${cat.category}".`);
            }
            
            // 2. Check and add items
            for (const item of cat.items) {
                const existingItem = await databases.listDocuments(databaseId, COLLECTIONS.menu_items, [
                    Query.equal('name', item.name),
                    Query.limit(1)
                ]);
                
                if (existingItem.total > 0) {
                    console.log(`  Item "${item.name}" already exists, skipping.`);
                } else {
                    await databases.createDocument(databaseId, COLLECTIONS.menu_items, ID.unique(), {
                        name: item.name,
                        price: parseFloat(item.price),
                        category_id: categoryDoc.$id,
                        is_veg: item.is_veg,
                        image: item.image || null,
                        availability: true
                    });

                    console.log(`  Added item "${item.name}".`);
                }
            }
        }
        
        console.log('--- Seeding Complete ---');
        process.exit(0);
    } catch (error) {
        console.error('Seeding failed:', error.message);
        process.exit(1);
    }
};

seedMenu();
