/**
 * Finance Controller
 *
 * Powers the Finance Officer dashboard — the system-wide role responsible
 * for everything money-related in the platform:
 *   - Platform fee settings (land-sale commission %, default currency)
 *   - Subscription plans (owner-facing monitoring plans) CRUD
 *   - Owner subscriptions (view/adjust status, renewal, plan)
 *   - Payments ledger (owner subscription payments, one-off visits,
 *     land-sale commission payments) — view + manual reconciliation
 *   - Tenant (assembly organization) billing configuration — monthly fee,
 *     billing cycle, commission overrides, status
 *   - Tenant invoices — create/track/mark paid
 *   - Land-sale commission tracking across all sellers
 */
const db = require('../config/db');

// ═══════════════════════════════════════════════════════════
// DASHBOARD OVERVIEW
// ═══════════════════════════════════════════════════════════

// GET /finance/stats — consolidated money overview for the dashboard
exports.getStats = async (req, res, next) => {
  try {
    const [
      subsByStatus, paymentsByStatus, tenantCounts, commissionTotals,
      invoicesByStatus, tenantMrr, ownerMrr, recentPayments,
    ] = await Promise.all([
      db.query(`SELECT status, COUNT(*) AS count FROM subscriptions GROUP BY status`),
      db.query(`SELECT status, COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total FROM payments GROUP BY status`),
      db.query(`
        SELECT COUNT(*) AS total_tenants,
               COUNT(*) FILTER (WHERE tb.status = 'active') AS active_tenants,
               COUNT(*) FILTER (WHERE tb.status = 'trial') AS trial_tenants,
               COUNT(*) FILTER (WHERE tb.status = 'suspended') AS suspended_tenants
        FROM organizations o LEFT JOIN tenant_billing tb ON tb.organization_id = o.id
      `),
      db.query(`SELECT COALESCE(SUM(outstanding_commission), 0) AS outstanding, COALESCE(SUM(total_commission_paid), 0) AS paid FROM owners`),
      db.query(`SELECT status, COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total FROM tenant_invoices GROUP BY status`),
      db.query(`SELECT COALESCE(SUM(monthly_fee), 0) AS mrr FROM tenant_billing WHERE status = 'active'`),
      db.query(`
        SELECT COALESCE(SUM(p.price), 0) AS mrr
        FROM subscriptions s JOIN plans p ON p.id = s.plan_id
        WHERE s.status = 'active'
      `),
      db.query(`
        SELECT pay.id, pay.amount, pay.currency, pay.provider, pay.purpose, pay.status, pay.created_at,
               o.name AS owner_name
        FROM payments pay JOIN owners o ON o.id = pay.owner_id
        ORDER BY pay.created_at DESC LIMIT 10
      `),
    ]);

    res.json({
      subscriptions_by_status: subsByStatus.rows.map((r) => ({ ...r, count: parseInt(r.count, 10) })),
      payments_by_status: paymentsByStatus.rows.map((r) => ({ ...r, count: parseInt(r.count, 10), total: parseFloat(r.total) })),
      tenants: {
        total: parseInt(tenantCounts.rows[0].total_tenants, 10),
        active: parseInt(tenantCounts.rows[0].active_tenants, 10),
        trial: parseInt(tenantCounts.rows[0].trial_tenants, 10),
        suspended: parseInt(tenantCounts.rows[0].suspended_tenants, 10),
      },
      commission: {
        outstanding: parseFloat(commissionTotals.rows[0].outstanding),
        paid: parseFloat(commissionTotals.rows[0].paid),
      },
      invoices_by_status: invoicesByStatus.rows.map((r) => ({ ...r, count: parseInt(r.count, 10), total: parseFloat(r.total) })),
      mrr: {
        tenant_mrr: parseFloat(tenantMrr.rows[0].mrr),
        owner_mrr: parseFloat(ownerMrr.rows[0].mrr),
        total_mrr: parseFloat(tenantMrr.rows[0].mrr) + parseFloat(ownerMrr.rows[0].mrr),
      },
      recent_payments: recentPayments.rows.map((r) => ({ ...r, amount: parseFloat(r.amount) })),
    });
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════
// PLATFORM FEE SETTINGS
// ═══════════════════════════════════════════════════════════

// GET /finance/settings
exports.getSettings = async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM platform_fee_settings WHERE id = $1', ['default']);
    const s = result.rows[0];
    res.json({
      ...s,
      land_sale_commission_percent: parseFloat(s.land_sale_commission_percent),
      late_payment_penalty_percent: parseFloat(s.late_payment_penalty_percent),
    });
  } catch (err) { next(err); }
};

