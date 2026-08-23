const express = require('express');
const router = express.Router();
const { requireAuth, requireRole, requireAssemblyRole } = require('../middleware/auth');
const { auditLog } = require('../middleware/auditLog');
const { validateBody, schemas } = require('../middleware/validate');
const ctrl = require('../controllers/marketplace.controller');

// ═══════════════════════════════════════════════════════════
// PUBLIC ROUTES (no auth required for browsing)
// ═══════════════════════════════════════════════════════════
router.get('/listings', ctrl.browseListings);
router.get('/listings/:id', ctrl.getListingDetails);

// ═══════════════════════════════════════════════════════════
// AUTHENTICATED ROUTES (any logged-in user)
// ═══════════════════════════════════════════════════════════
router.post('/listings/:id/inquire', requireAuth, ctrl.inquireListing);
router.post('/listings/:id/purchase', requireAuth, validateBody(schemas.initiatePurchase), ctrl.initiatePurchase);
router.get('/my-purchases', requireAuth, ctrl.getMyPurchases);
router.get('/my-receipts', requireAuth, ctrl.getMyReceipts);

// ═══════════════════════════════════════════════════════════
// SELLER ROUTES (owners who list land)
// ═══════════════════════════════════════════════════════════
router.post('/listings', requireAuth, requireRole('owner'), validateBody(schemas.createListing), ctrl.createListing);
router.get('/my-listings', requireAuth, requireRole('owner'), ctrl.getMyListings);
router.patch('/listings/:id', requireAuth, requireRole('owner'), ctrl.updateListing);
router.delete('/listings/:id', requireAuth, requireRole('owner'), ctrl.withdrawListing);
router.get('/my-sales', requireAuth, requireRole('owner'), ctrl.getMySales);
router.get('/seller/stats', requireAuth, requireRole('owner'), ctrl.getSellerStats);

// Purchase management (seller side)
router.patch('/purchases/:id/accept', requireAuth, requireRole('owner'), ctrl.acceptPurchase);
router.patch('/purchases/:id/reject', requireAuth, requireRole('owner'), ctrl.rejectPurchase);
router.patch('/purchases/:id/confirm-payment', requireAuth, requireRole('owner'), ctrl.confirmPayment);
router.post('/purchases/:id/generate-receipt', requireAuth, requireRole('owner'), ctrl.generateReceipt);
router.post('/purchases/:id/pay-commission', requireAuth, requireRole('owner'), ctrl.payCommission);
router.post('/purchases/:id/transfer-ownership', requireAuth, requireRole('owner'), auditLog('ownership_transfer'), ctrl.transferOwnership);

// Receipt download
router.get('/receipts/:id', requireAuth, ctrl.downloadReceipt);

// ═══════════════════════════════════════════════════════════
// PLANNER ROUTES (review + confirm listings)
// ═══════════════════════════════════════════════════════════
router.get('/planner/listings', requireAuth, requireRole('assembly'), requireAssemblyRole('assembly_admin', 'planning_officer'), ctrl.getPlannerListings);
router.patch('/planner/listings/:id/confirm', requireAuth, requireRole('assembly'), requireAssemblyRole('assembly_admin', 'planning_officer'), ctrl.confirmListing);

module.exports = router;
