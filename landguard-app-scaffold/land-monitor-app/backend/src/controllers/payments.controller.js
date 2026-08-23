/**
 * Payments Controller
 *
 * Handles all payment creation with the hierarchical settlement system.
 * Supports three payment methods: cash, momo (mobile money), and card.
 *
 * When a payment succeeds, it is automatically split into settlements:
 *   - 'system' settlements → platform finance revenue
 *   - 'tenant' settlements → credited to the organization's wallet
 */
const db = require('../config/db');
const { calculateSettlement, processSettlements } = require('../utils/settlement');

// POST /payments — create a payment with method + auto-settlement
// Body: { amount, currency, method, purpose, organization_id?, momo_number?, card_last4?, method_reference? }
exports.create = async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    const {
      amount, currency = 'GHS', method, purpose,
      organization_id, momo_number, card_last4, method_reference,
    } = req.body;

    // Validate required fields
    if (amount == null || !method || !purpose) {
      return res.status(400).json({ error: 'amount, method, and purpose are required' });
    }
    if (!['cash', 'momo', 'card'].includes(method)) {
      return res.status(400).json({ error: 'method must be cash, momo, or card' });
    }
    if (method === 'momo' && !momo_number) {
      return res.status(400).json({ error: 'momo_number is required for mobile money payments' });
    }

    await client.query('BEGIN');

    // 1. Create the payment record
    const payResult = await client.query(
      `INSERT INTO payments
         (owner_id, amount, currency, provider, purpose, status, method,
          organization_id, momo_number, card_last4, method_reference)
       VALUES ($1, $2, $3, $4, $5, 'succeeded', $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        req.user.id, amount, currency,
        method, // provider = method for simplicity
        purpose,
        method,
        organization_id || null,
        momo_number || null,
        card_last4 || null,
        method_reference || null,
      ]
    );
    const payment = payResult.rows[0];

    // 2. Calculate the settlement split
    const settlements = await calculateSettlement({
      purpose,
      amount,
      currency,
      organizationId: organization_id,
    });

    // 3. Process settlements (credits tenant wallets)
    await processSettlements(client, payment.id, settlements);

    await client.query('COMMIT');

    res.status(201).json({
      payment: { ...payment, amount: parseFloat(payment.amount) },
      settlements: settlements.map((s) => ({ ...s, amount: parseFloat(s.amount) })),
      message: 'Payment processed and settled successfully.',
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// POST /payments/charge — legacy one-off visit payment (backward compat)
// Now routes through the new create() with settlement
exports.charge = async (req, res, next) => {
  try {
    const { amount, currency = 'GHS', method = 'cash', organization_id } = req.body;
    if (!['cash', 'momo', 'card'].includes(method)) {
      return res.status(400).json({ error: 'method must be cash, momo, or card' });
    }

    // Delegate to the new create flow
    req.body.purpose = req.body.purpose || 'one_off_visit';
    return exports.create(req, res, next);
  } catch (err) {
    next(err);
  }
};

// GET /payments/methods — list available payment methods (public)
exports.listMethods = async (_req, res) => {
  res.json({
    methods: [
      {
        id: 'cash',
        label: 'Cash',
        description: 'Pay with cash at an authorized agent or office',
        icon: 'banknote',
        requires_reference: true,
      },
      {
        id: 'momo',
        label: 'Mobile Money',
        description: 'Pay via MTN MoMo, Vodafone Cash, or AirtelTigo Money',
        icon: 'smartphone',
        requires_momo_number: true,
      },
      {
        id: 'card',
        label: 'Card',
        description: 'Pay with Visa, Mastercard, or local debit card',
        icon: 'credit-card',
        requires_card_details: true,
      },
    ],
  });
};

// GET /payments/me — owner's payment history
exports.getMyPayments = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT p.id, p.amount, p.currency, p.method, p.purpose, p.status,
              p.method_reference, p.momo_number, p.card_last4,
              p.settled_at, p.created_at,
              o.name AS organization_name
       FROM payments p
       LEFT JOIN organizations o ON o.id = p.organization_id
       WHERE p.owner_id = $1
       ORDER BY p.created_at DESC
       LIMIT 100`,
      [req.user.id]
    );
    res.json(result.rows.map((r) => ({
      ...r,
      amount: parseFloat(r.amount),
      settlements: [], // settlements fetched on detail view
    })));
  } catch (err) {
    next(err);
  }
};

// GET /payments/:id — payment detail with settlements
exports.getPaymentDetail = async (req, res, next) => {
  try {
    const payResult = await db.query(
      `SELECT p.*, o.name AS organization_name
       FROM payments p
       LEFT JOIN organizations o ON o.id = p.organization_id
       WHERE p.id = $1 AND p.owner_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!payResult.rows[0]) return res.status(404).json({ error: 'Payment not found' });

    const settlements = await db.query(
      `SELECT ps.*, o.name AS organization_name
       FROM payment_settlements ps
       LEFT JOIN organizations o ON o.id = ps.organization_id
       WHERE ps.payment_id = $1
       ORDER BY ps.destination, ps.created_at`,
      [req.params.id]
    );

    const payment = payResult.rows[0];
    res.json({
      ...payment,
      amount: parseFloat(payment.amount),
      settlements: settlements.rows.map((s) => ({ ...s, amount: parseFloat(s.amount) })),
    });
  } catch (err) {
    next(err);
  }
};

// POST /payments/webhook — provider calls this to confirm payment success/failure
// (for card/momo provider integrations — cash is confirmed manually)
exports.webhook = async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    // TODO: verify signature using the provider's SDK before trusting this payload
    const { provider_ref, status } = req.body;

    await client.query('BEGIN');

    const payResult = await client.query(
      'SELECT id, amount, currency, purpose, organization_id FROM payments WHERE method_reference = $1',
      [provider_ref]
    );
    const payment = payResult.rows[0];
    if (!payment) {
      await client.query('ROLLBACK');
      return res.status(404).send('payment not found');
    }

    await client.query(
      'UPDATE payments SET status = $1 WHERE id = $2',
      [status, payment.id]
    );

    // If payment succeeded and hasn't been settled yet, process settlements
    if (status === 'succeeded') {
      const settledCheck = await client.query(
        'SELECT settled_at FROM payments WHERE id = $1',
        [payment.id]
      );
      if (!settledCheck.rows[0].settled_at) {
        const settlements = await calculateSettlement({
          purpose: payment.purpose,
          amount: payment.amount,
          currency: payment.currency,
          organizationId: payment.organization_id,
        });
        await processSettlements(client, payment.id, settlements);
      }
    }

    await client.query('COMMIT');
    res.status(200).send('ok');
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};
