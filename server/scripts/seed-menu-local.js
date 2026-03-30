require('dotenv').config();
const { databases, databaseId, COLLECTIONS, Query, ID } = require('../config/appwrite');

const CATEGORIES = [
    { name: 'Starters', image: '/images/starters.png' },
    { name: 'Main Course', image: '/images/main-course.png' },
    { name: 'Beverages', image: '/images/beverages.png' },
    { name: 'Desserts', image: '/images/desserts.png' },
    { name: 'Breads', image: '/images/breads.png' },
    { name: 'Salads', image: '/images/salads.png' },
    { name: 'Tandoor', image: '/images/tandoor.png' }
];

const MENU_ITEMS = [
    // Starters
    { name: 'Panner Tikka', category: 'Starters', variants: [{name: 'Regular', price: 250}], availability: true, image: '/images/starters.png' },
    { name: 'Hara Bhara Kabab', category: 'Starters', variants: [{name: 'Regular', price: 220}], availability: true, image: '/images/starters.png' },
    { name: 'Chilly Chicken', category: 'Starters', variants: [{name: 'Half', price: 180}, {name: 'Full', price: 340}], availability: true, image: '/images/starters.png' },

    // Main Course
    { name: 'Butter Chicken', category: 'Main Course', variants: [{name: 'Half', price: 350}, {name: 'Full', price: 600}], availability: true, image: '/images/main-course.png' },
    { name: 'Kadhai Paneer', category: 'Main Course', variants: [{name: 'Regular', price: 280}], availability: true, image: '/images/main-course.png' },
    { name: 'Dal Makhani', category: 'Main Course', variants: [{name: 'Regular', price: 200}], availability: true, image: '/images/main-course.png' },

    // Beverages
    { name: 'Fresh Lime Soda', category: 'Beverages', variants: [{name: 'Sweet', price: 80}, {name: 'Salted', price: 80}], availability: true, image: '/images/beverages.png' },
    { name: 'Mango Lassi', category: 'Beverages', variants: [{name: 'Glass', price: 120}], availability: true, image: '/images/beverages.png' },
    
    // Desserts
    { name: 'Gulab Jamun', category: 'Desserts', variants: [{name: '2 Pcs', price: 90}], availability: true, image: '/images/desserts.png' },
    { name: 'Rasmalai', category: 'Desserts', variants: [{name: '2 Pcs', price: 110}], availability: true, image: '/images/desserts.png' },
    { name: 'Chocolate Brownie', category: 'Desserts', variants: [{name: 'With Ice Cream', price: 180}], availability: true, image: '/images/desserts.png' },

    // Breads
    { name: 'Butter Naan', category: 'Breads', variants: [{name: 'Regular', price: 45}], availability: true, image: '/images/breads.png' },
    { name: 'Garlic Naan', category: 'Breads', variants: [{name: 'Regular', price: 60}], availability: true, image: '/images/breads.png' },
    { name: 'Tandoori Roti', category: 'Breads', variants: [{name: 'Regular', price: 25}], availability: true, image: '/images/breads.png' },

    // Salads
    { name: 'Green Salad', category: 'Salads', variants: [{name: 'Regular', price: 100}], availability: true, image: '/images/salads.png' },
    { name: 'Kachumber Salad', category: 'Salads', variants: [{name: 'Regular', price: 120}], availability: true, image: '/images/salads.png' },

    // Tandoor
    { name: 'Tandoori Chicken', category: 'Tandoor', variants: [{name: 'Half', price: 280}, {name: 'Full', price: 500}], availability: true, image: '/images/tandoor.png' },
    { name: 'Afghani Chicken', category: 'Tandoor', variants: [{name: 'Half', price: 300}, {name: 'Full', price: 550}], availability: true, image: '/images/tandoor.png' }
];

const seedMenuLocal = async () => {
    try {
        console.log('--- Seeding Menu Items Locally ---');
        
        let existingCats = await databases.listDocuments(databaseId, COLLECTIONS.categories, [Query.limit(100)]);
        const categoryMap = {}; // name -> id

        existingCats.documents.forEach(c => {
            categoryMap[c.name.trim()] = c.$id;
        });

        for (const cat of CATEGORIES) {
            if (!categoryMap[cat.name]) {
                const doc = await databases.createDocument(databaseId, COLLECTIONS.categories, ID.unique(), {
                    name: cat.name
                });
                console.log(`Created Category: ${cat.name}`);
                categoryMap[cat.name] = doc.$id;
            } else {
                console.log(`Category exists: ${cat.name}`);
            }
        }

        const existingItems = await databases.listDocuments(databaseId, COLLECTIONS.menu_items, [Query.limit(100)]);
        const itemMap = existingItems.documents.map(i => i.name.trim().toLowerCase());

        let addedCount = 0;
        for (const item of MENU_ITEMS) {
            const normalizedName = item.name.trim().toLowerCase();
            if (!itemMap.includes(normalizedName)) {
                await databases.createDocument(databaseId, COLLECTIONS.menu_items, ID.unique(), {
                    name: item.name,
                    category_id: categoryMap[item.category],
                    description: `${item.name} prepared freshly.`,
                    image: item.image,
                    availability: item.availability,
                    price: parseFloat(item.variants[0].price),
                    variants: JSON.stringify(item.variants)
                });
                console.log(`Created Menu Item: ${item.name}`);
                addedCount++;
            } else {
                console.log(`Menu Item exists: ${item.name}`);
            }
        }

        console.log(`--- Seeding Complete (Added ${addedCount} items) ---`);
        process.exit(0);
    } catch (err) {
        console.error('Seeding failed:', err.message);
        process.exit(1);
    }
};

seedMenuLocal();
