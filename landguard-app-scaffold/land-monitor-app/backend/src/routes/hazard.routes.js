const express = require('express');
const router = express.Router({ mergeParams: true });
const { requireAuth, requireRole, requireAssemblyRole } = require('../middleware/auth');
const ctrl = require('../controllers/hazard.controller');

// All hazard routes require auth + assembly role
router.use(requireAuth, requireRole('assembly'));

// ── Hazard GeoJSON for map overlay ──
router.get('/hazards-geojson', requireAssemblyRole('assembly_admin', 'planning_officer'), ctrl.getHazardsGeoJSON);

// ── EE-based automatic detection ──
router.post('/detect-hazards', requireAssemblyRole('assembly_admin', 'planning_officer'), ctrl.detectHazards);

// ── Manual query with parameters ──
router.post('/hazards/query', requireAssemblyRole('assembly_admin', 'planning_officer'), ctrl.queryHazards);

// ── Nearby hazards (for validation report) ──
router.get('/hazards-nearby', requireAssemblyRole('assembly_admin', 'planning_officer'), ctrl.findNearbyHazards);

// ── Hazard stats (dashboard summary) ──
router.get('/hazard-stats', requireAssemblyRole('assembly_admin', 'planning_officer'), ctrl.getHazardStats);

// ── Hazard alerts ──
router.get('/hazard-alerts', requireAssemblyRole('assembly_admin', 'planning_officer'), ctrl.listHazardAlerts);
router.patch('/hazard-alerts/:id/read', requireAssemblyRole('assembly_admin', 'planning_officer'), ctrl.markAlertRead);

// ── Manual hazard report ──
router.post('/hazards', requireAssemblyRole('assembly_admin', 'planning_officer'), ctrl.createHazard);

// ── Single hazard CRUD ──
router.get('/hazards/:id', requireAssemblyRole('assembly_admin', 'planning_officer'), ctrl.getHazard);
router.patch('/hazards/:id', requireAssemblyRole('assembly_admin', 'planning_officer'), ctrl.updateHazard);

module.exports = router;
