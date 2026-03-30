require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { databases, databaseId, COLLECTIONS, Query } = require('../config/appwrite');

const IMG_DIR = path.join(__dirname, '../../client/public/images/items');
if (!fs.existsSync(IMG_DIR)) fs.mkdirSync(IMG_DIR, { recursive: true });

// Each item mapped to a beautiful Unsplash photo
const ITEM_IMAGES = {
    // Starters
    'paneer tikka':         'https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?auto=format&fit=crop&w=400&q=70',
    'panner tikka':         'https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?auto=format&fit=crop&w=400&q=70',
    'hara bhara kabab':     'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=400&q=70',
    'chilly chicken':       'https://images.unsplash.com/photo-1562802378-063ec186a863?auto=format&fit=crop&w=400&q=70',
    'chicken tikka':        'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=400&q=70',
    'chicken wings':        'https://images.unsplash.com/photo-1527477396000-e27163b481c2?auto=format&fit=crop&w=400&q=70',

    // Main Course
    'butter chicken':       'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?auto=format&fit=crop&w=400&q=70',
    'kadhai paneer':        'https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?auto=format&fit=crop&w=400&q=70',
    'dal makhani':          'https://images.unsplash.com/photo-1546833998-877b37c2e5c6?auto=format&fit=crop&w=400&q=70',
    'mutton gravy':         'https://images.unsplash.com/photo-1574653853027-5382a3d23a15?auto=format&fit=crop&w=400&q=70',
    'chicken biryani':      'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=400&q=70',
    'mutton biryani':       'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=400&q=70',
    'chicken 65':           'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?auto=format&fit=crop&w=400&q=70',
    'grill chicken':        'https://images.unsplash.com/photo-1598103442097-8b74394b95c2?auto=format&fit=crop&w=400&q=70',
    'chicken noodles':      'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=400&q=70',
    'chicken rice':         'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=400&q=70',
    'chicken lolipop':      'https://images.unsplash.com/photo-1619221882220-947b3d3c8861?auto=format&fit=crop&w=400&q=70',

    // Beverages
    'fresh lime soda':      'https://images.unsplash.com/photo-1542573875-34a6f7b1b4c3?auto=format&fit=crop&w=400&q=70',
    'mango lassi':          'https://images.unsplash.com/photo-1527661591475-527312dd65f5?auto=format&fit=crop&w=400&q=70',
    'coke':                 'https://images.unsplash.com/photo-1554866585-cd94860890b7?auto=format&fit=crop&w=400&q=70',
    'pepsi':                'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?auto=format&fit=crop&w=400&q=70',
    'campa drink':          'https://images.unsplash.com/photo-1632000319-87a6dba4f31e?auto=format&fit=crop&w=400&q=70',

    // Desserts
    'gulab jamun':          'https://images.unsplash.com/photo-1603532648955-039310d9ed75?auto=format&fit=crop&w=400&q=70',
    'rasmalai':             'https://images.unsplash.com/photo-1660664870700-61e7a2f1a66b?auto=format&fit=crop&w=400&q=70',
    'chocolate brownie':    'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=400&q=70',

    // Breads
    'butter naan':          'https://images.unsplash.com/photo-1619740455993-9bc26b5f0af6?auto=format&fit=crop&w=400&q=70',
    'garlic naan':          'https://images.unsplash.com/photo-1607330289024-1535c6b4e1c1?auto=format&fit=crop&w=400&q=70',
    'tandoori roti':        'https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?auto=format&fit=crop&w=400&q=70',

    // Salads
    'green salad':          'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=400&q=70',
    'kachumber salad':      'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=400&q=70',

    // Tandoor
    'tandoori chicken':     'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=400&q=70',
    'afghani chicken':      'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=400&q=70',
};

const toFileName = (name) => name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-') + '.jpg';

const downloadImage = async (name, url) => {
    const fileName = toFileName(name);
    const filePath = path.join(IMG_DIR, fileName);
    try {
        const res = await fetch(url, { redirect: 'follow' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buffer = await res.arrayBuffer();
        fs.writeFileSync(filePath, Buffer.from(buffer));
        return `/images/items/${fileName}`;
    } catch (e) {
        console.error(`  [SKIP] ${name}: ${e.message}`);
        return null;
    }
};

const run = async () => {
    console.log('--- Downloading Per-Item Images ---');

    // 1. Download all images first
    const downloadedMap = {};
    for (const [itemName, url] of Object.entries(ITEM_IMAGES)) {
        process.stdout.write(`Downloading: ${itemName}...`);
        const localPath = await downloadImage(itemName, url);
        if (localPath) {
            downloadedMap[itemName.toLowerCase()] = localPath;
            console.log(` OK -> ${localPath}`);
        }
    }

    // 2. Update database records
    console.log('\n--- Updating Database ---');
    const items = await databases.listDocuments(databaseId, COLLECTIONS.menu_items, [Query.limit(100)]);

    for (const item of items.documents) {
        const key = item.name.trim().toLowerCase();
        const newImage = downloadedMap[key];
        if (newImage) {
            await databases.updateDocument(databaseId, COLLECTIONS.menu_items, item.$id, { image: newImage });
            console.log(`[UPDATED] "${item.name}" -> ${newImage}`);
        } else {
            console.log(`[SKIP]    "${item.name}" (no specific image found)`);
        }
    }

    console.log('\n--- All Done ---');
    process.exit(0);
};

run().catch(err => { console.error(err.message); process.exit(1); });
