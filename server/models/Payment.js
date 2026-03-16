const { databases, databaseId, COLLECTIONS, ID, Query } = require('../config/appwrite');

const fmt = (doc, cashierDoc = null) => doc ? {
    _id:            doc.$id,
    orderId:        doc.order_id,
    paymentMethod:  doc.payment_method,

    amount:         parseFloat(doc.amount),
    amountReceived: parseFloat(doc.amount_received),
    change:         parseFloat(doc.change || 0),
    cashierId:      cashierDoc
        ? { _id: cashierDoc.$id, username: cashierDoc.username, role: cashierDoc.role }
        : doc.cashier_id,
    createdAt:      doc.$createdAt,
    updatedAt:      doc.$updatedAt,
} : null;

const Payment = {
    async findByOrderId(orderId) {
        try {
            const response = await databases.listDocuments(
                databaseId,
                COLLECTIONS.payments,
                [Query.equal('order_id', orderId), Query.limit(1)]
            );
            return fmt(response.documents[0]);
        } catch (error) {
            return null;
        }
    },

    // Returns payment with cashier details populated (for GET payment endpoint)
    async findByOrderIdWithCashier(orderId) {
        try {
            const response = await databases.listDocuments(
                databaseId,
                COLLECTIONS.payments,
                [Query.equal('order_id', orderId), Query.limit(1)]
            );
            const doc = response.documents[0];
            if (!doc) return null;

            let cashierDoc = null;
            if (doc.cashier_id) {
                try {
                    cashierDoc = await databases.getDocument(databaseId, COLLECTIONS.users, doc.cashier_id);
                } catch (e) {}
            }
            return fmt(doc, cashierDoc);
        } catch (error) {
            return null;
        }
    },

    async create({ orderId, paymentMethod, amount, amountReceived, change, cashierId }) {
        try {
            const doc = await databases.createDocument(
                databaseId,
                COLLECTIONS.payments,
                ID.unique(),
                {
                    order_id: orderId,
                    payment_method: paymentMethod,

                    amount: parseFloat(amount),
                    amount_received: parseFloat(amountReceived || 0),
                    change: parseFloat(change || 0),
                    cashier_id: cashierId || null,
                }
            );
            return fmt(doc);
        } catch (error) {
            console.error('Payment creation failed:', error);
            throw error;
        }
    },
};

module.exports = Payment;
