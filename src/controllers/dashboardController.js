const Session = require('../models/Session');
const Room = require('../models/Room');
const User = require('../models/User');

const startOfDay = (date = new Date()) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const getUserDashboard = async (req, res, next) => {
  try {
    const now = new Date();
    const todayStart = startOfDay(now);
    const weekStart = new Date(todayStart);
    weekStart.setDate(todayStart.getDate() - 6);

    const [today, weekly, totalSessions] = await Promise.all([
      Session.aggregate([
        { $match: { userId: req.user._id, date: { $gte: todayStart } } },
        { $group: { _id: null, total: { $sum: '$focusDuration' } } }
      ]),
      Session.aggregate([
        { $match: { userId: req.user._id, date: { $gte: weekStart } } },
        {
          $group: {
            _id: {
              year: { $year: '$date' },
              month: { $month: '$date' },
              day: { $dayOfMonth: '$date' }
            },
            total: { $sum: '$focusDuration' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ]),
      Session.countDocuments({ userId: req.user._id })
    ]);

    const dailyFocusMinutes = today[0]?.total || 0;

    res.json({
      user: req.user,
      dailyFocusMinutes,
      weeklyFocus: weekly,
      totalSessions
    });
  } catch (error) {
    next(error);
  }
};

const getAdminDashboard = async (req, res, next) => {
  try {
    const dayStart = startOfDay();

    const [totalUsers, activeRooms, dailyActiveUsers, focusTotal] = await Promise.all([
      User.countDocuments(),
      Room.countDocuments({ isActive: true }),
      Session.distinct('userId', { date: { $gte: dayStart } }).then((ids) => ids.length),
      Session.aggregate([{ $group: { _id: null, total: { $sum: '$focusDuration' } } }])
    ]);

    res.json({
      totalUsers,
      activeRooms,
      dailyActiveUsers,
      totalFocusHours: ((focusTotal[0]?.total || 0) / 60).toFixed(1)
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getUserDashboard, getAdminDashboard };
