const db = require('../config/db');

// POST /payments/charge — one-off visit payment (no subscription credit available)
exports.charge = async (req, res, next) => {
  try {
    const { amount, currency = 'USD', provider = 'stripe' } = req.body;

    // TODO: call the actual provider SDK here (Stripe PaymentIntent / Paystack initialize)
    // and only record as 'succeeded' once the provider confirms.
    const result = await db.query(
      `INSERT INTO payments (owner_id, amount, currency, provider, purpose, status)
       VALUES ($1, $2, $3, $4, 'one_off_visit', 'pending') RETURNING *`,
      [req.user.id, amount, currency, provider]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

// POST /payments/webhook — provider calls this to confirm payment success/failure
exports.webhook = async (req, res, next) => {
  try {
    // TODO: verify signature using the provider's SDK before trusting this payload
    const { provider_ref, status } = req.body;
    await db.query('UPDATE payments SET status = $1 WHERE provider_ref = $2', [status, provider_ref]);
    res.status(200).send('ok');
  } catch (err) {
    next(err);
  }
};
