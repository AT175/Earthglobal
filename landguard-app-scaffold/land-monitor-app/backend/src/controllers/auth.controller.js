const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const db = require('../config/db');
const { validatePassword, checkLockout, recordFailedLogin, recordSuccessfulLogin } = require('../middleware/security');
const { sendSMS, sendEmail } = require('../services/notification.service');

// In-memory OTP store for scaffolding purposes only — replace with Redis or a DB table in production.
const otpStore = new Map();

// ── Helper: find user across owners, agents, admins, assembly_users ──
async function findUserByEmail(email) {
  // Check owners
  let result = await db.query('SELECT id, name, email, phone, password_hash, approved, is_sales_manager, account_type FROM owners WHERE email = $1', [email]);
  if (result.rows[0]) return { ...result.rows[0], role: 'owner' };

  // Check agents
  result = await db.query('SELECT id, name, email, phone, password_hash, active FROM agents WHERE email = $1', [email]);
  if (result.rows[0]) return { ...result.rows[0], role: 'agent' };

  // Check admins (role: 'super_admin' | 'finance_officer')
  result = await db.query('SELECT id, name, email, password_hash, role as admin_role FROM admins WHERE email = $1', [email]);
  if (result.rows[0]) return { ...result.rows[0], role: 'admin' };

  // Check assembly users
  result = await db.query('SELECT id, name, email, phone, password_hash, active, organization_id, role as assembly_role FROM assembly_users WHERE email = $1', [email]);
  if (result.rows[0]) return { ...result.rows[0], role: 'assembly' };

  return null;
}

exports.signup = async (req, res, next) => {
  try {
    const { name, email, phone, password, account_type } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, and password are required' });

    // Password complexity check
    const pwError = validatePassword(password);
    if (pwError) return res.status(400).json({ error: pwError });

    const passwordHash = await bcrypt.hash(password, 10);

    // Check if email already exists in any table
    const existing = await findUserByEmail(email);
    if (existing) return res.status(409).json({ error: 'An account with this email already exists' });

    // account_type: 'owner' (default), 'seller' (land sale marketplace), or 'sales_manager' (universal land sales professional)
    const validTypes = ['owner', 'seller', 'sales_manager'];
    const acctType = validTypes.includes(account_type) ? account_type : 'owner';
    const isSalesManager = acctType === 'sales_manager';

    // Sales managers get auto-approved (free registration); others require admin approval
    const approved = isSalesManager;

    const result = await db.query(
      `INSERT INTO owners (name, email, phone, password_hash, approved, account_type, is_sales_manager) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, name, email, phone, account_type, is_sales_manager`,
      [name, email, phone, passwordHash, approved, acctType, isSalesManager]
    );

    const owner = result.rows[0];

    if (isSalesManager) {
      // Auto-login for sales managers — no admin approval needed
      const token = jwt.sign(
        { id: owner.id, role: 'owner', accountType: 'sales_manager', isSalesManager: true },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
      );
      return res.status(201).json({
        success: true,
        message: 'Sales Manager account created successfully. You can now log in.',
        token,
        owner: { id: owner.id, name: owner.name, email: owner.email, phone: owner.phone, account_type: owner.account_type, is_sales_manager: true },
        role: 'owner',
      });
    }

    // Don't return a token — account must be approved by admin first
    res.status(201).json({
      success: true,
      message: account_type === 'seller'
        ? 'Seller account created successfully. An administrator must approve your account before you can list land for sale.'
        : 'Account created successfully. An administrator must approve your account before you can log in.',
      owner: { id: owner.id, name: owner.name, email: owner.email, phone: owner.phone, account_type: owner.account_type },
    });
  } catch (err) {
    next(err);
  }
};

exports.requestOtp = async (req, res, next) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number is required' });
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(phone, { code, expiresAt: Date.now() + 5 * 60 * 1000 });
    // Send via Twilio (gracefully degrades to console.log if not configured)
    await sendSMS({ to: phone, body: `Your EarthGlobal verification code is: ${code}. It expires in 5 minutes.` });
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
    res.json({ token, owner, role: 'owner' });
  } catch (err) {
    next(err);
  }
};

// ── Unified login — auto-detects role from the database ──
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Check account lockout
    const lockout = checkLockout(email);
    if (lockout.locked) {
      return res.status(429).json({
        error: `Account temporarily locked. Try again in ${lockout.retryAfter} seconds.`,
      });
    }

    // Find user across all role tables
    const user = await findUserByEmail(email);
    if (!user || !user.password_hash) {
      recordFailedLogin(email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check if agent is active
    if (user.role === 'agent' && user.active === false) {
      return res.status(403).json({ error: 'Your agent account has been deactivated. Contact an administrator.' });
    }

    // Check if assembly user is active
    if (user.role === 'assembly' && user.active === false) {
      return res.status(403).json({ error: 'Your assembly account has been deactivated. Contact your administrator.' });
    }

    // Check if owner is approved (sales managers are auto-approved)
    if (user.role === 'owner' && user.approved === false && !user.is_sales_manager) {
      return res.status(403).json({ error: 'Your account is pending administrator approval. Please check back later.' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      recordFailedLogin(email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Clear failed attempts on successful login
    recordSuccessfulLogin(email);

    // Check for sales_manager flag on owner accounts
    let isSalesManager = false;
    let accountType = null;
    if (user.role === 'owner') {
      const smResult = await db.query('SELECT is_sales_manager, account_type FROM owners WHERE id = $1', [user.id]);
      if (smResult.rows[0]) {
        isSalesManager = smResult.rows[0].is_sales_manager;
        accountType = smResult.rows[0].account_type;
      }
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, organizationId: user.organization_id, assemblyRole: user.assembly_role, adminRole: user.admin_role, isSalesManager, accountType },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Return user info + role — frontend auto-routes based on role
    const userInfo = { id: user.id, name: user.name, email: user.email };
    if (user.phone) userInfo.phone = user.phone;
    if (user.region) userInfo.region = user.region;
    if (user.organization_id) userInfo.organizationId = user.organization_id;
    if (user.assembly_role) userInfo.assemblyRole = user.assembly_role;
    if (user.admin_role) userInfo.adminRole = user.admin_role;
    if (isSalesManager) { userInfo.isSalesManager = true; userInfo.accountType = accountType; }

    res.json({ token, owner: userInfo, role: user.role });
  } catch (err) {
    next(err);
  }
};
