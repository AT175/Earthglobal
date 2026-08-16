/**
 * Real-time event bus — a thin singleton EventEmitter that backend controllers
 * and jobs use to broadcast domain events (new alert, visit status change,
 * notification created). The WebSocket server subscribes to these and forwards
 * them to the appropriate connected clients based on their room membership.
 *
 * This decouples event *production* (controllers/jobs) from event *delivery*
 * (socket.io rooms), so controllers don't need to know about socket.io.
 */
const EventEmitter = require('events');

const bus = new EventEmitter();
bus.setMaxListeners(50); // one listener per connected socket is common

module.exports = bus;
