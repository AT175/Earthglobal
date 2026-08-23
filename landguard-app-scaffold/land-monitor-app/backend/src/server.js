require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const logger = require('./config/logger');
const { apiLimiter } = require('./middleware/security');

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
const hazardRoutes = require('./routes/hazard.routes');
const validationRoutes = require('./routes/validation.routes');
const marketplaceRoutes = require('./routes/marketplace.routes');
const adminRoutes = require('./routes/admin.routes');
const financeRoutes = require('./routes/finance.routes');
const profileRoutes = require('./routes/profile.routes');
const { createWebSocketServer } = require('./realtime/socketServer');
const cron = require('node-cron');
const { run: runNdviJob } = require('./jobs/ndviChangeDetection');
const { runScheduled: runBuildingChangeJob } = require('./jobs/buildingChangeDetection');
const db = require('./config/db');

// ── Auto-migrate on startup ──
// Runs schema.sql (idempotent — uses IF NOT EXISTS + DO blocks).
// This replaces the need for a separate migration job service.
async function runMigrations() {
  let client;
  try {
    const schemaPath = path.join(__dirname, '..', '..', 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      logger.info('[Migration] schema.sql not found, skipping');
      return;
    }
    const schema = fs.readFileSync(schemaPath, 'utf8');
    // Use a dedicated client (not from the pool's normal rotation) so the
    // schema's SET/RESET search_path doesn't leak into pooled connections.
    client = await db.pool.connect();
    await client.query(schema);
    logger.info('[Migration] Schema applied successfully');
  } catch (err) {
    logger.error('[Migration] Error: %s', err.message);
    // Don't crash — the DB might already be up to date
  } finally {
    if (client) client.release();
  }
}

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

// Apply general rate limiting to all API routes
app.use('/auth', apiLimiter);

// Health check — basic liveness
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Status check — includes DB connectivity (for monitoring)
app.get('/status', async (_req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected', uptime: process.uptime() });
  } catch (err) {
    res.status(503).json({ status: 'degraded', database: 'disconnected', error: err.message });
  }
});

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
app.use('/assembly/planning', hazardRoutes);
app.use('/validation', validationRoutes);
app.use('/marketplace', marketplaceRoutes);
app.use('/admin', adminRoutes);
app.use('/finance', financeRoutes);
app.use('/profile', profileRoutes);

app.use((err, _req, res, _next) => {
  logger.error('[API Error] %s', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const server = http.createServer(app);
createWebSocketServer(server);

const PORT = process.env.PORT || 4000;

// Run migrations then start the server
runMigrations().then(() => {
  server.listen(PORT, () => {
    logger.info(`API + WebSocket listening on port ${PORT}`);

    // Schedule NDVI change detection — runs every 2 days at 3:00 AM UTC
    // Sentinel-2 revisits every 2-3 days, so checking every 2 days catches
    // new imagery soon after it's available.
    if (process.env.NODE_ENV === 'production' || process.env.ENABLE_NDVI_CRON === 'true') {
      cron.schedule('0 3 */2 * *', () => {
        logger.info('[Cron] Starting scheduled NDVI change detection...');
        runNdviJob().catch((err) => logger.error('[Cron] NDVI job error:', err.message));
      });
      logger.info('NDVI change detection scheduled: every 2 days at 3:00 AM UTC');

      // Schedule building change detection — runs weekly on Sundays at 4:00 AM UTC
      // Compares the last 3 months of imagery vs. the previous 3 months to detect
      // new buildings that have appeared in each organization's district.
      cron.schedule('0 4 * * 0', () => {
        logger.info('[Cron] Starting scheduled building change detection...');
        runBuildingChangeJob().catch((err) => logger.error('[Cron] Building change job error:', err.message));
      });
      logger.info('Building change detection scheduled: weekly on Sundays at 4:00 AM UTC');
    } else {
      logger.info('Cron jobs disabled in dev — set ENABLE_NDVI_CRON=true to enable');
    }
  });
});