// PATCH /finance/settings
exports.updateSettings = async (req, res, next) => {
  try {
    const { land_sale_commission_percent, default_currency, late_payment_penalty_percent } = req.body;
    const result = await db.query(
      `UPDATE platform_fee_settings SET
         land_sale_commission_percent = COALESCE($1, land_sale_commission_percent),
         default_currency = COALESCE($2, default_currency),
         late_payment_penalty_percent = COALESCE($3, late_payment_penalty_percent),
         updated_by = $4, updated_at = now()
       WHERE id = 'default'
       RETURNING *`,
      [land_sale_commission_percent, default_currency, late_payment_penalty_percent, req.user.id]
    );
    const s = result.rows[0];
    res.json({
      ...s,
      land_sale_commission_percent: parseFloat(s.land_sale_commission_percent),
      late_payment_penalty_percent: parseFloat(s.late_payment_penalty_percent),
    });
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════
// SUBSCRIPTION PLANS (search + monitoring plans)
// ═══════════════════════════════════════════════════════════

exports.listPlans = async (req, res, next) => {
  try {
    const { category } = req.query;
    const catClause = category ? `WHERE p.category = $1` : '';
    const params = category ? [category] : [];
    const result = await db.query(`
      SELECT p.*, (SELECT COUNT(*) FROM subscriptions s WHERE s.plan_id = p.id AND s.status = 'active') AS active_subscribers
      FROM plans p ${catClause} ORDER BY p.category, p.sort_order, p.price ASC
    `, params);
    res.json(result.rows.map((r) => ({
      ...r,
      price: parseFloat(r.price),
      base_price: r.base_price != null ? parseFloat(r.base_price) : null,
      rush_fee_per_day: parseFloat(r.rush_fee_per_day || 0),
      quarterly_discount: parseFloat(r.quarterly_discount || 0),
      yearly_discount: parseFloat(r.yearly_discount || 0),
      active_subscribers: parseInt(r.active_subscribers, 10),
    })));
  } catch (err) { next(err); }
};

exports.createPlan = async (req, res, next) => {
  try {
    const {
      name, included_visits_per_period, period, price, live_video_included,
      category, tier, max_parcels, includes_quick_search, includes_validated_search,
      includes_field_verification, min_delivery_days, max_delivery_days, base_price,
      rush_fee_per_day, quarterly_discount, yearly_discount, is_active, sort_order, description,
    } = req.body;
    if (!name || !period || price == null) return res.status(400).json({ error: 'name, period, and price are required' });

    const result = await db.query(
      `INSERT INTO plans
         (name, included_visits_per_period, period, price, live_video_included,
          category, tier, max_parcels, includes_quick_search, includes_validated_search,
          includes_field_verification, min_delivery_days, max_delivery_days, base_price,
          rush_fee_per_day, quarterly_discount, yearly_discount, is_active, sort_order, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
       RETURNING *`,
      [
        name, included_visits_per_period || 0, period, price, !!live_video_included,
        category || 'monitoring', tier || 'regular', max_parcels || 5,
        !!includes_quick_search, !!includes_validated_search, !!includes_field_verification,
        min_delivery_days || null, max_delivery_days || null, base_price || null,
        rush_fee_per_day || 0, quarterly_discount || 0, yearly_discount || 0,
        is_active !== false, sort_order || 0, description || null,
      ]
    );
    const p = result.rows[0];
    res.status(201).json({
      ...p,
      price: parseFloat(p.price),
      base_price: p.base_price != null ? parseFloat(p.base_price) : null,
      rush_fee_per_day: parseFloat(p.rush_fee_per_day || 0),
    });
  } catch (err) { next(err); }
};

exports.updatePlan = async (req, res, next) => {
  try {
    const {
      name, included_visits_per_period, period, price, live_video_included,
      category, tier, max_parcels, includes_quick_search, includes_validated_search,
      includes_field_verification, min_delivery_days, max_delivery_days, base_price,
      rush_fee_per_day, quarterly_discount, yearly_discount, is_active, sort_order, description,
    } = req.body;
    const result = await db.query(
      `UPDATE plans SET
         name = COALESCE($1, name),
         included_visits_per_period = COALESCE($2, included_visits_per_period),
         period = COALESCE($3, period),
         price = COALESCE($4, price),
         live_video_included = COALESCE($5, live_video_included),
         category = COALESCE($6, category),
         tier = COALESCE($7, tier),
         max_parcels = COALESCE($8, max_parcels),
         includes_quick_search = COALESCE($9, includes_quick_search),
         includes_validated_search = COALESCE($10, includes_validated_search),
         includes_field_verification = COALESCE($11, includes_field_verification),
         min_delivery_days = COALESCE($12, min_delivery_days),
         max_delivery_days = COALESCE($13, max_delivery_days),
         base_price = COALESCE($14, base_price),
         rush_fee_per_day = COALESCE($15, rush_fee_per_day),
         quarterly_discount = COALESCE($16, quarterly_discount),
         yearly_discount = COALESCE($17, yearly_discount),
         is_active = COALESCE($18, is_active),
         sort_order = COALESCE($19, sort_order),
         description = COALESCE($20, description)
       WHERE id = $21 RETURNING *`,
      [
        name, included_visits_per_period, period, price, live_video_included,
        category, tier, max_parcels, includes_quick_search, includes_validated_search,
        includes_field_verification, min_delivery_days, max_delivery_days, base_price,
        rush_fee_per_day, quarterly_discount, yearly_discount, is_active, sort_order, description,
        req.params.id,
      ]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Plan not found' });
    const p = result.rows[0];
    res.json({
      ...p,
      price: parseFloat(p.price),
      base_price: p.base_price != null ? parseFloat(p.base_price) : null,
      rush_fee_per_day: parseFloat(p.rush_fee_per_day || 0),
    });
  } catch (err) { next(err); }
};

exports.deletePlan = async (req, res, next) => {
  try {
    const inUse = await db.query('SELECT COUNT(*) FROM subscriptions WHERE plan_id = $1', [req.params.id]);
    if (parseInt(inUse.rows[0].count, 10) > 0) {
      return res.status(409).json({ error: 'Cannot delete a plan with existing subscriptions. Deactivate it instead.' });
    }
    const result = await db.query('DELETE FROM plans WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Plan not found' });
    res.json({ success: true });
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════
// OWNER SUBSCRIPTIONS
// ═══════════════════════════════════════════════════════════

// GET /finance/subscriptions?status=active&search=
exports.listSubscriptions = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const params = [];
    let where = [];

    if (status) { params.push(status); where.push(`s.status = $${params.length}`); }
    if (search) { params.push(`%${search}%`); where.push(`(o.name ILIKE $${params.length} OR o.email ILIKE $${params.length})`); }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const result = await db.query(
      `SELECT s.id, s.status, s.credits_remaining, s.renews_at, s.created_at,
              o.id AS owner_id, o.name AS owner_name, o.email AS owner_email,
              p.id AS plan_id, p.name AS plan_name, p.price, p.period
       FROM subscriptions s
       JOIN owners o ON o.id = s.owner_id
       JOIN plans p ON p.id = s.plan_id
       ${whereClause}
       ORDER BY s.created_at DESC
       LIMIT 200`,
      params
    );
    res.json(result.rows.map((r) => ({ ...r, price: parseFloat(r.price) })));
  } catch (err) { next(err); }
};

// PATCH /finance/subscriptions/:id — adjust status, renewal date, or plan
exports.updateSubscription = async (req, res, next) => {
  try {
    const { status, renews_at, plan_id, credits_remaining } = req.body;
    const result = await db.query(
      `UPDATE subscriptions SET
         status = COALESCE($1, status),
         renews_at = COALESCE($2, renews_at),
         plan_id = COALESCE($3, plan_id),
         credits_remaining = COALESCE($4, credits_remaining)
       WHERE id = $5 RETURNING *`,
      [status, renews_at, plan_id, credits_remaining, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Subscription not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════
// PAYMENTS LEDGER
// ═══════════════════════════════════════════════════════════

// GET /finance/payments?status=&purpose=&provider=&search=
exports.listPayments = async (req, res, next) => {
  try {
    const { status, purpose, provider, search } = req.query;
    const params = [];
    let where = [];

    if (status) { params.push(status); where.push(`pay.status = $${params.length}`); }
    if (purpose) { params.push(purpose); where.push(`pay.purpose = $${params.length}`); }
    if (provider) { params.push(provider); where.push(`pay.provider = $${params.length}`); }
    if (search) { params.push(`%${search}%`); where.push(`(o.name ILIKE $${params.length} OR o.email ILIKE $${params.length} OR pay.provider_ref ILIKE $${params.length})`); }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const result = await db.query(
      `SELECT pay.id, pay.amount, pay.currency, pay.provider, pay.provider_ref, pay.purpose, pay.status, pay.created_at,
              o.id AS owner_id, o.name AS owner_name, o.email AS owner_email
       FROM payments pay JOIN owners o ON o.id = pay.owner_id
       ${whereClause}
       ORDER BY pay.created_at DESC
       LIMIT 300`,
      params
    );
    res.json(result.rows.map((r) => ({ ...r, amount: parseFloat(r.amount) })));
  } catch (err) { next(err); }
};

// PATCH /finance/payments/:id — manual reconciliation (mark succeeded/refunded/failed)
exports.updatePayment = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['pending', 'succeeded', 'failed', 'refunded'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const result = await db.query(
      'UPDATE payments SET status = $1 WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Payment not found' });
    res.json({ ...result.rows[0], amount: parseFloat(result.rows[0].amount) });
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════
// LAND-SALE COMMISSION TRACKING
// ═══════════════════════════════════════════════════════════

// GET /finance/commissions?status=outstanding|paid
exports.listCommissions = async (req, res, next) => {
  try {
    const { status } = req.query;
    let statusClause = '';
    if (status === 'outstanding') statusClause = 'AND lp.platform_fee_paid = false';
    if (status === 'paid') statusClause = 'AND lp.platform_fee_paid = true';

    const result = await db.query(
      `SELECT lp.id, lp.purchase_price, lp.platform_fee_amount, lp.platform_fee_paid,
              lp.status, lp.completed_at, lp.created_at,
              l.title AS listing_title, l.region,
              seller.id AS seller_id, seller.name AS seller_name, seller.email AS seller_email,
              org.name AS org_name
       FROM land_purchases lp
       JOIN land_listings l ON l.id = lp.listing_id
       JOIN owners seller ON seller.id = lp.seller_id
       LEFT JOIN organizations org ON org.id = lp.organization_id
       WHERE 1=1 ${statusClause}
       ORDER BY lp.created_at DESC
       LIMIT 300`
    );
    res.json(result.rows.map((r) => ({
      ...r,
      purchase_price: parseFloat(r.purchase_price),
      platform_fee_amount: parseFloat(r.platform_fee_amount),
    })));
  } catch (err) { next(err); }
};

// Sellers with outstanding commission (for follow-up / collections)
exports.listOutstandingSellers = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT id, name, email, phone, total_sales, total_commission_paid, outstanding_commission
       FROM owners
       WHERE outstanding_commission > 0
       ORDER BY outstanding_commission DESC`
    );
    res.json(result.rows.map((r) => ({
      ...r,
      total_commission_paid: parseFloat(r.total_commission_paid || 0),
      outstanding_commission: parseFloat(r.outstanding_commission || 0),
    })));
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════
// TENANT (ASSEMBLY ORGANIZATION) FINANCE CONFIGURATION
// ═══════════════════════════════════════════════════════════

// GET /finance/tenants — all organizations with their billing config
exports.listTenants = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT o.id, o.name, o.type, o.region, o.active, o.created_at,
              tb.id AS billing_id, tb.billing_plan, tb.monthly_fee, tb.currency,
              tb.commission_override_percent, tb.billing_cycle, tb.status AS billing_status,
              tb.trial_ends_at, tb.next_invoice_date, tb.notes, tb.updated_at AS billing_updated_at,
              (SELECT COUNT(*) FROM tenant_invoices ti WHERE ti.organization_id = o.id AND ti.status = 'overdue') AS overdue_invoices,
              (SELECT COUNT(*) FROM tenant_invoices ti WHERE ti.organization_id = o.id AND ti.status = 'pending') AS pending_invoices
       FROM organizations o
       LEFT JOIN tenant_billing tb ON tb.organization_id = o.id
       ORDER BY o.created_at DESC`
    );
    res.json(result.rows.map((r) => ({
      ...r,
      monthly_fee: r.monthly_fee != null ? parseFloat(r.monthly_fee) : null,
      commission_override_percent: r.commission_override_percent != null ? parseFloat(r.commission_override_percent) : null,
      overdue_invoices: parseInt(r.overdue_invoices, 10),
      pending_invoices: parseInt(r.pending_invoices, 10),
    })));
  } catch (err) { next(err); }
};

// PUT /finance/tenants/:orgId/billing — create or update a tenant's billing config (upsert)
exports.upsertTenantBilling = async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const {
      billing_plan, monthly_fee, currency, commission_override_percent,
      billing_cycle, status, trial_ends_at, next_invoice_date, notes,
    } = req.body;

    const orgCheck = await db.query('SELECT id FROM organizations WHERE id = $1', [orgId]);
    if (!orgCheck.rows[0]) return res.status(404).json({ error: 'Organization not found' });

    const result = await db.query(
      `INSERT INTO tenant_billing
         (organization_id, billing_plan, monthly_fee, currency, commission_override_percent,
          billing_cycle, status, trial_ends_at, next_invoice_date, notes, updated_by, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now())
       ON CONFLICT (organization_id) DO UPDATE SET
         billing_plan = EXCLUDED.billing_plan,
         monthly_fee = EXCLUDED.monthly_fee,
         currency = EXCLUDED.currency,
         commission_override_percent = EXCLUDED.commission_override_percent,
         billing_cycle = EXCLUDED.billing_cycle,
         status = EXCLUDED.status,
         trial_ends_at = EXCLUDED.trial_ends_at,
         next_invoice_date = EXCLUDED.next_invoice_date,
         notes = EXCLUDED.notes,
         updated_by = EXCLUDED.updated_by,
         updated_at = now()
       RETURNING *`,
      [
        orgId, billing_plan || 'standard', monthly_fee || 0, currency || 'GHS',
        commission_override_percent ?? null, billing_cycle || 'monthly', status || 'active',
        trial_ends_at || null, next_invoice_date || null, notes || null, req.user.id,
      ]
    );
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

// GET /finance/tenants/:orgId/invoices
exports.listTenantInvoices = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT * FROM tenant_invoices WHERE organization_id = $1 ORDER BY created_at DESC`,
      [req.params.orgId]
    );
    res.json(result.rows.map((r) => ({ ...r, amount: parseFloat(r.amount) })));
  } catch (err) { next(err); }
};

// POST /finance/tenants/:orgId/invoices — issue a new invoice
exports.createTenantInvoice = async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const { amount, currency, period_start, period_end, due_date, notes } = req.body;
    if (amount == null) return res.status(400).json({ error: 'amount is required' });

    const orgCheck = await db.query('SELECT id, name FROM organizations WHERE id = $1', [orgId]);
    if (!orgCheck.rows[0]) return res.status(404).json({ error: 'Organization not found' });

    const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    const result = await db.query(
      `INSERT INTO tenant_invoices
         (organization_id, invoice_number, amount, currency, period_start, period_end, due_date, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [orgId, invoiceNumber, amount, currency || 'GHS', period_start || null, period_end || null, due_date || null, notes || null, req.user.id]
    );
    res.status(201).json({ ...result.rows[0], amount: parseFloat(result.rows[0].amount) });
  } catch (err) { next(err); }
};

// PATCH /finance/invoices/:id — mark paid/cancelled/overdue
exports.updateInvoice = async (req, res, next) => {
  try {
    const { status, payment_method, payment_reference } = req.body;

    const result = await db.query(
      `UPDATE tenant_invoices SET
         status = COALESCE($1, status),
         payment_method = COALESCE($2, payment_method),
         payment_reference = COALESCE($3, payment_reference),
         paid_at = ${status === 'paid' ? 'now()' : 'paid_at'}
       WHERE id = $4 RETURNING *`,
      [status, payment_method, payment_reference, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Invoice not found' });
    res.json({ ...result.rows[0], amount: parseFloat(result.rows[0].amount) });
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════
// TOP-UPS — additional services requested by owners when exhausted
// ═══════════════════════════════════════════════════════════

// GET /finance/top-ups?status=pending|fulfilled|cancelled
exports.listTopUps = async (req, res, next) => {
  try {
    const { status } = req.query;
    let whereClause = '';
    const params = [];
    if (status) { params.push(status); whereClause = `WHERE t.status = $1`; }

    const result = await db.query(
      `SELECT t.*, o.name AS owner_name, o.email AS owner_email,
              p.name AS plan_name, p.category AS plan_category
       FROM top_ups t
       JOIN owners o ON o.id = t.owner_id
       JOIN subscriptions s ON s.id = t.subscription_id
       JOIN plans p ON p.id = s.plan_id
       ${whereClause}
       ORDER BY t.created_at DESC
       LIMIT 200`,
      params
    );
    res.json(result.rows.map((r) => ({ ...r, amount: parseFloat(r.amount) })));
  } catch (err) { next(err); }
};

// PATCH /finance/top-ups/:id — fulfill or cancel a top-up request
exports.updateTopUp = async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    if (!['pending', 'fulfilled', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await db.query(
      `UPDATE top_ups SET
         status = $1,
         notes = COALESCE($2, notes),
         fulfilled_at = ${status === 'fulfilled' ? 'now()' : 'fulfilled_at'}
       WHERE id = $3 RETURNING *`,
      [status, notes, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Top-up not found' });

    // When fulfilled, apply the effect to the subscription
    if (status === 'fulfilled') {
      const topUp = result.rows[0];
      if (topUp.type === 'extra_parcel') {
        // Increase max_parcels effectively by reducing parcels_used
        await db.query(
          `UPDATE subscriptions SET parcels_used = GREATEST(0, parcels_used - $1) WHERE id = $2`,
          [topUp.quantity, topUp.subscription_id]
        );
      } else if (topUp.type === 'extra_search') {
        await db.query(
          `UPDATE subscriptions SET searches_used = GREATEST(0, searches_used - $1) WHERE id = $2`,
          [topUp.quantity, topUp.subscription_id]
        );
      } else if (topUp.type === 'field_visit') {
        await db.query(
          `UPDATE subscriptions SET credits_remaining = credits_remaining + $1 WHERE id = $2`,
          [topUp.quantity, topUp.subscription_id]
        );
      }
      // rush_delivery: no subscription field change, just a service delivery
    }

    res.json({ ...result.rows[0], amount: parseFloat(result.rows[0].amount) });
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════
// HIERARCHICAL PAYMENT SYSTEM — settlements, wallets, payouts
// ═══════════════════════════════════════════════════════════

// GET /finance/settlements — all settlement lines (system + tenant)
// Query: ?destination=system|tenant&status=&org_id=
exports.listSettlements = async (req, res, next) => {
  try {
    const { destination, status, org_id } = req.query;
    const params = [];
    let where = [];

    if (destination) { params.push(destination); where.push(`ps.destination = $${params.length}`); }
    if (status) { params.push(status); where.push(`ps.status = $${params.length}`); }
    if (org_id) { params.push(org_id); where.push(`ps.organization_id = $${params.length}`); }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const result = await db.query(
      `SELECT ps.id, ps.destination, ps.amount, ps.currency, ps.description,
              ps.status, ps.settled_at, ps.created_at,
              ps.payment_id, ps.organization_id,
              o.name AS organization_name,
              pay.purpose AS payment_purpose, pay.method AS payment_method,
              pay.owner_id, owner.name AS owner_name
       FROM payment_settlements ps
       LEFT JOIN organizations o ON o.id = ps.organization_id
       LEFT JOIN payments pay ON pay.id = ps.payment_id
       LEFT JOIN owners owner ON owner.id = pay.owner_id
       ${whereClause}
       ORDER BY ps.created_at DESC
       LIMIT 300`,
      params
    );

    // Summary by destination
    const summary = await db.query(
      `SELECT destination,
              COUNT(*) AS count,
              COALESCE(SUM(amount), 0) AS total
       FROM payment_settlements
       WHERE status = 'settled'
       GROUP BY destination`
    );

    res.json({
      settlements: result.rows.map((r) => ({ ...r, amount: parseFloat(r.amount) })),
      summary: summary.rows.map((r) => ({
        destination: r.destination,
        count: parseInt(r.count, 10),
        total: parseFloat(r.total),
      })),
    });
  } catch (err) { next(err); }
};

// GET /finance/wallets — all tenant wallets with balances
exports.listWallets = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT tw.id, tw.organization_id, tw.balance, tw.total_earned,
              tw.total_paid_out, tw.currency, tw.payout_momo_number,
              tw.payout_bank_name, tw.payout_bank_account, tw.payout_account_name,
              tw.updated_at, tw.created_at,
              o.name AS organization_name, o.type AS organization_type, o.region,
              o.active AS organization_active
       FROM tenant_wallets tw
       JOIN organizations o ON o.id = tw.organization_id
       ORDER BY tw.balance DESC`
    );
    res.json(result.rows.map((r) => ({
      ...r,
      balance: parseFloat(r.balance),
      total_earned: parseFloat(r.total_earned),
      total_paid_out: parseFloat(r.total_paid_out),
    })));
  } catch (err) { next(err); }
};

// GET /finance/wallets/:orgId — single tenant wallet detail with recent settlements
exports.getWallet = async (req, res, next) => {
  try {
    const walletResult = await db.query(
      `SELECT tw.*, o.name AS organization_name, o.type, o.region
       FROM tenant_wallets tw
       JOIN organizations o ON o.id = tw.organization_id
       WHERE tw.organization_id = $1`,
      [req.params.orgId]
    );
    if (!walletResult.rows[0]) return res.status(404).json({ error: 'Wallet not found' });

    const settlements = await db.query(
      `SELECT ps.id, ps.amount, ps.description, ps.status, ps.settled_at, ps.created_at,
              pay.purpose AS payment_purpose, pay.method AS payment_method,
              owner.name AS owner_name
       FROM payment_settlements ps
       LEFT JOIN payments pay ON pay.id = ps.payment_id
       LEFT JOIN owners owner ON owner.id = pay.owner_id
       WHERE ps.organization_id = $1 AND ps.destination = 'tenant'
       ORDER BY ps.created_at DESC
       LIMIT 50`,
      [req.params.orgId]
    );

    const payouts = await db.query(
      `SELECT * FROM tenant_payouts WHERE organization_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [req.params.orgId]
    );

    const w = walletResult.rows[0];
    res.json({
      ...w,
      balance: parseFloat(w.balance),
      total_earned: parseFloat(w.total_earned),
      total_paid_out: parseFloat(w.total_paid_out),
      recent_settlements: settlements.rows.map((s) => ({ ...s, amount: parseFloat(s.amount) })),
      recent_payouts: payouts.rows.map((p) => ({ ...p, amount: parseFloat(p.amount) })),
    });
  } catch (err) { next(err); }
};

// PATCH /finance/wallets/:orgId — update payout account details
exports.updateWallet = async (req, res, next) => {
  try {
    const {
      payout_momo_number, payout_bank_name, payout_bank_account, payout_account_name, currency,
    } = req.body;

    // Upsert wallet row
    const result = await db.query(
      `INSERT INTO tenant_wallets (organization_id, payout_momo_number, payout_bank_name,
                                    payout_bank_account, payout_account_name, currency)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (organization_id) DO UPDATE SET
         payout_momo_number = COALESCE(EXCLUDED.payout_momo_number, tenant_wallets.payout_momo_number),
         payout_bank_name = COALESCE(EXCLUDED.payout_bank_name, tenant_wallets.payout_bank_name),
         payout_bank_account = COALESCE(EXCLUDED.payout_bank_account, tenant_wallets.payout_bank_account),
         payout_account_name = COALESCE(EXCLUDED.payout_account_name, tenant_wallets.payout_account_name),
         currency = COALESCE(EXCLUDED.currency, tenant_wallets.currency),
         updated_at = now()
       RETURNING *`,
      [req.params.orgId, payout_momo_number || null, payout_bank_name || null,
       payout_bank_account || null, payout_account_name || null, currency || 'GHS']
    );

    const w = result.rows[0];
    res.json({
      ...w,
      balance: parseFloat(w.balance),
      total_earned: parseFloat(w.total_earned),
      total_paid_out: parseFloat(w.total_paid_out),
    });
  } catch (err) { next(err); }
};

// POST /finance/payouts — initiate a payout from a tenant wallet
// Body: { organization_id, amount, method, destination_account, destination_name, notes }
exports.createPayout = async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    const { organization_id, amount, method, destination_account, destination_name, notes } = req.body;
    if (!organization_id || amount == null || !method) {
      return res.status(400).json({ error: 'organization_id, amount, and method are required' });
    }
    if (!['momo', 'bank', 'cash'].includes(method)) {
      return res.status(400).json({ error: 'method must be momo, bank, or cash' });
    }

    await client.query('BEGIN');

    // Check wallet balance
    const walletResult = await client.query(
      'SELECT balance, currency FROM tenant_wallets WHERE organization_id = $1 FOR UPDATE',
      [organization_id]
    );
    if (!walletResult.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Tenant wallet not found' });
    }
    const balance = parseFloat(walletResult.rows[0].balance);
    if (balance < parseFloat(amount)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Insufficient wallet balance. Available: ${balance}` });
    }

    // Create payout record
    const payoutRef = `PO-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const payoutResult = await client.query(
      `INSERT INTO tenant_payouts
         (organization_id, amount, currency, method, destination_account, destination_name,
          reference, notes, status, requested_by, requested_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9, now())
       RETURNING *`,
      [organization_id, amount, walletResult.rows[0].currency, method,
       destination_account || null, destination_name || null,
       payoutRef, notes || null, req.user.id]
    );

    await client.query('COMMIT');

    res.status(201).json({ ...payoutResult.rows[0], amount: parseFloat(payoutResult.rows[0].amount) });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// GET /finance/payouts — list all payouts
// Query: ?status=pending|approved|paid&org_id=
exports.listPayouts = async (req, res, next) => {
  try {
    const { status, org_id } = req.query;
    const params = [];
    let where = [];

    if (status) { params.push(status); where.push(`tp.status = $${params.length}`); }
    if (org_id) { params.push(org_id); where.push(`tp.organization_id = $${params.length}`); }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const result = await db.query(
      `SELECT tp.*, o.name AS organization_name, o.type AS organization_type
       FROM tenant_payouts tp
       JOIN organizations o ON o.id = tp.organization_id
       ${whereClause}
       ORDER BY tp.created_at DESC
       LIMIT 200`,
      params
    );
    res.json(result.rows.map((r) => ({ ...r, amount: parseFloat(r.amount) })));
  } catch (err) { next(err); }
};

// PATCH /finance/payouts/:id — approve, reject, or mark paid
// Body: { status: 'approved'|'rejected'|'paid'|'failed', notes }
exports.updatePayout = async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    const { status, notes } = req.body;
    if (!['pending', 'approved', 'rejected', 'paid', 'failed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    await client.query('BEGIN');

    // Get current payout state
    const currentResult = await client.query(
      'SELECT * FROM tenant_payouts WHERE id = $1 FOR UPDATE',
      [req.params.id]
    );
    if (!currentResult.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Payout not found' });
    }
    const payout = currentResult.rows[0];

    // Only allow transitions from pending → approved/rejected, approved → paid/failed
    const validTransition =
      (payout.status === 'pending' && ['approved', 'rejected'].includes(status)) ||
      (payout.status === 'approved' && ['paid', 'failed'].includes(status));
    if (!validTransition) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Cannot transition from ${payout.status} to ${status}` });
    }

    // Update payout
    const updateResult = await client.query(
      `UPDATE tenant_payouts SET
         status = $1,
         notes = COALESCE($2, notes),
         approved_by = ${status === 'approved' || status === 'rejected' ? '$3' : 'approved_by'},
         approved_at = ${status === 'approved' || status === 'rejected' ? 'now()' : 'approved_at'},
         paid_at = ${status === 'paid' ? 'now()' : 'paid_at'}
       WHERE id = $4 RETURNING *`,
      [status, notes, req.user.id, req.params.id]
    );

    // When paid: debit the wallet
    if (status === 'paid') {
      await client.query(
        `UPDATE tenant_wallets SET
           balance = balance - $1,
           total_paid_out = total_paid_out + $1,
           updated_at = now()
         WHERE organization_id = $2`,
        [payout.amount, payout.organization_id]
      );
    }

    await client.query('COMMIT');

    res.json({ ...updateResult.rows[0], amount: parseFloat(updateResult.rows[0].amount) });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

module.exports = exports;
