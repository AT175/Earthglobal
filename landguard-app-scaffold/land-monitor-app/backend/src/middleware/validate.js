/**
 * Request validation middleware using Zod schemas.
 *
 * Usage:
 *   const { validateBody, schemas } = require('../middleware/validate');
 *   router.post('/login', validateBody(schemas.login), authController.login);
 *
 * If validation fails, returns 400 with the first error message.
 * If validation passes, req.body is replaced with the parsed (and typed) data.
 */
const { z } = require('zod');

// ── Schemas ──
const schemas = {
  login: z.object({
    email: z.string().email('Valid email is required'),
    password: z.string().min(1, 'Password is required'),
  }),

  signup: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Valid email is required'),
    phone: z.string().optional(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    account_type: z.enum(['owner', 'seller']).optional(),
  }),

  createListing: z.object({
    parcel_id: z.string().uuid().optional(),
    title: z.string().min(3, 'Title must be at least 3 characters'),
    description: z.string().optional(),
    price: z.number().positive('Price must be positive'),
    currency: z.string().default('GHS'),
    region: z.string().min(1, 'Region is required'),
    area_sqm: z.number().positive('Area must be positive'),
    images: z.array(z.string()).optional(),
    documents: z.array(z.string()).optional(),
  }),

  initiatePurchase: z.object({
    buyer_name: z.string().min(2, 'Buyer name is required'),
    buyer_phone: z.string().min(5, 'Valid phone number is required'),
    buyer_email: z.string().email('Valid email is required').optional(),
    offer_price: z.number().positive().optional(),
    notes: z.string().optional(),
  }),

  createAdmin: z.object({
    name: z.string().min(2, 'Name is required'),
    email: z.string().email('Valid email is required'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    role: z.enum(['super_admin', 'finance_officer']).default('finance_officer'),
  }),
};

// ── Middleware factory ──
function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const firstError = result.error.issues[0];
      return res.status(400).json({ error: firstError.message });
    }
    // Replace body with parsed + validated data
    req.body = result.data;
    next();
  };
}

function validateParams(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      const firstError = result.error.issues[0];
      return res.status(400).json({ error: firstError.message });
    }
    next();
  };
}

module.exports = { validateBody, validateParams, schemas };
