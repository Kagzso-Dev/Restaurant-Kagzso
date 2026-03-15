const express = require('express');
const router = express.Router();
const { getSettings, updateSettings, changePassword, getQrSettings, uploadQr } = require('../controllers/settingController');
const { protect, authorize } = require('../middleware/authMiddleware');

const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Public route to get restaurant info (name, currency) before login
router.get('/', getSettings);

router.use(protect);

router.put('/', authorize('admin'), updateSettings);
router.post('/change-password', authorize('admin'), changePassword);
router.get('/qr', getQrSettings);
router.post('/qr', authorize('admin'), upload.single('qr'), uploadQr);

module.exports = router;
