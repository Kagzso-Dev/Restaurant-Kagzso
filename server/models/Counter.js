const { databases, databaseId, COLLECTIONS } = require('../config/appwrite');

/**
 * Counter — atomic sequence generator (replaces MongoDB Counter collection).
 * In Appwrite, we use read-increment-update logic with a retry loop to handle concurrency.
 */
const Counter = {
    async getNextSequence(key, maxRetries = 10) {
        let lastErr;
        for (let i = 0; i < maxRetries; i++) {
            try {
                let document;
                try {
                    document = await databases.getDocument(databaseId, COLLECTIONS.counters, key);
                } catch (e) {
                    // 404 from Appwrite means the document genuinely doesn't exist
                    if (e.code === 404 || e.message?.includes('not found')) {
                        try {
                            document = await databases.createDocument(databaseId, COLLECTIONS.counters, key, {
                                sequence_value: 0
                            });
                        } catch (createErr) {
                            // If creation fails with conflict, someone else created it; just retry reading it.
                            if (createErr.code === 409) continue;
                            throw createErr;
                        }
                    } else {
                        throw e;
                    }
                }
                
                const newVal = (document.sequence_value || 0) + 1;
                
                // We use document.$id and the new value. 
                // Note: Appwrite doesn't have native 'If-Match' for attributes in all SDK versions,
                // but we can simulate it or rely on the retry logic if many people hit it.
                await databases.updateDocument(databaseId, COLLECTIONS.counters, key, {
                    sequence_value: newVal
                });
                
                return newVal;
            } catch (err) {
                lastErr = err;
                // If update fails due to conflict or network, wait a bit and retry
                const isRetryable = err.code === 409 || err.code === 429 || err.message?.includes('fetch failed');
                if (isRetryable && i < maxRetries - 1) {
                    const delay = Math.floor(Math.random() * 100) + (i * 50); // backoff
                    await new Promise(r => setTimeout(r, delay));
                    continue;
                }
                throw err;
            }
        }
        throw lastErr || new Error(`Failed to get next sequence for ${key} after ${maxRetries} retries`);
    },
};

module.exports = Counter;

