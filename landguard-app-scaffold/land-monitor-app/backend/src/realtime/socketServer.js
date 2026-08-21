const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const bus = require('./eventBus');

/**
 * Create and attach a socket.io server to an existing http.Server-like app.
 *
 * Room model:
 *   - owner:<id>          — events scoped to a specific owner
 *   - agent:<id>          — events scoped to a specific agent
 *   - role:admin          — events for all admin users
 *   - org:<orgId>         — events for all assembly users in an organization
 *
 * Event types forwarded to clients:
 *   - alert:new                    { alert, parcelId, ownerId }
 *   - visit:status                 { visit, ownerId, agentId }
 *   - notification:new             { notification, ownerId, agentId }
 *   - building_change:detected     { orgId, newBuildingsCount, buildings, ... }
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
      socket.user = payload; // { id, role, organizationId, assemblyRole }
      next();
    } catch (err) {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const { id, role, organizationId } = socket.user;

    // Join role-based and user-based rooms
    socket.join(`role:${role}`);
    if (role === 'owner') socket.join(`owner:${id}`);
    if (role === 'agent') socket.join(`agent:${id}`);
    // Assembly users join their organization room for org-scoped events
    if (role === 'assembly' && organizationId) {
      socket.join(`org:${organizationId}`);
    }

    socket.emit('connected', { userId: id, role, organizationId });

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

  // Building change detection — push to all assembly users in the org
  bus.on('building_change:detected', ({ orgId, newBuildingsCount, newBuiltupAreaSqm, buildings, beforeTileUrl, afterTileUrl, changeTileUrl, detectionId }) => {
    io.to(`org:${orgId}`).emit('building_change:detected', {
      orgId,
      detectionId,
      newBuildingsCount,
      newBuiltupAreaSqm,
      buildings: (buildings || []).slice(0, 50), // cap payload size
      beforeTileUrl,
      afterTileUrl,
      changeTileUrl,
      timestamp: new Date().toISOString(),
    });
  });

  // Environmental hazard detection — push to all assembly users in the org
  bus.on('hazard:detected', ({ orgId, totalHazards, hazardsByType, tileUrl, bbox, timestamp }) => {
    io.to(`org:${orgId}`).emit('hazard:detected', {
      orgId,
      totalHazards,
      hazardsByType,
      tileUrl,
      bbox,
      timestamp: timestamp || new Date().toISOString(),
    });
  });

  // ── Marketplace events ──
  // New listing created → notify planners
  bus.on('listing:created', ({ orgId, listingId, title, sellerName }) => {
    io.to(`org:${orgId}`).emit('listing:created', { listingId, title, sellerName, timestamp: new Date().toISOString() });
  });

  // Listing confirmed/rejected → notify seller
  bus.on('listing:confirmed', ({ orgId, listingId, sellerId, title, status }) => {
    io.to(`owner:${sellerId}`).emit('listing:confirmed', { listingId, title, status, timestamp: new Date().toISOString() });
  });

  // Inquiry on a listing → notify seller
  bus.on('listing:inquiry', ({ orgId, listingId, sellerId, listingTitle, buyerName, message }) => {
    io.to(`owner:${sellerId}`).emit('listing:inquiry', { listingId, listingTitle, buyerName, message, timestamp: new Date().toISOString() });
  });

  // Purchase initiated → notify seller
  bus.on('purchase:initiated', ({ orgId, purchaseId, sellerId, listingTitle, buyerName }) => {
    io.to(`owner:${sellerId}`).emit('purchase:initiated', { purchaseId, listingTitle, buyerName, timestamp: new Date().toISOString() });
  });

  // Purchase accepted → notify buyer
  bus.on('purchase:accepted', ({ orgId, purchaseId, buyerId }) => {
    io.to(`owner:${buyerId}`).emit('purchase:accepted', { purchaseId, timestamp: new Date().toISOString() });
  });

  // Receipt generated → notify buyer
  bus.on('purchase:receipt', ({ orgId, purchaseId, buyerId, receiptNumber }) => {
    io.to(`owner:${buyerId}`).emit('purchase:receipt', { purchaseId, receiptNumber, timestamp: new Date().toISOString() });
  });

  return io;
}

module.exports = { createWebSocketServer };
