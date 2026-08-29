/**
 * Parcel Monitoring Routes — comprehensive land monitoring endpoints for owners.
 * All routes require authentication and enforce ownership-based access control.
 */
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const monitoring = require('../controllers/parcelMonitoring.controller');

// Comprehensive summary (lightweight, no EE calls)
router.get('/:id/monitoring-summary', requireAuth, monitoring.monitoringSummary);

// Individual monitoring endpoints
router.get('/:id/flood', requireAuth, monitoring.floodMonitor);
router.get('/:id/encroachment', requireAuth, monitoring.encroachmentCheck);
router.get('/:id/lulc', requireAuth, monitoring.lulcClassify);
router.get('/:id/fire', requireAuth, monitoring.fireDetect);
router.get('/:id/soil-moisture', requireAuth, monitoring.soilMoisture);
router.get('/:id/rainfall', requireAuth, monitoring.rainfall);
router.get('/:id/historical-imagery', requireAuth, monitoring.historicalImagery);
router.get('/:id/tree-cover-loss', requireAuth, monitoring.treeCoverLoss);
router.get('/:id/land-surface-temperature', requireAuth, monitoring.landSurfaceTemp);
router.get('/:id/multi-index', requireAuth, monitoring.multiIndex);
router.get('/:id/water', requireAuth, monitoring.waterDetect);
router.get('/:id/carbon-stock', requireAuth, monitoring.carbonStock);
router.get('/:id/valuation', requireAuth, monitoring.valuation);
router.get('/:id/evidence-package', requireAuth, monitoring.evidencePackage);

// Monitoring log — historical record of all monitoring runs
// NOTE: /monitoring-log/all must come BEFORE /:id/monitoring-log to avoid
// Express matching "monitoring-log" as the :id parameter
router.get('/monitoring-log/all', requireAuth, monitoring.listAllMonitoringLogs);
router.get('/:id/monitoring-log', requireAuth, monitoring.monitoringLog);

module.exports = router;
