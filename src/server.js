require('dotenv').config();

const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const connectDB = require('./config/db');
const setupSocket = require('./sockets');
const { ensureDefaultRooms } = require('./controllers/roomController');
const { socketCorsOptions } = require('./utils/cors');

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    await connectDB();
    await ensureDefaultRooms();

    const server = http.createServer(app);
    const io = new Server(server, {
      cors: socketCorsOptions
    });

    setupSocket(io);

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

start();
