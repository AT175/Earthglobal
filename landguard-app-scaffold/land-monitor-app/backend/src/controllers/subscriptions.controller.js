const db = require('../config/db');
const { calculateSettlement, processSettlements } = require('../utils/settlement');

// ── Helper: calculate the actual price for a plan given billing cycle / delivery days ──
function calculatePrice(plan, billingCycle, deliveryDays) {
  if (plan.category === 'search') {
    // Search plans: base_price + rush_fee_per_day * (max_delivery_days - chosen_days)
    const maxDays = plan.max_delivery_days || 5;
    const chosenDays = deliveryDays || maxDays;
    const rushDays = Math.max(0, maxDays - chosenDays);
    const rushFee = parseFloat(plan.rush_fee_per_day || 0) * rushDays;
    return parseFloat(plan.base_price || plan.price) + rushFee;
  }
  // Monitoring plans: monthly price with quarterly/yearly discounts
  const monthly = parseFloat(plan.price);
  if (billingCycle === 'quarterly') {
    return monthly * 3 * (1 - parseFloat(plan.quarterly_discount || 0));
  }
  if (billingCycle === 'yearly') {
    return monthly * 12 * (1 - parseFloat(plan.yearly_discount || 0));
  }
  return monthly; // monthly
}

// ── Helper: compute renewal/expiration date ──
function computeRenewal(billingCycle) {
  switch (billingCycle) {
    case 'quarterly': return "now() + interval '3 months'";
    case 'yearly': return "now() + interval '1 year'";
    default: return "now() + interval '1 month'";
  }
}

// GET /subscriptions/plans — public, lists all active plans grouped by category
exports.listPlans = async (_req, res, next) => {
  try {
    const result = await db.query(
      `SELECT * FROM plans WHERE is_active = true ORDER BY category, sort_order, price ASC`
    );
    const plans = result.rows.map((p) => ({
      ...p,
      price: parseFloat(p.price),
      base_price: p.base_price != null ? parseFloat(p.base_price) : null,
      rush_fee_per_day: parseFloat(p.rush_fee_per_day || 0),
      quarterly_discount: parseFloat(p.quarterly_discount || 0),
      yearly_discount: parseFloat(p.yearly_discount || 0),
    }));
    // Group by category for the frontend
    const grouped = {
      search: plans.filter((p) => p.category === 'search'),
      monitoring: plans.filter((p) => p.category === 'monitoring'),
    };
    res.json(grouped);
  } catch (err) {
    next(err);
  }
};

