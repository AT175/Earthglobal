require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');
const parcelRoutes = require('./routes/parcels.routes');
const surveySessionRoutes = require('./routes/surveySessions.routes');
const visitRequestRoutes = require('./routes/visitRequests.routes');
const subscriptionRoutes = require('./routes/subscriptions.routes');
const alertRoutes = require('./routes/alerts.routes');
const agentRoutes = require('./routes/agents.routes');
const notificationRoutes = require('./routes/notifications.routes');
const paymentRoutes = require('./routes/payments.routes');
const mapTilesRoutes = require('./routes/mapTiles.routes');
const assemblyRoutes = require('./routes/assembly.routes');
const { createWebSocketServer } = require('./realtime/socketServer');
const cron = require('node-cron');
const { run: runNdviJob } = require('./jobs/ndviChangeDetection');

const app = express();

// In production, restrict CORS to known frontend origins via CORS_ORIGINS env var
// (comma-separated). Defaults to permissive for local dev.
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
  : true;
app.use(cors({ origin: corsOrigins, credentials: true }));
// Note: payments webhook route needs the raw body for signature verification,
// so it's mounted separately before the global json parser in a real build.
app.use(express.json({ limit: '10mb' }));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/auth', authRoutes);
app.use('/parcels', parcelRoutes);
app.use('/survey-sessions', surveySessionRoutes);
app.use('/visit-requests', visitRequestRoutes);
app.use('/subscriptions', subscriptionRoutes);
app.use('/parcels', alertRoutes); // mounts /parcels/:id/alerts, see routes file
app.use('/alerts', alertRoutes);  // mounts /alerts/trends (owner-scoped aggregation)
app.use('/agents', agentRoutes);
app.use('/notifications', notificationRoutes);
app.use('/payments', paymentRoutes);
app.use('/map-tiles', mapTilesRoutes);
app.use('/assembly', assemblyRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const server = http.createServer(app);
createWebSocketServer(server);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`API + WebSocket listening on port ${PORT}`);

  // Schedule NDVI change detection — runs every 2 days at 3:00 AM UTC
  // Sentinel-2 revisits every 2-3 days, so checking every 2 days catches
  // new imagery soon after it's available.
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_NDVI_CRON === 'true') {
    cron.schedule('0 3 */2 * *', () => {
      console.log('[Cron] Starting scheduled NDVI change detection...');
      runNdviJob().catch((err) => console.error('[Cron] NDVI job error:', err.message));
    });
    console.log('NDVI change detection scheduled: every 2 days at 3:00 AM UTC');
  } else {
    console.log('NDVI cron disabled in dev — set ENABLE_NDVI_CRON=true to enable');
  }
});
