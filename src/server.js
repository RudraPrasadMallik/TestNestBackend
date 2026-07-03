require('dotenv').config();
const http = require('http');
const app = require('./app');
const { startCleanupJob } = require('./jobs/cleanupJob');
const { startSmtpServer } = require('./smtp/smtpServer');
const { initSocket } = require('./websocket/socketManager');
const { connectDb } = require('./config/db');
const initDb = require('./config/initDb');

const PORT = process.env.PORT || 3000;

const start = async () => {
  try {
    await connectDb();
    await initDb();

    // Create HTTP server and attach Socket.io
    const httpServer = http.createServer(app);
    initSocket(httpServer);

    // Start HTTP + WebSocket server
    httpServer.listen(PORT, () => {
      console.log(`[Server] HTTP API + WebSocket running on port ${PORT}`);
    });

    // Start SMTP server to receive emails
    startSmtpServer();

    // Start cleanup job for expired emails
    startCleanupJob();
  } catch (err) {
    console.error('[Server] Failed to start:', err.message || err);
    console.error(err.stack);
    process.exit(1);
  }
};

start();
