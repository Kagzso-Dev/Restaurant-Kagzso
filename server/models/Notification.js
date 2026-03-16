const { databases, databaseId, COLLECTIONS, ID, Query } = require('../config/appwrite');

/**
 * Notification model — replaces MongoDB Notification collection.
 */
const fmt = (doc, isRead = false) => doc ? {
    _id:           doc.$id,
    title:         doc.title,
    message:       doc.message,
    type:          doc.type,
    roleTarget:    doc.role_target,
    referenceId:   doc.reference_id,
    referenceType: doc.reference_type,
    isRead:        isRead,
    createdBy:     doc.created_by,
    createdAt:     doc.$createdAt,
} : null;

const Notification = {

    // Check for existing notification of same type+reference (dedup)
    async findExisting(type, referenceId) {
        try {
            const response = await databases.listDocuments(
                databaseId,
                COLLECTIONS.notifications,
                [
                    Query.equal('type', type),
                    Query.equal('reference_id', referenceId),
                    Query.limit(1)
                ]
            );
            return response.documents[0] ? { _id: response.documents[0].$id } : null;
        } catch (error) {
            return null;
        }
    },

    async create({ title, message, type, roleTarget, referenceId, referenceType, createdBy }) {
        const doc = await databases.createDocument(
            databaseId,
            COLLECTIONS.notifications,
            ID.unique(),
            {
                title,
                message,
                type,
                role_target: roleTarget,
                reference_id: referenceId || null,
                reference_type: referenceType || null,
                created_by: createdBy || null
            }
        );
        return fmt(doc);
    },

    // Fetch notifications visible to this role, with per-user read flag
    async findForUser(userRole, userId, { skip = 0, limit = 20, unreadOnly = false } = {}) {
        const queries = [
            Query.or([
                Query.equal('role_target', userRole),
                Query.equal('role_target', 'all')
            ]),
            Query.orderDesc('$createdAt'),
            Query.limit(parseInt(limit)),
            Query.offset(parseInt(skip))
        ];

        const [notifResp, readsResp] = await Promise.all([
            databases.listDocuments(databaseId, COLLECTIONS.notifications, queries),
            databases.listDocuments(databaseId, COLLECTIONS.notification_reads, [
                Query.equal('user_id', userId),
                Query.limit(1000)
            ])
        ]);

        const readNotifIds = new Set(readsResp.documents.map(r => r.notification_id));
        
        let filteredDocs = notifResp.documents;
        if (unreadOnly) {
            filteredDocs = filteredDocs.filter(d => !readNotifIds.has(d.$id));
        }

        return filteredDocs.map(doc => fmt(doc, readNotifIds.has(doc.$id)));
    },

    async countForUser(userRole, userId, unreadOnly = false) {
        // Appwrite limit on listDocuments is usually enough for count
        const queries = [
            Query.or([
                Query.equal('role_target', userRole),
                Query.equal('role_target', 'all')
            ])
        ];
        
        const [notifResp, readsResp] = await Promise.all([
            databases.listDocuments(databaseId, COLLECTIONS.notifications, queries),
            databases.listDocuments(databaseId, COLLECTIONS.notification_reads, [
                Query.equal('user_id', userId),
                Query.limit(1000)
            ])
        ]);

        if (unreadOnly) {
            const readNotifIds = new Set(readsResp.documents.map(r => r.notification_id));
            return notifResp.documents.filter(d => !readNotifIds.has(d.$id)).length;
        }

        return notifResp.total;
    },

    // Mark specific notifications as read for a user
    async markAsRead(notificationIds, userId) {
        if (!notificationIds.length) return;

        // Run all existence-checks + writes in parallel instead of sequentially
        await Promise.allSettled(notificationIds.map(async (notifId) => {
            const existing = await databases.listDocuments(databaseId, COLLECTIONS.notification_reads, [
                Query.equal('notification_id', notifId),
                Query.equal('user_id', userId),
                Query.limit(1)
            ]);
            if (existing.total === 0) {
                await databases.createDocument(databaseId, COLLECTIONS.notification_reads, ID.unique(), {
                    notification_id: notifId,
                    user_id: userId
                });
            }
        }));
    },

    // Mark ALL role-visible notifications as read for a user
    async markAllAsRead(userRole, userId) {
        const notifs = await databases.listDocuments(databaseId, COLLECTIONS.notifications, [
            Query.or([
                Query.equal('role_target', userRole),
                Query.equal('role_target', 'all')
            ]),
            Query.limit(100)
        ]);

        const ids = notifs.documents.map(d => d.$id);
        await this.markAsRead(ids, userId);
    },
};

module.exports = Notification;
