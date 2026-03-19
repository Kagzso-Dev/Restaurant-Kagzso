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
    enforceMenuView:    doc.enforce_menu_view === true,
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
                        waiter_service_enabled: true,
                        enforce_menu_view: false
                    }
                );
                return fmt(newDoc);
            }
            // Self-repair: If attribute is missing in Appwrite schema, try to create it
            if (error.code === 400 && (error.message?.includes('Unknown attribute') || error.message?.includes('invalid document structure'))) {
                console.warn('[Setting] Schema mismatch detected. Attempting to fix attributes...');
                try {
                    await databases.createStringAttribute(databaseId, COLLECTIONS.settings, 'menu_view', 50, false, 'grid');
                    await databases.createStringAttribute(databaseId, COLLECTIONS.settings, 'dashboard_view', 50, false, 'all');
                    await databases.createStringAttribute(databaseId, COLLECTIONS.settings, 'pending_color', 10, false, '#3b82f6');
                    await databases.createStringAttribute(databaseId, COLLECTIONS.settings, 'accepted_color', 10, false, '#8b5cf6');
                    await databases.createStringAttribute(databaseId, COLLECTIONS.settings, 'preparing_color', 10, false, '#f59e0b');
                    await databases.createStringAttribute(databaseId, COLLECTIONS.settings, 'ready_color', 10, false, '#10b981');
                    // Wait for attributes to be ready (Appwrite indexer)
                    await new Promise(r => setTimeout(r, 2000));
                    return this.get(); // Retry
                } catch (schemaErr) {
                    console.error('[Setting] Schema auto-repair failed:', schemaErr.message);
                }
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

    async update(params) {
        console.log('[Setting] Update raw input keys:', Object.keys(params).join(', '));
        console.log('[Setting] Update raw input types:', Object.entries(params).map(([k,v]) => `${k}: ${typeof v}`).join(', '));
        const { restaurantName, address, currency, currencySymbol, taxRate, gstNumber, pendingColor, acceptedColor, preparingColor, readyColor, dashboardView, menuView, dineInEnabled, tableMapEnabled, takeawayEnabled, waiterServiceEnabled, enforceMenuView } = params;
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
        if (dashboardView)  data.dashboard_view  = String(dashboardView);
        if (menuView)       data.menu_view       = String(menuView);
        if (dineInEnabled  !== undefined) data.dine_in_enabled = (dineInEnabled === true || dineInEnabled === 'true');
        if (tableMapEnabled !== undefined) data.table_map_enabled = (tableMapEnabled === true || tableMapEnabled === 'true');
        if (takeawayEnabled !== undefined) data.takeaway_enabled = (takeawayEnabled === true || takeawayEnabled === 'true');
        if (waiterServiceEnabled !== undefined) data.waiter_service_enabled = (waiterServiceEnabled === true || waiterServiceEnabled === 'true');
        if (enforceMenuView !== undefined) data.enforce_menu_view = (enforceMenuView === true || enforceMenuView === 'true');

        if (Object.keys(data).length === 0) return this.get();

        console.log('[Setting] Updating Appwrite with:', JSON.stringify(data, null, 2));
        try {
            const updated = await databases.updateDocument(
                databaseId,
                COLLECTIONS.settings,
                SETTINGS_DOC_ID,
                data
            );
            console.log('[Setting] Success! Appwrite Return Doc:', JSON.stringify(updated, null, 2));
            const fs = require('fs');
            fs.appendFileSync('server_debug.log', `[UPDATE SUCCESS] ${new Date().toISOString()}: ${JSON.stringify(updated, null, 2)}\n`);
            return fmt(updated);
        } catch (error) {
            // Self-repair: If attribute is missing or structure is invalid, try to create all possible missing fields
            if (error.code === 400) {
                console.warn('[Setting] Schema mismatch detected during update. Attempting full repair...');
                try {
                    const existingAttrs = await databases.listAttributes(databaseId, COLLECTIONS.settings);
                    const attrNames = existingAttrs.attributes.map(a => a.key);

                    const repairSpec = [
                        { key: 'restaurant_name', fn: () => databases.createStringAttribute(databaseId, COLLECTIONS.settings, 'restaurant_name', 100, false, 'KAGSZO') },
                        { key: 'address', fn: () => databases.createStringAttribute(databaseId, COLLECTIONS.settings, 'address', 255, false, '') },
                        { key: 'currency', fn: () => databases.createStringAttribute(databaseId, COLLECTIONS.settings, 'currency', 10, false, 'INR') },
                        { key: 'currency_symbol', fn: () => databases.createStringAttribute(databaseId, COLLECTIONS.settings, 'currency_symbol', 10, false, '₹') },
                        { key: 'tax_rate', fn: () => databases.createFloatAttribute(databaseId, COLLECTIONS.settings, 'tax_rate', false, 5) },
                        { key: 'gst_number', fn: () => databases.createStringAttribute(databaseId, COLLECTIONS.settings, 'gst_number', 50, false, '') },
                        { key: 'menu_view', fn: () => databases.createStringAttribute(databaseId, COLLECTIONS.settings, 'menu_view', 50, false, 'grid') },
                        { key: 'dashboard_view', fn: () => databases.createStringAttribute(databaseId, COLLECTIONS.settings, 'dashboard_view', 50, false, 'all') },
                        { key: 'pending_color', fn: () => databases.createStringAttribute(databaseId, COLLECTIONS.settings, 'pending_color', 10, false, '#3b82f6') },
                        { key: 'accepted_color', fn: () => databases.createStringAttribute(databaseId, COLLECTIONS.settings, 'accepted_color', 10, false, '#8b5cf6') },
                        { key: 'preparing_color', fn: () => databases.createStringAttribute(databaseId, COLLECTIONS.settings, 'preparing_color', 10, false, '#f59e0b') },
                        { key: 'ready_color', fn: () => databases.createStringAttribute(databaseId, COLLECTIONS.settings, 'ready_color', 10, false, '#10b981') },
                        { key: 'dine_in_enabled', fn: () => databases.createBooleanAttribute(databaseId, COLLECTIONS.settings, 'dine_in_enabled', false, true) },
                        { key: 'table_map_enabled', fn: () => databases.createBooleanAttribute(databaseId, COLLECTIONS.settings, 'table_map_enabled', false, true) },
                        { key: 'takeaway_enabled', fn: () => databases.createBooleanAttribute(databaseId, COLLECTIONS.settings, 'takeaway_enabled', false, true) },
                        { key: 'waiter_service_enabled', fn: () => databases.createBooleanAttribute(databaseId, COLLECTIONS.settings, 'waiter_service_enabled', false, true) },
                        { key: 'enforce_menu_view', fn: () => databases.createBooleanAttribute(databaseId, COLLECTIONS.settings, 'enforce_menu_view', false, false) },
                    ];

                    const toCreate = repairSpec.filter(s => !attrNames.includes(s.key));
                    
                    if (toCreate.length > 0) {
                        console.warn(`[Setting] Creating ${toCreate.length} missing attributes: ${toCreate.map(s => s.key).join(', ')}`);
                        const results = await Promise.allSettled(toCreate.map(s => s.fn()));
                        const fs = require('fs');
                        results.forEach((r, idx) => {
                            if (r.status === 'rejected') {
                                const logMsg = `[REPAIR FAILED] ATTR [${toCreate[idx].key}] @ ${new Date().toISOString()}: ${r.reason.message}\n`;
                                fs.appendFileSync('server_debug.log', logMsg);
                            }
                        });
                        console.log('[Setting] Schema repair tasks dispatched. Waiting for indexer...');
                        await new Promise(r => setTimeout(r, 3500));
                        return this.update(params); // Retry with original params
                    }
                } catch (e) {
                    console.error('[Setting] Full schema repair failed:', e.message);
                }
            }
            console.error('[Setting] Appwrite Update Error:', {
                message: error.message,
                code: error.code,
                type: error.type,
                dataRequested: JSON.stringify(data, null, 2)
            });
            throw error;
        }
    },
};

module.exports = Setting;
