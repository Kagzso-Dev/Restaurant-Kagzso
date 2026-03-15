const { databases, databaseId, COLLECTIONS } = require('../config/appwrite');

/**
 * Counter — atomic sequence generator (replaces MongoDB Counter collection).
 * In Appwrite, we use read-increment-update logic.
 */
const Counter = {
    async getNextSequence(key) {
        try {
            let document;
            try {
                document = await databases.getDocument(databaseId, COLLECTIONS.counters, key);
            } catch (e) {
                // If document doesn't exist, create it with initial value 0
                if (e.code === 404 || e.message?.includes('not found')) {
                    document = await databases.createDocument(databaseId, COLLECTIONS.counters, key, {
                        sequence_value: 0
                    });
                } else {
                    throw e;
                }
            }
            
            const newVal = (document.sequence_value || 0) + 1;
            await databases.updateDocument(databaseId, COLLECTIONS.counters, key, {
                sequence_value: newVal
            });
            return newVal;
        } catch (err) {
            console.error('Counter error:', err);
            throw err;
        }
    },
};

module.exports = Counter;
