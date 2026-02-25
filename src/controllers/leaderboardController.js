const Session = require('../models/Session');

const getRangeStart = (range) => {
  const now = new Date();
  const start = new Date(now);
  if (range === 'daily') {
    start.setHours(0, 0, 0, 0);
    return start;
  }
  if (range === 'weekly') {
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return start;
  }
  start.setDate(now.getDate() - 29);
  start.setHours(0, 0, 0, 0);
  return start;
};

const getLeaderboard = async (req, res, next) => {
  try {
    const range = req.params.range;
    const allowed = ['daily', 'weekly', 'monthly'];
    if (!allowed.includes(range)) {
      return res.status(400).json({ message: 'Invalid range' });
    }

    const start = getRangeStart(range);

    const leaderboard = await Session.aggregate([
      { $match: { date: { $gte: start } } },
      { $group: { _id: '$userId', totalFocusMinutes: { $sum: '$focusDuration' } } },
      { $sort: { totalFocusMinutes: -1 } },
      { $limit: 20 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: 0,
          userId: '$user._id',
          name: '$user.name',
          streak: '$user.currentStreak',
          totalFocusMinutes: 1
        }
      }
    ]);

    const withRank = leaderboard.map((entry, index) => ({
      rank: index + 1,
      ...entry,
      focusHours: (entry.totalFocusMinutes / 60).toFixed(1)
    }));

    res.json({ range, leaderboard: withRank });
  } catch (error) {
    next(error);
  }
};

module.exports = { getLeaderboard };
