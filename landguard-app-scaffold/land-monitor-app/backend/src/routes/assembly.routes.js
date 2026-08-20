const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
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

module.exports = router;
