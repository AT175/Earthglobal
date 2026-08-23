const express = require('express');
const router = express.Router();
const multer = require('multer');
const { requireAuth, requireRole, requireAssemblyRole } = require('../middleware/auth');
const ctrl = require('../controllers/assembly.controller');
const schemeCtrl = require('../controllers/scheme.controller');
const refBuildingsCtrl = require('../controllers/referenceBuildings.controller');

const upload = multer({ storage: multer.memoryStorage() });

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

// KML export — download all geospatial data as KML for Google Earth
router.get('/planning/export.kml', requireAssemblyRole('assembly_admin', 'planning_officer'), ctrl.exportKML);

// Land ownership transfer
router.get('/planning/owners', requireAssemblyRole('assembly_admin', 'planning_officer'), ctrl.listOrgOwners);
router.post('/planning/transfer-land', requireAssemblyRole('assembly_admin', 'planning_officer'), ctrl.transferLand);

// Parcel geospatial CRUD (draw/edit/delete parcels with accurate boundaries)
router.post('/planning/parcels', requireAssemblyRole('assembly_admin', 'planning_officer'), ctrl.createParcel);
router.patch('/planning/parcels/:id', requireAssemblyRole('assembly_admin', 'planning_officer'), ctrl.updateParcel);
router.delete('/planning/parcels/:id', requireAssemblyRole('assembly_admin', 'planning_officer'), ctrl.deleteParcel);

// Building change detection (ML-based time-series comparison)
router.post('/planning/change-detection', requireAssemblyRole('assembly_admin', 'planning_officer'), ctrl.runChangeDetection);
router.get('/planning/change-detection/history', requireAssemblyRole('assembly_admin', 'planning_officer'), ctrl.listChangeDetections);
router.get('/planning/change-detection/:id', requireAssemblyRole('assembly_admin', 'planning_officer'), ctrl.getChangeDetection);
router.get('/planning/new-buildings', requireAssemblyRole('assembly_admin', 'planning_officer'), ctrl.getNewBuildings);

// ═══════════════════════════════════════════════════════════
// PLANNING SCHEMES — upload, manage, and extract buildings per parcel
// Access: assembly_admin + planning_officer
// ═══════════════════════════════════════════════════════════
router.get('/planning/projections', requireAssemblyRole('assembly_admin', 'planning_officer'), schemeCtrl.listProjections);
router.get('/planning/schemes', requireAssemblyRole('assembly_admin', 'planning_officer'), schemeCtrl.listSchemes);
router.get('/planning/schemes/:id', requireAssemblyRole('assembly_admin', 'planning_officer'), schemeCtrl.getScheme);
router.get('/planning/schemes/:id/geojson', requireAssemblyRole('assembly_admin', 'planning_officer'), schemeCtrl.getSchemeGeoJSON);
router.get('/planning/schemes/:id/parcels', requireAssemblyRole('assembly_admin', 'planning_officer'), schemeCtrl.getSchemeParcelsGeoJSON);
router.post('/planning/schemes', requireAssemblyRole('assembly_admin', 'planning_officer'), upload.single('file'), schemeCtrl.uploadScheme);
router.patch('/planning/schemes/:id', requireAssemblyRole('assembly_admin', 'planning_officer'), schemeCtrl.updateScheme);
router.delete('/planning/schemes/:id', requireAssemblyRole('assembly_admin', 'planning_officer'), schemeCtrl.deleteScheme);
router.post('/planning/schemes/:id/parcels/:parcelId/extract-buildings', requireAssemblyRole('assembly_admin', 'planning_officer'), schemeCtrl.extractBuildingsForParcel);

// ═══════════════════════════════════════════════════════════
// REFERENCE BUILDINGS — Google Open Buildings + OSM for overlay comparison
// ═══════════════════════════════════════════════════════════
router.get('/planning/google-buildings', requireAssemblyRole('assembly_admin', 'planning_officer'), refBuildingsCtrl.getGoogleBuildings);
router.get('/planning/osm-buildings', requireAssemblyRole('assembly_admin', 'planning_officer'), refBuildingsCtrl.getOSMBuildings);
router.post('/planning/buildings-comparison', requireAssemblyRole('assembly_admin', 'planning_officer'), refBuildingsCtrl.compareBuildingSources);

module.exports = router;
