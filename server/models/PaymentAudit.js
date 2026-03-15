const { databases, databaseId, COLLECTIONS, ID } = require('../config/appwrite');

/**
 * PaymentAudit — append-only audit trail for all payment lifecycle events.
 */
const PaymentAudit = {
    async create({
        orderId,
        paymentId,
        action,
        status,
        amount,
        paymentMethod,
        transactionId,
        performedBy,
        performedByRole,
        ipAddress,
        userAgent,
        errorMessage,
        errorCode,
        metadata,
    }) {
        try {
            await databases.createDocument(
                databaseId,
                COLLECTIONS.payment_audits,
                ID.unique(),
                {
                    order_id: orderId || null,
                    payment_id: paymentId || null,
                    action,
                    status,
                    amount: amount ? parseFloat(amount) : null,
                    payment_method: paymentMethod || null,
                    transaction_id: transactionId || null,
                    performed_by: performedBy || null,
                    performed_by_role: performedByRole || null,
                    ip_address: ipAddress || null,
                    user_agent: userAgent || null,
                    error_message: errorMessage || null,
                    error_code: errorCode || null,
                    metadata: metadata ? JSON.stringify(metadata) : null,
                }
            );
        } catch (error) {
            console.error('PaymentAudit creation failed:', error);
            // We usually don't want to throw here to avoid breaking the main payment flow
        }
    },
};

module.exports = PaymentAudit;
