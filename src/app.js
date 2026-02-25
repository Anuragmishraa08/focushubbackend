const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const authRoutes = require('./routes/authRoutes');
const roomRoutes = require('./routes/roomRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const leaderboardRoutes = require('./routes/leaderboardRoutes');
const { notFound, errorHandler } = require('./middleware/error');
const { expressCorsOptions } = require('./utils/cors');

const app = express();

app.use(cors(expressCorsOptions));
app.options(/.*/, cors(expressCorsOptions));
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
