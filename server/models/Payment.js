const { databases, databaseId, COLLECTIONS, ID, Query } = require('../config/appwrite');

const fmt = (doc, cashierDoc = null) => doc ? {
    _id:            doc.$id,
    orderId:        doc.order_id,
    paymentMethod:  doc.payment_method,

    amount:         parseFloat(doc.amount),
    amountReceived: parseFloat(doc.amount_received),
    change:         parseFloat(doc.change || 0),
    discount:       parseFloat(doc.discount || 0),
    discountLabel:  doc.discount_label || '',
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

    async create({ orderId, paymentMethod, amount, amountReceived, changeAmount, cashierId, discount, discountLabel }) {
        const data = {
            order_id: orderId,
            payment_method: paymentMethod,
            amount: parseFloat(amount),
            amount_received: parseFloat(amountReceived || 0),
            change: parseFloat(changeAmount || 0),
            discount: parseFloat(discount || 0),
            discount_label: discountLabel || null,
            cashier_id: cashierId || null,
        };
        try {
            const doc = await databases.createDocument(
                databaseId,
                COLLECTIONS.payments,
                ID.unique(),
                data
            );
            return fmt(doc);
        } catch (error) {
            // Self-repair: If attribute is missing, try to create it
            if (error.code === 400 && (error.message?.includes('Unknown attribute') || error.message?.includes('invalid document structure'))) {
                console.warn('[Payment] Schema mismatch detected during create. Attempting repair...');
                try {
                    const existingAttrs = await databases.listAttributes(databaseId, COLLECTIONS.payments);
                    const attrNames = existingAttrs.attributes.map(a => a.key);

                    if (!attrNames.includes('discount')) {
                        await databases.createFloatAttribute(databaseId, COLLECTIONS.payments, 'discount', false, 0);
                    }
                    if (!attrNames.includes('discount_label')) {
                        await databases.createStringAttribute(databaseId, COLLECTIONS.payments, 'discount_label', 100, false, '');
                    }
                    
                    console.log('[Payment] Schema repair tasks dispatched. Waiting for indexer...');
                    await new Promise(r => setTimeout(r, 2000));
                    return this.create({ orderId, paymentMethod, amount, amountReceived, changeAmount, cashierId, discount, discountLabel });
                } catch (schemaErr) {
                    console.error('[Payment] Schema auto-repair failed:', schemaErr.message);
                }
            }
            console.error('Payment creation failed:', error);
            throw error;
        }
    },
};

module.exports = Payment;
