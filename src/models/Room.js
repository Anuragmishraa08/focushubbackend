const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    roomName: { type: String, required: true, unique: true },
    roomType: {
      type: String,
      required: true,
      enum: [
        'Silent Study Room',
        '2-Hour Deep Focus Room',
        'Competitive Room',
        'Exam Prep Room'
      ]
    },
    isActive: { type: Boolean, default: true },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  },
  { timestamps: true }
);

module.exports = mongoose.model('Room', roomSchema);
