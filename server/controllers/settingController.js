const Setting = require('../models/Setting');
const User = require('../models/User');
const { storage, storageBucketId, InputFile, ID } = require('../config/appwrite');
const { invalidateCache } = require('../utils/cache');

// GET /api/settings
const getSettings = async (req, res) => {
    try {
        res.json(await Setting.get());
    } catch (error) {
        res.status(500).json({ message: 'Error fetching settings' });
    }
};

// PUT /api/settings
const updateSettings = async (req, res) => {
    try {
        const settings = await Setting.update(req.body);
        invalidateCache('settings');
        
        const io = req.app.get('io');
        if (io) {
            io.to('restaurant_main').emit('settings-updated', settings);
        }

        res.json(settings);
    } catch (error) {
        const fs = require('fs');
        const errLog = `[${new Date().toISOString()}] UPDATE FAILED
Type: ${error.type || 'NO_TYPE'}
Code: ${error.code || 500}
Message: ${error.message}
Body: ${JSON.stringify(req.body, null, 2)}
Stack: ${error.stack}\n\n`;
        fs.appendFileSync('server_debug.log', errLog);
        
        console.error('updateSettings FULL ERROR:', error);
        res.status(error.code && typeof error.code === 'number' ? error.code : 500).json({ 
            message: error.message || 'Error updating settings',
            details: error.type || 'NO_TYPE'
        });
    }
};

// POST /api/settings/change-password
const changePassword = async (req, res) => {
    try {
        const { userId, role, newPassword } = req.body;
        let targetUser;

        if (role) {
            if (req.role !== 'admin') {
                return res.status(403).json({ message: 'Only Admin can change staff passwords' });
            }
            targetUser = await User.findByRole(role);
        } else {
            const idToUpdate = userId || req.userId;
            targetUser = await User.findById(idToUpdate);
            if (req.role !== 'admin' && String(req.userId) !== String(idToUpdate)) {
                return res.status(403).json({ message: 'Unauthorized' });
            }
        }

        if (!targetUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        await User.updatePassword(targetUser._id, newPassword);
        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ message: 'Error updating password' });
    }
};

// GET /api/settings/qr
const getQrSettings = async (req, res) => {
    try {
        const settings = await Setting.get();
        res.json({
            standardQrUrl:  settings.standardQrUrl  || null,
            secondaryQrUrl: settings.secondaryQrUrl || null,
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching QR settings' });
    }
};

// POST /api/settings/qr
// Body (Multipart/form-data): type, qr (file)
const uploadQr = async (req, res) => {
    try {

        const type = req.body?.type;
        const file = req.file;

        if (!type) {
            return res.status(400).json({
                message: "QR type is required (standard or secondary)"
            });
        }

        if (!['standard', 'secondary'].includes(type)) {
            return res.status(400).json({ message: 'type must be standard or secondary' });
        }

        // Cashier-specific guards
        if (req.role === 'cashier') {
            if (type !== 'secondary') {
                return res.status(403).json({ message: 'Cashiers can only update the Secondary QR' });
            }
            const currentSettings = await Setting.get();
            if (!currentSettings.cashierQrUploadEnabled) {
                return res.status(403).json({ message: 'QR upload has been disabled by admin' });
            }
        }

        if (!file) {
            return res.status(400).json({ message: 'QR image file is required' });
        }
        if (!storageBucketId) {
            return res.status(500).json({ message: 'Storage bucket not configured. Set APPWRITE_STORAGE_BUCKET_ID.' });
        }

        // Delete old file if one exists
        const current = await Setting.get();
        const oldFileId = type === 'standard' ? current.standardQrFileId : current.secondaryQrFileId;
        if (oldFileId) {
            try { await storage.deleteFile(storageBucketId, oldFileId); } catch (_) { /* ignore */ }
        }

        // Upload to Appwrite Storage
        const fileId = ID.unique();
        const uploadName = `${type}_qr_${Date.now()}_${file.originalname}`;
        
        await storage.createFile(
            storageBucketId,
            fileId,
            InputFile.fromBuffer(file.buffer, uploadName, file.mimetype)
        );

        // Build public view URL
        const endpoint = process.env.APPWRITE_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1';
        const projectId = process.env.APPWRITE_PROJECT_ID;
        const url = `${endpoint}/storage/buckets/${storageBucketId}/files/${fileId}/view?project=${projectId}`;

        // Persist in settings
        const settings = await Setting.updateQr({ type, fileId, url });
        invalidateCache('settings');

        // Broadcast update to all clients
        req.app.get('io').to('restaurant_main').emit('settings-updated', settings);

        res.json({
            message: `${type} QR updated successfully`,
            url,
            standardQrUrl:  settings.standardQrUrl,
            secondaryQrUrl: settings.secondaryQrUrl,
        });
    } catch (error) {
        console.error('QR upload error:', error);
        res.status(500).json({ 
            message: "QR upload failed",
            error: error.message 
        });
    }
};

module.exports = { getSettings, updateSettings, changePassword, getQrSettings, uploadQr };
