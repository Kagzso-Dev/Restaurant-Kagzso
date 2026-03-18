const { Client, Databases } = require('node-appwrite');
require('dotenv').config({ path: 'd:\\kagzso-kot-appwrite-main\\Restaurant-Kagzso\\server\\.env' });

const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const databaseId = process.env.APPWRITE_DATABASE_ID;
const collectionId = 'settings';
const docId = 'global_settings';

async function testUpdate() {
    console.log('--- Test Update Start ---');
    try {
        const data = {
            restaurant_name: "KAGZZO",
            address: "Chennai, 60001",
            currency: "INR",
            currency_symbol: "₹",
            tax_rate: 5.0,
            gst_number: "",
            pending_color: "#3b82f6",
            accepted_color: "#8b5cf6",
            preparing_color: "#f59e0b",
            ready_color: "#10b981",
            dashboard_view: "all"
        };
        console.log('Sending full payload to updateDocument...');
        const updated = await databases.updateDocument(databaseId, collectionId, docId, data);
        console.log('UPDATE SUCCESS:', updated.$id);
    } catch (error) {
        console.error('UPDATE ERROR:', error.message);
        if (error.code) console.error('Error Code:', error.code);
        if (error.response) console.error('Response:', JSON.stringify(error.response, null, 2));
    }
    console.log('--- Test Update Complete ---');
}

testUpdate();
