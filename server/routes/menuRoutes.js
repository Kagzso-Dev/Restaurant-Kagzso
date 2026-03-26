const express = require('express');
const router = express.Router();
const { getMenuItems, updateMenuItem, deleteMenuItem, createMenuItem } = require('../controllers/menuController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { cacheMiddleware } = require('../utils/cache');

router.use(protect);

router.route('/')
    .get(cacheMiddleware(60, 'menu'), getMenuItems)
    .post(authorize('admin'), createMenuItem);

router.route('/:id')
    .put(authorize('admin', 'kitchen'), updateMenuItem)
    .delete(authorize('admin'), deleteMenuItem);

module.exports = router;
