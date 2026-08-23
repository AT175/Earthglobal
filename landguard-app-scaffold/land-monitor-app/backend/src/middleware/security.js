/**
 * Security middleware: rate limiting, password validation, account lockout
 */
const rateLimit = require('express-rate-limit');

// ── Login rate limiter ──
// 5 attempts per 15 minutes per IP. Prevents brute-force attacks.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  skipSuccessfulRequests: true, // only count failed attempts
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── General API rate limiter ──
// 100 requests per minute per IP
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Password complexity validation ──
// Minimum: 8 chars, at least one letter and one number
function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return 'Password is required';
  }
  if (password.length < 8) {
    return 'Password must be at least 8 characters long';
  }
  if (!/[a-zA-Z]/.test(password)) {
    return 'Password must contain at least one letter';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number';
  }
  return null; // valid
}

// ── Account lockout (in-memory, per-email) ──
// In production, replace with Redis for multi-instance support.
const lockoutStore = new Map();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

function checkLockout(email) {
  const record = lockoutStore.get(email);
  if (!record) return { locked: false };
  if (record.lockedUntil && record.lockedUntil > Date.now()) {
    return {
      locked: true,
      retryAfter: Math.ceil((record.lockedUntil - Date.now()) / 1000),
    };
  }
  return { locked: false };
}

function recordFailedLogin(email) {
  const record = lockoutStore.get(email) || { attempts: 0, lockedUntil: null };
  record.attempts += 1;
  if (record.attempts >= MAX_FAILED_ATTEMPTS) {
    record.lockedUntil = Date.now() + LOCKOUT_DURATION;
    record.attempts = 0;
  }
  lockoutStore.set(email, record);
}

function recordSuccessfulLogin(email) {
  lockoutStore.delete(email);
}

module.exports = {
  loginLimiter,
  apiLimiter,
  validatePassword,
  checkLockout,
  recordFailedLogin,
  recordSuccessfulLogin,
};
