const express = require('express');
const router = express.Router();
const { requireAuth, requireRole, requireAdminRole } = require('../middleware/auth');
const ctrl = require('../controllers/finance.controller');

// Finance routes are accessible to both admin sub-roles — 'finance_officer'
// (their dedicated dashboard) and 'super_admin' (oversight).
router.use(requireAuth, requireRole('admin'), requireAdminRole('super_admin', 'finance_officer'));

// Dashboard overview
router.get('/stats', ctrl.getStats);

// Platform fee settings
router.get('/settings', ctrl.getSettings);
router.patch('/settings', ctrl.updateSettings);

// Subscription plans
router.get('/plans', ctrl.listPlans);
router.post('/plans', ctrl.createPlan);
router.patch('/plans/:id', ctrl.updatePlan);
router.delete('/plans/:id', ctrl.deletePlan);

// Owner subscriptions
router.get('/subscriptions', ctrl.listSubscriptions);
router.patch('/subscriptions/:id', ctrl.updateSubscription);

// Payments ledger
router.get('/payments', ctrl.listPayments);
router.patch('/payments/:id', ctrl.updatePayment);

// Land-sale commissions
router.get('/commissions', ctrl.listCommissions);
router.get('/commissions/outstanding-sellers', ctrl.listOutstandingSellers);

// Tenant (assembly organization) finance configuration
router.get('/tenants', ctrl.listTenants);
router.put('/tenants/:orgId/billing', ctrl.upsertTenantBilling);
router.get('/tenants/:orgId/invoices', ctrl.listTenantInvoices);
router.post('/tenants/:orgId/invoices', ctrl.createTenantInvoice);
router.patch('/invoices/:id', ctrl.updateInvoice);

// Top-ups (additional services requested by owners)
router.get('/top-ups', ctrl.listTopUps);
router.patch('/top-ups/:id', ctrl.updateTopUp);

// Hierarchical payment system — settlements, wallets, payouts
router.get('/settlements', ctrl.listSettlements);
router.get('/wallets', ctrl.listWallets);
router.get('/wallets/:orgId', ctrl.getWallet);
router.patch('/wallets/:orgId', ctrl.updateWallet);
router.get('/payouts', ctrl.listPayouts);
router.post('/payouts', ctrl.createPayout);
router.patch('/payouts/:id', ctrl.updatePayout);

module.exports = router;
