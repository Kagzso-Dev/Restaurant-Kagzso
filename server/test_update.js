require('dotenv').config();
const Setting = require('./models/Setting');

async function test() {
    const { databases, databaseId, COLLECTIONS } = require('./config/appwrite');
    try {
        console.log('Listing attributes...');
        const attrs = await databases.listAttributes(databaseId, COLLECTIONS.settings);
        attrs.attributes.forEach(a => console.log(`ATTR [${a.key}]: ${a.type}`));
        
        console.log('Testing Setting update...');
        const res = await Setting.update({
            restaurantName: "KAGZZO",
            address: "Test Address",
            currency: "INR",
            currencySymbol: "₹",
            taxRate: 5,
            gstNumber: "GST12345",
            pendingColor: "#3b82f6",
            acceptedColor: "#8b5cf6",
            preparingColor: "#f59e0b",
            readyColor: "#10b981",
            dashboardView: "all",
            menuView: "list",
            dineInEnabled: true,
            tableMapEnabled: true,
            takeawayEnabled: true,
            waiterServiceEnabled: true,
            enforceMenuView: true
        });
        console.log('Success:', res);
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

test();
