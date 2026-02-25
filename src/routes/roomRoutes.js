const express = require('express');
const {
  getRooms,
  createRoom,
  joinRoom,
  leaveRoom
} = require('../controllers/roomController');
const { protect } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/role');

const router = express.Router();

router.get('/', protect, getRooms);
router.post('/', protect, authorizeRoles('admin'), createRoom);
router.post('/:roomId/join', protect, joinRoom);
router.post('/:roomId/leave', protect, leaveRoom);

module.exports = router;
