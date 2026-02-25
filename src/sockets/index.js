const Room = require('../models/Room');
const Session = require('../models/Session');
const User = require('../models/User');

const FOCUS_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;

const roomStates = new Map();

const getRoomState = (roomId) => {
  if (!roomStates.has(roomId)) {
    roomStates.set(roomId, {
      phase: 'focus',
      timeLeft: FOCUS_SECONDS,
      isRunning: false,
      cycleCount: 0,
      participants: new Map(),
      lastTickAt: Date.now()
    });
  }
  return roomStates.get(roomId);
};

const toDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const calculateStreak = async (userId) => {
  const sessions = await Session.find({ userId }).sort({ date: -1 }).select('date');
  if (!sessions.length) return 0;

  const uniqueDays = [...new Set(sessions.map((s) => toDateKey(s.date)))];
  let streak = 0;
  let cursor = new Date();

  for (const day of uniqueDays) {
    if (day === toDateKey(cursor)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }

    if (streak === 0) {
      cursor.setDate(cursor.getDate() - 1);
      if (day === toDateKey(cursor)) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
      }
    }
    break;
  }

  return streak;
};

const startTicker = (io) => {
  setInterval(async () => {
    for (const [roomId, state] of roomStates.entries()) {
      if (!state.isRunning) continue;

      state.timeLeft -= 1;
      if (state.timeLeft <= 0) {
        if (state.phase === 'focus') {
          state.cycleCount += 1;
          const users = [...state.participants.keys()];
          await Promise.all(
            users.map(async (userId) => {
              await Session.create({ userId, roomId, focusDuration: 25, date: new Date() });
              const streak = await calculateStreak(userId);
              await User.findByIdAndUpdate(userId, {
                $inc: { totalFocusMinutes: 25 },
                $set: { currentStreak: streak }
              });
            })
          );
          io.to(roomId).emit('timer:sessionCompleted', {
            completedBy: users.length,
            focusMinutes: 25,
            cycleCount: state.cycleCount
          });
          state.phase = 'break';
          state.timeLeft = BREAK_SECONDS;
        } else {
          state.phase = 'focus';
          state.timeLeft = FOCUS_SECONDS;
        }
      }

      io.to(roomId).emit('timer:update', {
        phase: state.phase,
        timeLeft: state.timeLeft,
        isRunning: state.isRunning,
        cycleCount: state.cycleCount
      });
    }
  }, 1000);
};

const setupSocket = (io) => {
  io.on('connection', (socket) => {
    socket.on('room:join', async ({ roomId, user }) => {
      if (!roomId || !user?._id) return;

      socket.join(roomId);
      socket.data.roomId = roomId;
      socket.data.user = user;

      const state = getRoomState(roomId);
      state.participants.set(String(user._id), { name: user.name, socketId: socket.id });

      await Room.findByIdAndUpdate(roomId, {
        $addToSet: { participants: user._id },
        $set: { isActive: true }
      });

      io.to(roomId).emit('room:participants', {
        count: state.participants.size,
        participants: [...state.participants.values()].map((p) => p.name)
      });

      socket.emit('timer:update', {
        phase: state.phase,
        timeLeft: state.timeLeft,
        isRunning: state.isRunning,
        cycleCount: state.cycleCount
      });

      io.to(roomId).emit('room:notification', {
        message: `${user.name} joined the room`
      });
    });

    socket.on('room:leave', async ({ roomId, userId, userName }) => {
      if (!roomId || !userId) return;
      socket.leave(roomId);

      const state = getRoomState(roomId);
      state.participants.delete(String(userId));

      await Room.findByIdAndUpdate(roomId, {
        $pull: { participants: userId },
        $set: { isActive: state.participants.size > 0 }
      });

      io.to(roomId).emit('room:participants', {
        count: state.participants.size,
        participants: [...state.participants.values()].map((p) => p.name)
      });

      io.to(roomId).emit('room:notification', {
        message: `${userName || 'A user'} left the room`
      });
    });

    socket.on('timer:start', ({ roomId }) => {
      const state = getRoomState(roomId);
      state.isRunning = true;
      io.to(roomId).emit('timer:update', state);
    });

    socket.on('timer:pause', ({ roomId }) => {
      const state = getRoomState(roomId);
      state.isRunning = false;
      io.to(roomId).emit('timer:update', state);
    });

    socket.on('timer:reset', ({ roomId }) => {
      const state = getRoomState(roomId);
      state.phase = 'focus';
      state.timeLeft = FOCUS_SECONDS;
      state.isRunning = false;
      io.to(roomId).emit('timer:update', state);
    });

    socket.on('chat:send', ({ roomId, userName, message }) => {
      io.to(roomId).emit('chat:receive', {
        userName,
        message,
        at: new Date().toISOString()
      });
    });

    socket.on('disconnect', async () => {
      const roomId = socket.data.roomId;
      const user = socket.data.user;
      if (!roomId || !user?._id) return;

      const state = getRoomState(roomId);
      state.participants.delete(String(user._id));

      await Room.findByIdAndUpdate(roomId, {
        $pull: { participants: user._id },
        $set: { isActive: state.participants.size > 0 }
      });

      io.to(roomId).emit('room:participants', {
        count: state.participants.size,
        participants: [...state.participants.values()].map((p) => p.name)
      });

      io.to(roomId).emit('room:notification', {
        message: `${user.name} disconnected`
      });
    });
  });

  startTicker(io);
};

module.exports = setupSocket;
