const express = require('express');
const router = express.Router();
const {
    createOfferNotification,
    testNotification,
} = require('../controllers/notificationController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All notification routes require authentication
router.use(protect);

// ── Admin-only: offer/announcement/test ─────────────────────────────────────────
router.post('/offer', authorize('admin'), createOfferNotification);
router.post('/test', authorize('admin'), testNotification);

module.exports = router;
