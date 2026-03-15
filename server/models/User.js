const { databases, databaseId, COLLECTIONS, ID, Query } = require('../config/appwrite');
const bcrypt = require('bcryptjs');

const fmt = (doc) => doc ? {
    _id:          doc.$id,
    username:     doc.username,
    password:     doc.passwordHash,   // Appwrite field is passwordHash; exposed as password internally for bcrypt compare
    name:         doc.name || null,
    role:         doc.role,
    isVerified:   doc.isVerified ?? false,
    lastLoginAt:  doc.lastLoginAt || null,
    createdAt:    doc.$createdAt,
    updatedAt:    doc.$updatedAt,
} : null;

const User = {
    async findOne({ username }) {
        const response = await databases.listDocuments(
            databaseId,
            COLLECTIONS.users,
            [Query.equal('username', username), Query.limit(1)]
        );
        return fmt(response.documents[0]);
    },

    async findById(id, excludePassword = false) {
        try {
            const doc = await databases.getDocument(databaseId, COLLECTIONS.users, id);
            const formatted = fmt(doc);
            if (excludePassword && formatted) {
                delete formatted.password;
            }
            return formatted;
        } catch (error) {
            return null;
        }
    },

    async findByRole(role) {
        const response = await databases.listDocuments(
            databaseId,
            COLLECTIONS.users,
            [Query.equal('role', role), Query.limit(1)]
        );
        return fmt(response.documents[0]);
    },

    async usernameExists(username) {
        const response = await databases.listDocuments(
            databaseId,
            COLLECTIONS.users,
            [Query.equal('username', username), Query.limit(1)]
        );
        return response.total > 0;
    },

    async create({ username, password, role, name }) {
        const salt   = await bcrypt.genSalt(10);
        const hashed = await bcrypt.hash(password, salt);

        const doc = await databases.createDocument(
            databaseId,
            COLLECTIONS.users,
            ID.unique(),
            {
                username,
                passwordHash: hashed,
                role,
                name:        name || null,
                isVerified:  false,
            }
        );
        return { _id: doc.$id, username, role, name: doc.name || null };
    },

    async updatePassword(id, newPassword) {
        const salt   = await bcrypt.genSalt(10);
        const hashed = await bcrypt.hash(newPassword, salt);
        await databases.updateDocument(
            databaseId,
            COLLECTIONS.users,
            id,
            { passwordHash: hashed }
        );
    },
};

module.exports = User;
