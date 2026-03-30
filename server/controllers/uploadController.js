const { storage, storageBucketId, InputFile, ID } = require('../config/appwrite');

// POST /api/upload/image
// Uploads an image file to Appwrite Storage and returns the public view URL.
// The caller saves this URL into the existing `image` field — no schema change.
const uploadImage = async (req, res) => {
    try {
        const file = req.file;

        if (!file) {
            return res.status(400).json({ message: 'Image file is required' });
        }

        if (!storageBucketId) {
            return res.status(500).json({ message: 'Storage bucket not configured. Set APPWRITE_STORAGE_BUCKET_ID.' });
        }

        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
        if (!allowedTypes.includes(file.mimetype)) {
            return res.status(400).json({ message: 'Only image files are allowed (jpeg, png, webp, gif, avif)' });
        }

        const fileId = ID.unique();
        const uploadName = `img_${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

        await storage.createFile(
            storageBucketId,
            fileId,
            InputFile.fromBuffer(file.buffer, uploadName, file.mimetype)
        );

        const endpoint = process.env.APPWRITE_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1';
        const projectId = process.env.APPWRITE_PROJECT_ID;
        const url = `${endpoint}/storage/buckets/${storageBucketId}/files/${fileId}/view?project=${projectId}`;

        res.json({ url, fileId });
    } catch (error) {
        console.error('Image upload error:', error);
        res.status(500).json({ message: 'Image upload failed', error: error.message });
    }
};

module.exports = { uploadImage };
