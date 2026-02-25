const express = require('express');
const { getUserDashboard, getAdminDashboard } = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/role');

const router = express.Router();

router.get('/user', protect, getUserDashboard);
router.get('/admin', protect, authorizeRoles('admin'), getAdminDashboard);

module.exports = router;
