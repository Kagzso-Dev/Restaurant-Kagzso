const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect, authorize } = require('../middleware/authMiddleware');
const { uploadImage } = require('../controllers/uploadController');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
});

router.use(protect);

// POST /api/upload/image — Admin only
router.post('/image', authorize('admin'), upload.single('image'), uploadImage);

module.exports = router;
