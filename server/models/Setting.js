const { databases, databaseId, COLLECTIONS, ID, Query } = require('../config/appwrite');

const SETTINGS_DOC_ID = 'global_settings';

const fmt = (doc) => doc ? {
    _id:               doc.$id,
    restaurantName:    doc.restaurant_name,
    address:           doc.address || '',
    currency:          doc.currency,
    currencySymbol:    doc.currency_symbol,
    taxRate:           parseFloat(doc.tax_rate),
    gstNumber:         doc.gst_number,
    standardQrUrl:     doc.standard_qr_url    || null,
    secondaryQrUrl:    doc.secondary_qr_url   || null,
    standardQrFileId:  doc.standard_qr_file_id  || null,
    secondaryQrFileId: doc.secondary_qr_file_id || null,
    createdAt:         doc.$createdAt,
    updatedAt:         doc.$updatedAt,
} : null;

const Setting = {
    // Get settings row, auto-creating defaults if none exist
    async get() {
        try {
            const doc = await databases.getDocument(databaseId, COLLECTIONS.settings, SETTINGS_DOC_ID);
            return fmt(doc);
        } catch (error) {
            if (error.code === 404 || error.message?.includes('not found')) {
                // Auto-initialize defaults
                const newDoc = await databases.createDocument(
                    databaseId,
                    COLLECTIONS.settings,
                    SETTINGS_DOC_ID,
                    {
                        restaurant_name: 'My Restaurant',
                        address: '123 Restaurant St, City',
                        currency: 'INR',
                        currency_symbol: '₹',
                        tax_rate: 5.00,
                        gst_number: ''
                    }
                );
                return fmt(newDoc);
            }
            throw error;
        }
    },

    async updateQr({ type, fileId, url }) {
        await this.get(); // ensures row exists
        const data = {};
        if (type === 'standard') {
            data.standard_qr_file_id = fileId;
            data.standard_qr_url     = url;
        } else {
            data.secondary_qr_file_id = fileId;
            data.secondary_qr_url     = url;
        }
        const updated = await databases.updateDocument(
            databaseId, COLLECTIONS.settings, SETTINGS_DOC_ID, data
        );
        return fmt(updated);
    },

    async update({ restaurantName, address, currency, currencySymbol, taxRate, gstNumber }) {
        await this.get(); // ensures row exists
        
        const data = {};
        if (restaurantName  !== undefined) data.restaurant_name = restaurantName;
        if (address         !== undefined) data.address = address;
        if (currency        !== undefined) data.currency = currency;
        if (currencySymbol  !== undefined) data.currency_symbol = currencySymbol;
        if (taxRate         !== undefined) data.tax_rate = parseFloat(taxRate);
        if (gstNumber       !== undefined) data.gst_number = gstNumber;

        if (Object.keys(data).length === 0) return this.get();

        const updated = await databases.updateDocument(
            databaseId,
            COLLECTIONS.settings,
            SETTINGS_DOC_ID,
            data
        );
        return fmt(updated);
    },
};

module.exports = Setting;
