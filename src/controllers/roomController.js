const Room = require('../models/Room');

const ROOM_TYPES = [
  { roomName: 'Silent Sanctuary', roomType: 'Silent Study Room' },
  { roomName: 'Deep Work Marathon', roomType: '2-Hour Deep Focus Room' },
  { roomName: 'Focus Faceoff', roomType: 'Competitive Room' },
  { roomName: 'Exam Sprint', roomType: 'Exam Prep Room' }
];

const ensureDefaultRooms = async () => {
  const count = await Room.countDocuments();
  if (count === 0) {
    await Room.insertMany(ROOM_TYPES);
  }
};

const getRooms = async (req, res, next) => {
  try {
    const rooms = await Room.find().populate('participants', 'name email');
    res.json({ rooms });
  } catch (error) {
    next(error);
  }
};

const createRoom = async (req, res, next) => {
  try {
    const { roomName, roomType } = req.body;
    const room = await Room.create({ roomName, roomType });
    res.status(201).json({ room });
  } catch (error) {
    next(error);
  }
};

const joinRoom = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const room = await Room.findByIdAndUpdate(
      roomId,
      { $addToSet: { participants: req.user._id }, $set: { isActive: true } },
      { new: true }
    ).populate('participants', 'name email');

    if (!room) return res.status(404).json({ message: 'Room not found' });
    res.json({ room });
  } catch (error) {
    next(error);
  }
};

const leaveRoom = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const room = await Room.findByIdAndUpdate(
      roomId,
      { $pull: { participants: req.user._id } },
      { new: true }
    ).populate('participants', 'name email');

    if (!room) return res.status(404).json({ message: 'Room not found' });

    room.isActive = room.participants.length > 0;
    await room.save();

    res.json({ room });
  } catch (error) {
    next(error);
  }
};

module.exports = { ensureDefaultRooms, getRooms, createRoom, joinRoom, leaveRoom };
