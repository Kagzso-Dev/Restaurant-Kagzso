const { databases, databaseId, COLLECTIONS, ID, Query } = require('../config/appwrite');

const fmt = (doc) => doc ? {
    _id:         doc.$id,
    name:        doc.name,
    description: doc.description,
    color:       doc.color,
    status:      doc.status,
    image:       doc.image || null,
    createdAt:   doc.$createdAt,
    updatedAt:   doc.$updatedAt,
} : null;

const Category = {
    // Returns ALL categories regardless of status — for admin management
    async findAll() {
        const response = await databases.listDocuments(
            databaseId,
            COLLECTIONS.categories,
            [Query.orderAsc('name'), Query.limit(100)]
        );
        return response.documents.map(fmt);
    },

    async findActive() {
        const response = await databases.listDocuments(
            databaseId,
            COLLECTIONS.categories,
            [Query.equal('status', 'active'), Query.orderAsc('name'), Query.limit(100)]
        );
        return response.documents.map(fmt);
    },

    async findById(id) {
        try {
            const doc = await databases.getDocument(databaseId, COLLECTIONS.categories, id);
            return fmt(doc);
        } catch (error) {
            return null;
        }
    },

    async create({ name, description, color, image }) {
        const doc = await databases.createDocument(
            databaseId,
            COLLECTIONS.categories,
            ID.unique(),
            {
                name,
                description: description || null,
                color: color || '#f97316',
                image: image || null,
                status: 'active'
            }
        );
        return fmt(doc);
    },

    async updateById(id, updates) {
        const allowed = ['name', 'description', 'color', 'status', 'image'];
        const data = {};
        for (const [key, val] of Object.entries(updates)) {
            if (allowed.includes(key)) {
                data[key] = val;
            }
        }
        if (Object.keys(data).length === 0) return this.findById(id);
        
        const doc = await databases.updateDocument(
            databaseId,
            COLLECTIONS.categories,
            id,
            data
        );
        return fmt(doc);
    },

    async deleteById(id) {
        await databases.deleteDocument(databaseId, COLLECTIONS.categories, id);
    },
};

module.exports = Category;
