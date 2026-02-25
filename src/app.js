const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const authRoutes = require('./routes/authRoutes');
const roomRoutes = require('./routes/roomRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const leaderboardRoutes = require('./routes/leaderboardRoutes');
const { notFound, errorHandler } = require('./middleware/error');

const app = express();

const normalizeOrigin = (value = '') => value.trim().replace(/\/+$/, '');

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map(normalizeOrigin)
  .filter(Boolean);

const allowVercelPreview = process.env.ALLOW_VERCEL_PREVIEW !== 'false';
const vercelPattern = /^https:\/\/([a-zA-Z0-9-]+\.)*vercel\.app$/;

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const normalized = normalizeOrigin(origin);
      if (allowedOrigins.includes(normalized) || (allowVercelPreview && vercelPattern.test(normalized))) {
        return callback(null, true);
      }
      return callback(null, false);
    }
  })
);
app.options('*', cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
