/**
 * Audit logging middleware — records sensitive actions to the audit_logs table.
 *
 * Usage:
 *   const { auditLog } = require('../middleware/auditLog');
 *   router.post('/transfer-ownership', auditLog('ownership_transfer'), ctrl.transfer);
 *
 * The middleware records AFTER the handler succeeds (status 2xx).
 * If the handler fails, no audit entry is created.
 */
const db = require('../config/db');

// Actions that should be audited
const AUDIT_ACTIONS = {
  LOGIN: 'login',
  LOGOUT: 'logout',
  LISTING_CREATE: 'listing_create',
  LISTING_APPROVE: 'listing_approve',
  LISTING_REJECT: 'listing_reject',
  PURCHASE_INITIATE: 'purchase_initiate',
  PURCHASE_ACCEPT: 'purchase_accept',
  PURCHASE_REJECT: 'purchase_reject',
  PAYMENT_CONFIRM: 'payment_confirm',
  RECEIPT_GENERATE: 'receipt_generate',
  COMMISSION_PAY: 'commission_pay',
  OWNERSHIP_TRANSFER: 'ownership_transfer',
  ADMIN_CREATE: 'admin_create',
  ADMIN_DELETE: 'admin_delete',
  FEE_SETTINGS_UPDATE: 'fee_settings_update',
  SUBSCRIPTION_UPDATE: 'subscription_update',
  PAYOUT_CREATE: 'payout_create',
  USER_APPROVE: 'user_approve',
  USER_REJECT: 'user_reject',
};

function auditLog(action) {
  return async (req, res, next) => {
    // Hook into response finish to only log on success
    const originalSend = res.send.bind(res);
    res.send = function (body) {
      // Only audit on 2xx responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const user = req.user || {};
        const details = {
          method: req.method,
          path: req.originalUrl || req.url,
          ip: req.ip,
          userAgent: req.get('user-agent'),
          body: req.method !== 'GET' ? sanitizeBody(req.body) : undefined,
          params: req.params,
        };
        // Fire-and-forget — don't block the response
        db.query(
          `INSERT INTO earthglobal.audit_logs (user_id, user_role, action, details, ip_address)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT DO NOTHING`,
          [user.id || null, user.role || null, action, JSON.stringify(details), req.ip]
        ).catch((err) => {
          // Silently fail — audit logging should never break the request
          if (process.env.NODE_ENV !== 'production') {
            console.error('[AuditLog] Failed to record:', err.message);
          }
        });
      }
      return originalSend(body);
    };
    next();
  };
}

// Remove sensitive fields from the body before logging
function sanitizeBody(body) {
  if (!body || typeof body !== 'object') return body;
  const sanitized = { ...body };
  delete sanitized.password;
  delete sanitized.password_hash;
  delete sanitized.token;
  delete sanitized.secret;
  delete sanitized.api_key;
  return sanitized;
}

module.exports = { auditLog, AUDIT_ACTIONS };
