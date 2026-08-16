const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const bus = require('./eventBus');

/**
 * Create and attach a socket.io server to an existing http.Server-like app.
 *
 * Room model:
 *   - owner:<id>     — events scoped to a specific owner
 *   - agent:<id>     — events scoped to a specific agent
 *   - role:admin     — events for all admin users
 *
 * Event types forwarded to clients:
 *   - alert:new           { alert, parcelId, ownerId }
 *   - visit:status        { visit, ownerId, agentId }
 *   - notification:new    { notification, ownerId, agentId }
 */
function createWebSocketServer(server) {
  const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  // Auth middleware — verify JWT from the handshake auth payload
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Missing auth token'));
    }
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = payload; // { id, role }
      next();
    } catch (err) {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const { id, role } = socket.user;

    // Join role-based and user-based rooms
    socket.join(`role:${role}`);
    if (role === 'owner') socket.join(`owner:${id}`);
    if (role === 'agent') socket.join(`agent:${id}`);

    socket.emit('connected', { userId: id, role });

    socket.on('disconnect', () => {
      // Rooms are cleaned up automatically by socket.io
    });
  });

  // ----- Bridge event bus → socket.io rooms -----

  bus.on('alert:new', ({ alert, parcelId, ownerId }) => {
    io.to(`owner:${ownerId}`).emit('alert:new', { alert, parcelId });
    io.to('role:admin').emit('alert:new', { alert, parcelId });
  });

  bus.on('visit:status', ({ visit, ownerId, agentId }) => {
    if (ownerId) io.to(`owner:${ownerId}`).emit('visit:status', { visit });
    if (agentId) io.to(`agent:${agentId}`).emit('visit:status', { visit });
    io.to('role:admin').emit('visit:status', { visit });
  });

  bus.on('notification:new', ({ notification, ownerId, agentId }) => {
    if (ownerId) io.to(`owner:${ownerId}`).emit('notification:new', { notification });
    if (agentId) io.to(`agent:${agentId}`).emit('notification:new', { notification });
  });

  return io;
}

module.exports = { createWebSocketServer };
