const { Server } = require('socket.io');
const emailRepository = require('../repositories/emailRepository');
const inboxRepository = require('../repositories/inboxRepository');

let io = null;

// Track which socket owns which session/email
const socketSessionMap = new Map(); // socketId -> { sessionId, emailAddress }

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`[WS] Client connected: ${socket.id}`);

    // Client subscribes with email and session
    socket.on('subscribe', (data) => {
      let emailAddress, sessionId;

      // Support both string (old) and object (new) format
      if (typeof data === 'string') {
        emailAddress = data;
      } else if (data && typeof data === 'object') {
        emailAddress = data.email;
        sessionId = data.sessionId;
      }

      if (emailAddress) {
        socket.join(emailAddress.toLowerCase());
        socketSessionMap.set(socket.id, { sessionId, emailAddress });
        console.log(`[WS] ${socket.id} subscribed to: ${emailAddress}`);
      }
    });

    // Client leaves a room
    socket.on('unsubscribe', (emailAddress) => {
      if (emailAddress) {
        const addr = typeof emailAddress === 'string' ? emailAddress : emailAddress.email;
        socket.leave(addr.toLowerCase());
      }
    });

    // Webhook subscription
    socket.on('subscribeWebhook', (endpointId) => {
      if (endpointId) {
        socket.join(`webhook:${endpointId}`);
        console.log(`[WS] ${socket.id} subscribed to webhook: ${endpointId}`);
      }
    });

    socket.on('unsubscribeWebhook', (endpointId) => {
      if (endpointId) {
        socket.leave(`webhook:${endpointId}`);
      }
    });

    // When user closes tab / disconnects — clean up their data
    socket.on('disconnect', async () => {
      console.log(`[WS] Client disconnected: ${socket.id}`);

      const sessionData = socketSessionMap.get(socket.id);
      if (sessionData && sessionData.sessionId) {
        try {
          // Wait 30 seconds before cleanup (in case user refreshes the page)
          setTimeout(async () => {
            // Check if the same session reconnected
            const stillConnected = [...socketSessionMap.values()].some(
              (s) => s.sessionId === sessionData.sessionId
            );

            if (!stillConnected) {
              // No reconnection — clean up DB
              const email = await emailRepository.findBySessionId(sessionData.sessionId);
              if (email) {
                await inboxRepository.deleteByEmail(email.email_address);
                await emailRepository.releaseEmail(sessionData.sessionId);
                console.log(`[WS] Cleaned up data for disconnected session: ${sessionData.emailAddress}`);
              }
            }
          }, 30000); // 30 second grace period
        } catch (err) {
          console.error('[WS] Cleanup error:', err.message);
        }
      }

      socketSessionMap.delete(socket.id);
    });
  });

  return io;
}

// Notify clients when a new email arrives
function notifyNewEmail(emailAddress, message) {
  if (io) {
    io.to(emailAddress.toLowerCase()).emit('newEmail', message);
  }
}

// Notify clients when a webhook request is received
function notifyWebhook(endpointId, requestData) {
  if (io) {
    io.to(`webhook:${endpointId}`).emit('webhookReceived', requestData);
  }
}

function getIO() {
  return io;
}

module.exports = { initSocket, notifyNewEmail, notifyWebhook, getIO };
