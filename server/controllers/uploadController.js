const { ID } = require('../config/appwrite');
const path = require('path');
const fs = require('fs');

// POST /api/upload/image
// Uploads an image file locally to the public/images folder and returns the relative view URL.
const uploadImage = async (req, res) => {
    try {
        const file = req.file;

        if (!file) {
            return res.status(400).json({ message: 'Image file is required' });
        }

        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
        if (!allowedTypes.includes(file.mimetype)) {
            return res.status(400).json({ message: 'Only image files are allowed (jpeg, png, webp, gif, avif)' });
        }

        const ext = path.extname(file.originalname) || '.png';
        const uploadName = `img_${Date.now()}_${ID.unique()}${ext}`;

        // Define local paths based on the requested file structure
        const publicImagesPath = path.join(__dirname, '../../client/public/images');
        const distImagesPath = path.join(__dirname, '../../client/dist/images');

        // Ensure public directory exists
        if (!fs.existsSync(publicImagesPath)) {
            fs.mkdirSync(publicImagesPath, { recursive: true });
        }

        // Write the file to the source public folder so it persists across builds
        const publicPath = path.join(publicImagesPath, uploadName);
        fs.writeFileSync(publicPath, file.buffer);

        // Write to dist/images if the build folder exists, so it's served immediately in production mode
        const distExists = fs.existsSync(path.join(__dirname, '../../client/dist'));
        if (distExists) {
            if (!fs.existsSync(distImagesPath)) {
                fs.mkdirSync(distImagesPath, { recursive: true });
            }
            fs.writeFileSync(path.join(distImagesPath, uploadName), file.buffer);
        }

        // Return the local relative URL referencing the file
        const url = `/images/${uploadName}`;

        res.json({ url, fileId: uploadName });
    } catch (error) {
        console.error('Local image upload error:', error);
        res.status(500).json({ message: 'Image upload failed locally', error: error.message });
    }
};

module.exports = { uploadImage };