// POST /subscriptions — owner subscribes to a plan
// Body: { plan_id, billing_cycle?, delivery_days?, payment_method, momo_number?, card_last4?, method_reference? }
exports.subscribe = async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    const { plan_id, billing_cycle, delivery_days, payment_method, momo_number, card_last4, method_reference } = req.body;
    if (!payment_method || !['cash', 'momo', 'card'].includes(payment_method)) {
      return res.status(400).json({ error: 'payment_method (cash, momo, or card) is required' });
    }
    if (payment_method === 'momo' && !momo_number) {
      return res.status(400).json({ error: 'momo_number is required for mobile money payments' });
    }

    const planResult = await db.query('SELECT * FROM plans WHERE id = $1 AND is_active = true', [plan_id]);
    const plan = planResult.rows[0];
    if (!plan) return res.status(404).json({ error: 'Plan not found or inactive' });

    // Validate billing_cycle for monitoring plans
    if (plan.category === 'monitoring') {
      if (!['monthly', 'quarterly', 'yearly'].includes(billing_cycle)) {
        return res.status(400).json({ error: 'billing_cycle (monthly, quarterly, or yearly) is required for monitoring plans' });
      }
    }

    // Validate delivery_days for search plans
    if (plan.category === 'search' && plan.min_delivery_days != null) {
      const dd = delivery_days || plan.max_delivery_days;
      if (dd < plan.min_delivery_days || dd > plan.max_delivery_days) {
        return res.status(400).json({
          error: `Delivery days must be between ${plan.min_delivery_days} and ${plan.max_delivery_days}`,
        });
      }
    }

    const pricePaid = calculatePrice(plan, billing_cycle, delivery_days);
    const currency = 'GHS';
    const purpose = plan.category === 'search' ? 'search' : 'subscription';

    await client.query('BEGIN');

    // For monitoring plans, compute renewal date; for search plans, no renewal
    const renewalExpr = plan.category === 'monitoring'
      ? computeRenewal(billing_cycle)
      : 'NULL';
    const expiresExpr = plan.category === 'search'
      ? "now() + interval '30 days'" // search subscriptions valid for 30 days
      : 'NULL';

    const result = await client.query(
      `INSERT INTO subscriptions
         (owner_id, plan_id, credits_remaining, renews_at, status,
          billing_cycle, delivery_days, price_paid, currency, parcels_used, searches_used, expires_at)
       VALUES ($1, $2, $3, ${renewalExpr}, 'active',
               $4, $5, $6, $7, 0, 0, ${expiresExpr})
       RETURNING *`,
      [
        req.user.id,
        plan_id,
        plan.included_visits_per_period,
        billing_cycle || null,
        delivery_days || null,
        pricePaid,
        currency,
      ]
    );

    const subscription = result.rows[0];

    // Record the payment with the new payment method fields
    const payment = await client.query(
      `INSERT INTO payments
         (owner_id, amount, currency, provider, purpose, status, method,
          momo_number, card_last4, method_reference)
       VALUES ($1, $2, $3, $4, $5, 'succeeded', $6, $7, $8, $9) RETURNING *`,
      [
        req.user.id, pricePaid, currency, payment_method, purpose,
        payment_method, momo_number || null, card_last4 || null, method_reference || null,
      ]
    );

    // Process settlements (subscription/search → 100% to system)
    const settlements = await calculateSettlement({
      purpose, amount: pricePaid, currency, organizationId: null,
    });
    await processSettlements(client, payment.rows[0].id, settlements);

    await client.query('COMMIT');

    res.status(201).json({
      subscription: { ...subscription, price_paid: parseFloat(subscription.price_paid) },
      payment: { ...payment.rows[0], amount: parseFloat(payment.rows[0].amount) },
      settlements: settlements.map((s) => ({ ...s, amount: parseFloat(s.amount) })),
      message: plan.category === 'search'
        ? `Search subscription activated. ${plan.max_parcels} parcel searches included. Valid for 30 days.`
        : `Monitoring subscription activated. Billing: ${billing_cycle}. Renews automatically.`,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// GET /subscriptions/me — owner's active subscription + usage
exports.getMine = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT s.*, p.name AS plan_name, p.category, p.tier, p.max_parcels,
              p.includes_quick_search, p.includes_validated_search, p.includes_field_verification,
              p.live_video_included, p.included_visits_per_period
       FROM subscriptions s
       JOIN plans p ON p.id = s.plan_id
       WHERE s.owner_id = $1 AND s.status = 'active'
       ORDER BY s.created_at DESC LIMIT 1`,
      [req.user.id]
    );
    if (!result.rows[0]) return res.json(null);

    const sub = result.rows[0];
    const remaining_parcels = Math.max(0, sub.max_parcels - sub.parcels_used);
    const remaining_searches = Math.max(0, sub.max_parcels - sub.searches_used);

    res.json({
      ...sub,
      price_paid: parseFloat(sub.price_paid || 0),
      remaining_parcels,
      remaining_searches,
      remaining_credits: sub.credits_remaining,
    });
  } catch (err) {
    next(err);
  }
};

// GET /subscriptions/me/all — owner's subscription history
exports.getMyHistory = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT s.*, p.name AS plan_name, p.category, p.tier, p.max_parcels
       FROM subscriptions s
       JOIN plans p ON p.id = s.plan_id
       WHERE s.owner_id = $1
       ORDER BY s.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows.map((r) => ({ ...r, price_paid: parseFloat(r.price_paid || 0) })));
  } catch (err) {
    next(err);
  }
};

// POST /subscriptions/top-up — owner requests additional services when exhausted
// Body: { subscription_id, type, quantity, notes?, payment_method, momo_number?, card_last4?, method_reference? }
exports.topUp = async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    const { subscription_id, type, quantity, notes, payment_method, momo_number, card_last4, method_reference } = req.body;
    if (!['extra_parcel', 'extra_search', 'field_visit', 'rush_delivery'].includes(type)) {
      return res.status(400).json({ error: 'Invalid top-up type' });
    }
    if (!payment_method || !['cash', 'momo', 'card'].includes(payment_method)) {
      return res.status(400).json({ error: 'payment_method (cash, momo, or card) is required' });
    }
    if (payment_method === 'momo' && !momo_number) {
      return res.status(400).json({ error: 'momo_number is required for mobile money payments' });
    }

    // Verify the subscription belongs to the owner
    const subResult = await db.query(
      'SELECT * FROM subscriptions WHERE id = $1 AND owner_id = $2 AND status = \'active\'',
      [subscription_id, req.user.id]
    );
    if (!subResult.rows[0]) return res.status(404).json({ error: 'Active subscription not found' });

    // Pricing for top-ups (can be adjusted by finance officer later)
    const topUpPrices = {
      extra_parcel: 30.00,
      extra_search: 20.00,
      field_visit: 100.00,
      rush_delivery: 50.00,
    };
    const qty = Math.max(1, parseInt(quantity, 10) || 1);
    const amount = topUpPrices[type] * qty;

    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO top_ups (subscription_id, owner_id, type, quantity, amount, currency, status, notes)
       VALUES ($1, $2, $3, $4, $5, 'GHS', 'pending', $6) RETURNING *`,
      [subscription_id, req.user.id, type, qty, amount, notes || null]
    );

    // Record payment with payment method
    const payment = await client.query(
      `INSERT INTO payments
         (owner_id, amount, currency, provider, purpose, status, method,
          momo_number, card_last4, method_reference)
       VALUES ($1, $2, $3, $4, 'top_up', 'succeeded', $5, $6, $7, $8) RETURNING *`,
      [req.user.id, amount, 'GHS', payment_method, payment_method,
       momo_number || null, card_last4 || null, method_reference || null]
    );

    // Process settlements (top_up → 100% to system)
    const settlements = await calculateSettlement({
      purpose: 'top_up', amount, currency: 'GHS', organizationId: null,
    });
    await processSettlements(client, payment.rows[0].id, settlements);

    await client.query('COMMIT');

    res.status(201).json({
      top_up: { ...result.rows[0], amount: parseFloat(result.rows[0].amount) },
      payment: { ...payment.rows[0], amount: parseFloat(payment.rows[0].amount) },
      settlements: settlements.map((s) => ({ ...s, amount: parseFloat(s.amount) })),
      message: 'Top-up request created. You will be notified once it is fulfilled.',
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// GET /subscriptions/top-ups — owner's top-up history
exports.getMyTopUps = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT t.*, p.name AS plan_name
       FROM top_ups t
       JOIN subscriptions s ON s.id = t.subscription_id
       JOIN plans p ON p.id = s.plan_id
       WHERE t.owner_id = $1
       ORDER BY t.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows.map((r) => ({ ...r, amount: parseFloat(r.amount) })));
  } catch (err) {
    next(err);
  }
};

// GET /subscriptions/price-preview — preview the price for a plan given options
// Query: ?plan_id=&billing_cycle=&delivery_days=
exports.previewPrice = async (req, res, next) => {
  try {
    const { plan_id, billing_cycle, delivery_days } = req.query;
    const planResult = await db.query('SELECT * FROM plans WHERE id = $1', [plan_id]);
    const plan = planResult.rows[0];
    if (!plan) return res.status(404).json({ error: 'Plan not found' });

    const price = calculatePrice(plan, billing_cycle, delivery_days);
    res.json({
      plan_id,
      plan_name: plan.name,
      category: plan.category,
      billing_cycle: billing_cycle || null,
      delivery_days: delivery_days ? parseInt(delivery_days, 10) : null,
      price,
      currency: 'GHS',
    });
  } catch (err) {
    next(err);
  }
};
