const express = require('express');
const router = express.Router();
const { requireAuth, requireRole, requireAssemblyRole } = require('../middleware/auth');
const ctrl = require('../controllers/assembly.controller');

// All assembly routes require auth + assembly role
router.use(requireAuth, requireRole('assembly'));

// Dashboard stats
router.get('/stats', ctrl.getStats);

// Building permits
router.get('/permits', ctrl.listPermits);
router.post('/permits', ctrl.createPermit);
router.patch('/permits/:id', ctrl.updatePermitStatus);

// Buildings (detected from satellite)
router.get('/buildings', ctrl.listBuildings);
router.patch('/buildings/:id', ctrl.verifyBuilding);

// Protected areas
router.get('/protected-areas', ctrl.listProtectedAreas);
router.post('/protected-areas', ctrl.createProtectedArea);

// Parcel transactions
router.get('/transactions', ctrl.listTransactions);
router.post('/transactions', ctrl.createTransaction);
router.patch('/transactions/:id', ctrl.reviewTransaction);

// Building designs (owner-submitted)
router.get('/designs', ctrl.listDesigns);
router.patch('/designs/:id', ctrl.reviewDesign);

// Revenue
router.get('/revenue', ctrl.listRevenue);
router.get('/revenue/summary', ctrl.revenueSummary);
router.post('/revenue', ctrl.createRevenue);

// Alerts (assembly-scoped)
router.get('/alerts', ctrl.listAlerts);

// Organization info
router.get('/organization', ctrl.getOrganization);

// User management (org-scoped — assembly_admin only)
router.get('/users', ctrl.listUsers);
router.post('/users', ctrl.createUser);
router.patch('/users/:id', ctrl.updateUser);
router.delete('/users/:id', ctrl.deleteUser);

// ═══════════════════════════════════════════════════════════
// PLANNING OFFICER — geodatabase, building detection, map data
// Access: assembly_admin + planning_officer
// ═══════════════════════════════════════════════════════════
router.get('/planning/parcels-geojson', requireAssemblyRole('assembly_admin', 'planning_officer'), ctrl.getParcelsGeoJSON);
router.get('/planning/buildings-geojson', requireAssemblyRole('assembly_admin', 'planning_officer'), ctrl.getBuildingsGeoJSON);
router.get('/planning/protected-areas-geojson', requireAssemblyRole('assembly_admin', 'planning_officer'), ctrl.getProtectedAreasGeoJSON);
router.get('/planning/district-boundary', requireAssemblyRole('assembly_admin', 'planning_officer'), ctrl.getDistrictBoundary);
router.get('/planning/satellite-tiles', requireAssemblyRole('assembly_admin', 'planning_officer'), ctrl.getSatelliteTiles);
router.post('/planning/detect-buildings', requireAssemblyRole('assembly_admin', 'planning_officer'), ctrl.detectBuildings);
router.post('/planning/buildings', requireAssemblyRole('assembly_admin', 'planning_officer'), ctrl.createBuilding);
router.patch('/planning/buildings/:id', requireAssemblyRole('assembly_admin', 'planning_officer'), ctrl.updateBuilding);

module.exports = router;
