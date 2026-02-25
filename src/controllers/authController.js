const jwt = require('jsonwebtoken');
const User = require('../models/User');

const signToken = (id, role) => jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '7d' });

const register = async (req, res, next) => {
  try {
    const { name, email, password, dailyGoalHours } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    const user = await User.create({ name, email, password, dailyGoalHours });
    const token = signToken(user._id, user.role);

    return res.status(201).json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        dailyGoalHours: user.dailyGoalHours,
        totalFocusMinutes: user.totalFocusMinutes,
        currentStreak: user.currentStreak
      }
    });
  } catch (error) {
    return next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = signToken(user._id, user.role);
    return res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        dailyGoalHours: user.dailyGoalHours,
        totalFocusMinutes: user.totalFocusMinutes,
        currentStreak: user.currentStreak
      }
    });
  } catch (error) {
    return next(error);
  }
};

const me = async (req, res) => {
  res.json({ user: req.user });
};

module.exports = { register, login, me };
