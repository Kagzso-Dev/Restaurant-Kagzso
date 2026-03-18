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
    pendingColor:      doc.pending_color    || '#3b82f6', // blue-500
    acceptedColor:     doc.accepted_color   || '#8b5cf6', // violet-500
    preparingColor:    doc.preparing_color  || '#f59e0b', // amber-500
    readyColor:        doc.ready_color      || '#10b981', // emerald-500
    dashboardView:     doc.dashboard_view   || 'all', // one, two, all
    menuView:          doc.menu_view        || 'grid', // grid, compact, list
    dineInEnabled:     doc.dine_in_enabled !== false, 
    tableMapEnabled:    doc.table_map_enabled !== false,
    takeawayEnabled:    doc.takeaway_enabled !== false,
    waiterServiceEnabled: doc.waiter_service_enabled !== false,
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
                        gst_number: '',
                        pending_color: '#3b82f6',
                        accepted_color: '#8b5cf6',
                        preparing_color: '#f59e0b',
                        ready_color: '#10b981',
                        dashboard_view: 'all',
                        menu_view: 'grid',
                        dine_in_enabled: true,
                        table_map_enabled: true,
                        takeaway_enabled: true,
                        waiter_service_enabled: true
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

    async update({ restaurantName, address, currency, currencySymbol, taxRate, gstNumber, pendingColor, acceptedColor, preparingColor, readyColor, dashboardView, dineInEnabled, tableMapEnabled, takeawayEnabled, waiterServiceEnabled }) {
        console.log('[Setting] Update raw input:', { restaurantName, taxRate, pendingColor });
        await this.get(); // ensures row exists

        const data = {};
        if (restaurantName  !== undefined) data.restaurant_name = restaurantName;
        if (address         !== undefined) data.address = address;
        if (currency        !== undefined) data.currency = currency;
        if (currencySymbol  !== undefined) data.currency_symbol = currencySymbol;
        
        if (taxRate         !== undefined) {
            const val = parseFloat(taxRate);
            if (!isNaN(val)) data.tax_rate = val;
        }

        if (gstNumber       !== undefined) data.gst_number = gstNumber;
        if (pendingColor)   data.pending_color   = pendingColor;
        if (acceptedColor)  data.accepted_color  = acceptedColor;
        if (preparingColor) data.preparing_color = preparingColor;
        if (readyColor)     data.ready_color     = readyColor;
        if (dashboardView)  data.dashboard_view  = dashboardView;
        if (menuView)       data.menu_view       = menuView;
        if (dineInEnabled  !== undefined) data.dine_in_enabled = dineInEnabled;
        if (tableMapEnabled !== undefined) data.table_map_enabled = tableMapEnabled;
        if (takeawayEnabled !== undefined) data.takeaway_enabled = takeawayEnabled;
        if (waiterServiceEnabled !== undefined) data.waiter_service_enabled = waiterServiceEnabled;

        if (Object.keys(data).length === 0) return this.get();

        console.log('[Setting] Updating Appwrite with:', data);
        try {
            const updated = await databases.updateDocument(
                databaseId,
                COLLECTIONS.settings,
                SETTINGS_DOC_ID,
                data
            );
            return fmt(updated);
        } catch (error) {
            console.error('[Setting] Appwrite Update Error:', {
                message: error.message,
                code: error.code,
                dataRequested: data
            });
            throw error;
        }
    },
};

module.exports = Setting;
