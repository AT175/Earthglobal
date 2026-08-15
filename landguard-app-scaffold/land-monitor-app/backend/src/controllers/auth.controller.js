const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const db = require('../config/db');

// In-memory OTP store for scaffolding purposes only — replace with Redis or a DB table in production.
const otpStore = new Map();

exports.signup = async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body;
    const passwordHash = password ? await bcrypt.hash(password, 10) : null;
    const result = await db.query(
      `INSERT INTO owners (name, email, phone, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, name, email, phone`,
      [name, email, phone, passwordHash]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

exports.requestOtp = async (req, res, next) => {
  try {
    const { phone } = req.body;
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(phone, { code, expiresAt: Date.now() + 5 * 60 * 1000 });
    // TODO: send via SMS provider (Twilio / Africa's Talking) instead of logging
    console.log(`OTP for ${phone}: ${code}`);
    res.json({ sent: true });
  } catch (err) {
    next(err);
  }
};

exports.verifyOtp = async (req, res, next) => {
  try {
    const { phone, code } = req.body;
    const record = otpStore.get(phone);
    if (!record || record.code !== code || record.expiresAt < Date.now()) {
      return res.status(400).json({ error: 'Invalid or expired code' });
    }
    otpStore.delete(phone);

    const result = await db.query('SELECT id, name, phone FROM owners WHERE phone = $1', [phone]);
    const owner = result.rows[0];
    if (!owner) return res.status(404).json({ error: 'No account found for this phone number' });

    const token = jwt.sign({ id: owner.id, role: 'owner' }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, owner });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await db.query('SELECT * FROM owners WHERE email = $1', [email]);
    const owner = result.rows[0];
    if (!owner || !owner.password_hash) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, owner.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: owner.id, role: 'owner' }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, owner: { id: owner.id, name: owner.name, email: owner.email } });
  } catch (err) {
    next(err);
  }
};
