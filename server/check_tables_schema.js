require('dotenv').config();
const { databases, databaseId, COLLECTIONS } = require('./config/appwrite');

async function checkAttributes() {
    console.log('Using Database ID:', databaseId);
    try {
        const response = await databases.listAttributes(databaseId, COLLECTIONS.tables);
        console.log('Attributes for Tables collection:');
        response.attributes.forEach(attr => {
            console.log(`- ${attr.key} (${attr.type})`);
        });
    } catch (e) {
        console.error('Error fetching attributes:', e.message);
    }
}

checkAttributes();
