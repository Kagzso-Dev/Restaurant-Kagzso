const { databases, databaseId, COLLECTIONS, ID, Query } = require('../config/appwrite');

// Formats a doc. If catDoc provided, it expands category info.
const fmt = (doc, catDoc = null) => {
    if (!doc) return null;
    return {
        _id: doc.$id,
        name: doc.name,
        description: doc.description,
        price: parseFloat(doc.price),
        category: catDoc 
            ? { _id: catDoc.$id, name: catDoc.name, color: catDoc.color, status: catDoc.status }
            : doc.category_id,
        image: doc.image,
        availability: !!doc.availability,
        isVeg: !!doc.is_veg,
        variants: doc.variants ? JSON.parse(doc.variants) : [],
        createdAt: doc.$createdAt,
        updatedAt: doc.$updatedAt,
    };
};

const MenuItem = {
    // Returns ALL items (including unavailable) with category details — for admin management
    async findAll() {
        const [itemsResp, catsResp] = await Promise.all([
            databases.listDocuments(databaseId, COLLECTIONS.menu_items, [Query.orderAsc('name'), Query.limit(100)]),
            databases.listDocuments(databaseId, COLLECTIONS.categories, [Query.limit(100)])
        ]);
        
        const catMap = {};
        catsResp.documents.forEach(c => catMap[c.$id] = c);
        
        return itemsResp.documents.map(item => fmt(item, catMap[item.category_id]));
    },

    // Returns only available items with category details — for ordering/waiter views
    async findAvailable() {
        const [itemsResp, catsResp] = await Promise.all([
            databases.listDocuments(databaseId, COLLECTIONS.menu_items, [
                Query.equal('availability', true),
                Query.orderAsc('name'),
                Query.limit(100)
            ]),
            databases.listDocuments(databaseId, COLLECTIONS.categories, [Query.limit(100)])
        ]);
        
        const catMap = {};
        catsResp.documents.forEach(c => catMap[c.$id] = c);
        
        return itemsResp.documents.map(item => fmt(item, catMap[item.category_id]));
    },

    async findById(id) {
        try {
            const item = await databases.getDocument(databaseId, COLLECTIONS.menu_items, id);
            let catDoc = null;
            if (item.category_id) {
                try {
                    catDoc = await databases.getDocument(databaseId, COLLECTIONS.categories, item.category_id);
                } catch (e) {}
            }
            return fmt(item, catDoc);
        } catch (error) {
            return null;
        }
    },

    async create({ name, description, price, category, image, isVeg, availability, variants }) {
        const doc = await databases.createDocument(
            databaseId,
            COLLECTIONS.menu_items,
            ID.unique(),
            {
                name,
                description: description || null,
                price: parseFloat(price),
                category_id: category,
                image: image || null,
                availability: availability !== false,
                is_veg: isVeg !== false,
                variants: variants?.length ? JSON.stringify(variants) : null
            }
        );
        return this.findById(doc.$id);
    },

    async updateById(id, updates) {
        const fieldMap = {
            name: 'name',
            description: 'description',
            price: 'price',
            category: 'category_id',
            image: 'image',
            availability: 'availability',
            isVeg: 'is_veg',
            variants: 'variants',
        };
        const data = {};
        for (const [key, val] of Object.entries(updates)) {
            if (key in fieldMap) {
                const col = fieldMap[key];
                // Ensure price is a number if it's being updated
                if (col === 'price' && val !== undefined) {
                    data[col] = parseFloat(val);
                } else if (key === 'variants' && val !== undefined) {
                    data['variants'] = val?.length ? JSON.stringify(val) : null;
                } else {
                    data[col] = val;
                }
            }
        }
        if (Object.keys(data).length === 0) return this.findById(id);
        
        await databases.updateDocument(
            databaseId,
            COLLECTIONS.menu_items,
            id,
            data
        );
        return this.findById(id);
    },

    async deleteById(id) {
        await databases.deleteDocument(databaseId, COLLECTIONS.menu_items, id);
    },
};

module.exports = MenuItem;
