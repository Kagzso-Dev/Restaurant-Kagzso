/**
 * This script attempts to update the 'role' enum attribute in the 'users' collection
 * to support the required roles for the POS system.
 */
require('dotenv').config();
const { Client, Databases } = require('node-appwrite');

async function fixRoleEnum() {
    const client = new Client()
        .setEndpoint(process.env.APPWRITE_ENDPOINT)
        .setProject(process.env.APPWRITE_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);
    const databaseId = process.env.APPWRITE_DATABASE_ID;
    const collectionId = 'users'; 
    const attributeKey = 'role';
    const newElements = ['admin', 'waiter', 'kitchen', 'cashier', 'manager'];

    try {
        console.log(`Checking attribute "${attributeKey}" in collection "${collectionId}"...`);
        
        // Attempt to update existing enum attribute
        // Note: Appwrite doesn't always allow updating elements if it changes the enum structure significantly
        // or if data exists that would be invalidated.
        try {
            await databases.updateEnumAttribute(
                databaseId,
                collectionId,
                attributeKey,
                newElements,
                true, // required
                'waiter' // default
            );
            console.log('Successfully updated "role" enum attribute.');
        } catch (updateError) {
            console.warn('Update failed, attempting to delete and recreate (Note: This may fail if data exists):', updateError.message);
            
            // Try to delete and recreate if update fails
            try {
                await databases.deleteAttribute(databaseId, collectionId, attributeKey);
                console.log('Deleted old attribute. Waiting for deletion to propagate...');
                
                // Wait a bit for deletion to propagate in Appwrite's backend
                await new Promise(resolve => setTimeout(resolve, 5000));
                
                await databases.createEnumAttribute(
                    databaseId,
                    collectionId,
                    attributeKey,
                    newElements,
                    true,
                    'waiter'
                );
                console.log('Successfully recreated "role" enum attribute with correct values.');
            } catch (recreateError) {
                console.error('Critical failure: Could not fix attribute automatically.', recreateError.message);
                console.log('\nPlease manually update the "role" attribute in your Appwrite Console:');
                console.log(`1. Go to Database -> ${databaseId} -> Collection: users -> Attributes`);
                console.log(`2. Find "role" attribute.`);
                console.log(`3. Update it to be an ENUM with values: ${newElements.join(', ')}`);
            }
        }
    } catch (error) {
        console.error('An unexpected error occurred:', error.message);
    }
}

fixRoleEnum();
