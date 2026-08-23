/**
 * Land Sale Marketplace Controller
 *
 * Flow:
 *   1. Seller registers (or existing owner offers land for sale)
 *   2. Seller creates a listing with land details
 *   3. System auto-queries the parcel database + nearby hazards
 *   4. Planner reviews and confirms the listing
 *   5. Once confirmed, listing is published on the "Buy a Land" page
 *   6. Buyers browse listings (location only without registration)
 *   7. Registered buyers request details / initiate purchase
 *   8. Seller is notified, accepts/rejects the purchase request
 *   9. On completion, seller generates a receipt (PDF)
 *  10. 10% platform commission is tracked — unpaid commission blocks ownership transfer
 *  11. Buyers get free monitoring subscription after purchase
 */
const db = require('../config/db');
const bus = require('../realtime/eventBus');
const { notifyPurchaseRequest, notifyPaymentConfirmed, notifyOwnershipTransferred } = require('../services/notification.service');
const PDFDocument = require('pdfkit');

function getOrgId(req) {
  return req.user.organizationId || req.user.organization_id;
}

// ═══════════════════════════════════════════════════════════
// SELLER: CREATE LISTING
// ═══════════════════════════════════════════════════════════

// POST /marketplace/listings — seller creates a new land listing
exports.createListing = async (req, res, next) => {
  try {
    const {
      title, description, region, area_sqm, price, currency,
      centroid_lat, centroid_lng, boundary, parcel_id, images,
    } = req.body;

    if (!title || !price) return res.status(400).json({ error: 'Title and price are required' });
    if (!centroid_lat || !centroid_lng) return res.status(400).json({ error: 'Land location (lat/lng) is required' });

    // Get seller info
    const sellerResult = await db.query(
      'SELECT id, name, email, phone, organization_id, account_type FROM owners WHERE id = $1',
      [req.user.id]
    );
    if (!sellerResult.rows[0]) return res.status(404).json({ error: 'Seller not found' });
    const seller = sellerResult.rows[0];

    // Determine org — use seller's org, or first active org
    let orgId = seller.organization_id;
    if (!orgId) {
      const orgResult = await db.query('SELECT id FROM organizations WHERE active = true ORDER BY created_at LIMIT 1');
      orgId = orgResult.rows[0]?.id;
    }

    // Calculate platform fee (10%)
    const platformFeeAmount = parseFloat(price) * 0.10;

    // Auto-query: search for matching parcel in the database
    let validationResult = { searched: false, matches: [], nearby_hazards: [] };
    try {
      // Search parcels by proximity (within 1km of the given coordinates)
      const parcelResult = await db.query(
        `SELECT p.id, p.name, p.region, p.area_sqm, p.survey_date,
                (SELECT name FROM owners WHERE id = p.owner_id) as owner_name,
                ST_Distance(
                  ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography,
                  ST_SetSRID(ST_MakePoint(p.centroid_lng, p.centroid_lat), 4326)::geography
                ) as distance_m
         FROM parcels p
         WHERE p.organization_id = $1
           AND p.centroid_lat IS NOT NULL
           AND ST_DWithin(
                  ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography,
                  ST_SetSRID(ST_MakePoint(p.centroid_lng, p.centroid_lat), 4326)::geography,
                  1000
                )
         ORDER BY distance_m ASC
         LIMIT 5`,
        [orgId, centroid_lng, centroid_lat]
      );

      // Search nearby hazards (within 5km)
      const hazardResult = await db.query(
        `SELECT id, hazard_type, severity, description, area_sqm,
                centroid_lat, centroid_lng, detected_at, status,
                ST_Distance(
                  ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography,
                  ST_SetSRID(ST_MakePoint(centroid_lng, centroid_lat), 4326)::geography
                ) as distance_m
         FROM environmental_hazards
         WHERE organization_id = $1
           AND status IN ('active', 'verified')
           AND ST_DWithin(
                  ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography,
                  ST_SetSRID(ST_MakePoint(centroid_lng, centroid_lat), 4326)::geography,
                  5000
                )
         ORDER BY distance_m ASC
         LIMIT 10`,
        [orgId, centroid_lng, centroid_lat]
      );

      validationResult = {
        searched: true,
        matches: parcelResult.rows.map(r => ({
          ...r,
          distance_m: parseFloat(r.distance_m),
          area_sqm: parseFloat(r.area_sqm) || 0,
        })),
        nearby_hazards: hazardResult.rows.map(r => ({
          ...r,
          distance_m: parseFloat(r.distance_m),
          area_sqm: parseFloat(r.area_sqm) || 0,
          centroid_lat: parseFloat(r.centroid_lat),
          centroid_lng: parseFloat(r.centroid_lng),
        })),
      };
    } catch (e) {
      console.error('Auto-query failed:', e.message);
    }

    // Create the listing
    const result = await db.query(
      `INSERT INTO land_listings
         (organization_id, seller_id, seller_name, seller_email, seller_phone, seller_type,
          parcel_id, title, description, region, area_sqm, boundary, centroid_lat, centroid_lng,
          price, currency, platform_fee_percent, platform_fee_amount,
          validation_status, validation_result, nearby_hazards, status, images)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
               $15, $16, 10.00, $17, 'pending', $18, $19, 'pending_review', $20)
       RETURNING id, title, status, validation_status, platform_fee_amount, created_at`,
      [
        orgId, seller.id, seller.name, seller.email, seller.phone,
        seller.account_type || 'seller',
        parcel_id || null, title, description || null, region || null,
        area_sqm || null, boundary ? JSON.stringify(boundary) : null,
        centroid_lat, centroid_lng,
        price, currency || 'GHS', platformFeeAmount,
        JSON.stringify(validationResult),
        JSON.stringify(validationResult.nearby_hazards),
        JSON.stringify(images || []),
      ]
    );

    // Notify planners via WebSocket that a new listing needs review
    bus.emit('listing:created', {
      orgId,
      listingId: result.rows[0].id,
      title,
      sellerName: seller.name,
    });

    res.status(201).json({
      ...result.rows[0],
      validation_result: validationResult,
      message: 'Listing created. A planning officer will review and confirm it before it goes live.',
    });
  } catch (err) { next(err); }
};

// GET /marketplace/my-listings — seller views their own listings
exports.getMyListings = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT id, title, description, region, area_sqm, price, currency,
              platform_fee_amount, validation_status, validation_result, nearby_hazards,
              planner_name, validated_at, confirmed_at, planner_notes,
              status, published_at, view_count, inquiry_count, images,
              centroid_lat, centroid_lng, created_at, updated_at
       FROM land_listings WHERE seller_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
};

// PATCH /marketplace/listings/:id — seller updates their listing (only if not yet published)
exports.updateListing = async (req, res, next) => {
  try {
    const { title, description, region, area_sqm, price, images } = req.body;
    const updates = [];
    const params = [];
    let pc = 1;

    if (title) { params.push(title); updates.push(`title = $${pc++}`); }
    if (description !== undefined) { params.push(description); updates.push(`description = $${pc++}`); }
    if (region !== undefined) { params.push(region); updates.push(`region = $${pc++}`); }
    if (area_sqm !== undefined) { params.push(area_sqm); updates.push(`area_sqm = $${pc++}`); }
    if (price) {
      params.push(price); updates.push(`price = $${pc++}`);
      params.push(parseFloat(price) * 0.10); updates.push(`platform_fee_amount = $${pc++}`);
    }
    if (images) { params.push(JSON.stringify(images)); updates.push(`images = $${pc++}`); }
    updates.push(`updated_at = now()`);

    params.push(req.params.id, req.user.id);

    const result = await db.query(
      `UPDATE land_listings SET ${updates.join(', ')}
       WHERE id = $${pc++} AND seller_id = $${pc++} AND status IN ('draft', 'pending_review', 'rejected')
       RETURNING *`,
      params
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Listing not found or cannot be edited' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

// DELETE /marketplace/listings/:id — seller withdraws a listing
exports.withdrawListing = async (req, res, next) => {
  try {
    const result = await db.query(
      `UPDATE land_listings SET status = 'withdrawn', updated_at = now()
       WHERE id = $1 AND seller_id = $2 AND status NOT IN ('sold')
       RETURNING id, status`,
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Listing not found or already sold' });
    res.json({ success: true, message: 'Listing withdrawn' });
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════
// PLANNER: REVIEW + CONFIRM LISTINGS
// ═══════════════════════════════════════════════════════════

// GET /marketplace/planner/listings — planner views pending listings
exports.getPlannerListings = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    const { status } = req.query;
    let query = `SELECT * FROM land_listings WHERE organization_id = $1`;
    const params = [orgId];
    if (status) { params.push(status); query += ` AND status = $2`; }
    query += ' ORDER BY created_at DESC LIMIT 100';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) { next(err); }
};

// PATCH /marketplace/planner/listings/:id/confirm — planner confirms a listing
exports.confirmListing = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    const { validation_status, planner_notes, confirmed_parcel_id } = req.body;

    if (!['validated', 'confirmed', 'rejected'].includes(validation_status)) {
      return res.status(400).json({ error: 'Invalid validation status' });
    }

    const newStatus = validation_status === 'confirmed' ? 'published' : validation_status === 'rejected' ? 'rejected' : 'pending_review';

    const result = await db.query(
      `UPDATE land_listings SET
         validation_status = $1,
         planner_notes = $2,
         planner_id = $3,
         planner_name = $4,
         validated_at = now(),
         confirmed_at = ${validation_status === 'confirmed' ? 'now()' : 'confirmed_at'},
         status = $5,
         published_at = ${validation_status === 'confirmed' ? 'now()' : 'published_at'},
         parcel_id = COALESCE($6, parcel_id),
         updated_at = now()
       WHERE id = $7 AND organization_id = $8
       RETURNING *`,
      [
        validation_status, planner_notes || null,
        req.user.id, req.user.name || req.user.email,
        newStatus, confirmed_parcel_id || null,
        req.params.id, orgId,
      ]
    );

    if (!result.rows[0]) return res.status(404).json({ error: 'Listing not found' });

    // Notify seller
    bus.emit('listing:confirmed', {
      orgId,
      listingId: result.rows[0].id,
      sellerId: result.rows[0].seller_id,
      title: result.rows[0].title,
      status: validation_status,
    });

    res.json({
      ...result.rows[0],
      message: validation_status === 'confirmed'
        ? 'Listing confirmed and published on the marketplace.'
        : validation_status === 'rejected'
        ? 'Listing rejected.'
        : 'Listing validated.',
    });
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════
// PUBLIC: BROWSE LISTINGS (no auth required)
// ═══════════════════════════════════════════════════════════

// GET /marketplace/listings — public browse (location only, no seller details)
exports.browseListings = async (req, res, next) => {
  try {
    const { region, min_price, max_price, min_area, max_area } = req.query;
    let query = `SELECT id, title, region, area_sqm, price, currency,
                        centroid_lat, centroid_lng,
                        images, view_count, inquiry_count, published_at
                 FROM land_listings WHERE status = 'published'`;
    const params = [];
    let conditions = [];

    if (region) { params.push(`%${region}%`); conditions.push(`region ILIKE $${params.length}`); }
    if (min_price) { params.push(min_price); conditions.push(`price >= $${params.length}`); }
    if (max_price) { params.push(max_price); conditions.push(`price <= $${params.length}`); }
    if (min_area) { params.push(min_area); conditions.push(`area_sqm >= $${params.length}`); }
    if (max_area) { params.push(max_area); conditions.push(`area_sqm <= $${params.length}`); }

    if (conditions.length > 0) query += ' AND ' + conditions.join(' AND ');
    query += ' ORDER BY published_at DESC LIMIT 100';

    const result = await db.query(query, params);

    // Return limited info — no seller details, no exact boundary
    res.json({
      listings: result.rows.map(r => ({
        id: r.id,
        title: r.title,
        region: r.region,
        area_sqm: r.area_sqm ? parseFloat(r.area_sqm) : null,
        price: parseFloat(r.price),
        currency: r.currency,
        // Approximate location (rounded to 2 decimal places ~1km precision)
        approx_lat: r.centroid_lat ? parseFloat(r.centroid_lat).toFixed(2) : null,
        approx_lng: r.centroid_lng ? parseFloat(r.centroid_lng).toFixed(2) : null,
        images: r.images || [],
        view_count: r.view_count,
        published_at: r.published_at,
      })),
      total: result.rows.length,
    });
  } catch (err) {
    console.error('[browseListings] Error:', err.message, err.code, err.detail);
    next(err);
  }
};

// GET /marketplace/listings/:id — get listing details (requires registration)
exports.getListingDetails = async (req, res, next) => {
  try {
    // Increment view count
    await db.query('UPDATE land_listings SET view_count = view_count + 1 WHERE id = $1 AND status = $2',
      [req.params.id, 'published']);

    const result = await db.query(
      `SELECT id, title, description, region, area_sqm, price, currency,
              platform_fee_amount, centroid_lat, centroid_lng, boundary,
              images, view_count, inquiry_count, published_at,
              nearby_hazards, validation_result,
              seller_name, seller_email, seller_phone
       FROM land_listings WHERE id = $1 AND status = 'published'`,
      [req.params.id]
    );

    if (!result.rows[0]) return res.status(404).json({ error: 'Listing not found or not available' });

    // If user is not authenticated, return limited info
    if (!req.user) {
      const row = result.rows[0];
      return res.json({
        id: row.id,
        title: row.title,
        description: row.description,
        region: row.region,
        area_sqm: row.area_sqm ? parseFloat(row.area_sqm) : null,
        price: parseFloat(row.price),
        currency: row.currency,
        approx_lat: row.centroid_lat ? parseFloat(row.centroid_lat).toFixed(2) : null,
        approx_lng: row.centroid_lng ? parseFloat(row.centroid_lng).toFixed(2) : null,
        images: row.images || [],
        published_at: row.published_at,
        requires_registration: true,
        message: 'Register or log in to see exact location, seller details, and initiate purchase.',
      });
    }

    // Authenticated user — return full details
    const row = result.rows[0];
    res.json({
      ...row,
      area_sqm: row.area_sqm ? parseFloat(row.area_sqm) : null,
      price: parseFloat(row.price),
      platform_fee_amount: parseFloat(row.platform_fee_amount),
      centroid_lat: parseFloat(row.centroid_lat),
      centroid_lng: parseFloat(row.centroid_lng),
      requires_registration: false,
    });
  } catch (err) { next(err); }
};

// POST /marketplace/listings/:id/inquire — registered user requests more details
exports.inquireListing = async (req, res, next) => {
  try {
    const { message, phone } = req.body;
    const listingResult = await db.query(
      'SELECT * FROM land_listings WHERE id = $1 AND status = $2',
      [req.params.id, 'published']
    );
    if (!listingResult.rows[0]) return res.status(404).json({ error: 'Listing not found' });

    const listing = listingResult.rows[0];

    // Increment inquiry count
    await db.query('UPDATE land_listings SET inquiry_count = inquiry_count + 1 WHERE id = $1', [req.params.id]);

    // Notify seller via WebSocket
    bus.emit('listing:inquiry', {
      orgId: listing.organization_id,
      listingId: listing.id,
      sellerId: listing.seller_id,
      listingTitle: listing.title,
      buyerName: req.user.name || req.user.email,
      buyerPhone: phone,
      message: message || 'Interested in this land',
    });

    res.json({ success: true, message: 'Your inquiry has been sent to the seller.' });
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════
// PURCHASE FLOW
// ═══════════════════════════════════════════════════════════

// POST /marketplace/listings/:id/purchase — buyer initiates purchase
exports.initiatePurchase = async (req, res, next) => {
  try {
    const {
      buyer_name, buyer_email, buyer_phone, buyer_address,
      purchase_form,
    } = req.body;

    if (!buyer_name) return res.status(400).json({ error: 'Buyer name is required' });

    const listingResult = await db.query(
      'SELECT * FROM land_listings WHERE id = $1 AND status = $2',
      [req.params.id, 'published']
    );
    if (!listingResult.rows[0]) return res.status(404).json({ error: 'Listing not available' });
    const listing = listingResult.rows[0];

    // Check if there's already an active purchase for this listing
    const existingPurchase = await db.query(
      `SELECT id FROM land_purchases WHERE listing_id = $1 AND status NOT IN ('cancelled', 'rejected', 'completed')`,
      [req.params.id]
    );
    if (existingPurchase.rows[0]) {
      return res.status(409).json({ error: 'A purchase is already in progress for this listing' });
    }

    // Get or create buyer record
    let buyerId = req.user.id;
    if (req.user.role !== 'owner') {
      // If the user is not an owner, create an owner record for them
      const existingOwner = await db.query('SELECT id FROM owners WHERE email = $1', [buyer_email || req.user.email]);
      if (existingOwner.rows[0]) {
        buyerId = existingOwner.rows[0].id;
      } else {
        const newOwner = await db.query(
          'INSERT INTO owners (name, email, phone, approved, account_type, organization_id) VALUES ($1, $2, $3, true, $4, $5) RETURNING id',
          [buyer_name, buyer_email || req.user.email, buyer_phone, 'buyer', listing.organization_id]
        );
        buyerId = newOwner.rows[0].id;
      }
    }

    const result = await db.query(
      `INSERT INTO land_purchases
         (organization_id, listing_id, seller_id, buyer_id, buyer_name, buyer_email, buyer_phone,
          buyer_address, purchase_price, platform_fee_amount, purchase_form, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'initiated')
       RETURNING id, status, initiated_at`,
      [
        listing.organization_id, listing.id, listing.seller_id, buyerId,
        buyer_name, buyer_email || null, buyer_phone || null, buyer_address || null,
        listing.price, listing.platform_fee_amount,
        JSON.stringify(purchase_form || {}),
      ]
    );

    // Update listing status
    await db.query('UPDATE land_listings SET status = $1, updated_at = now() WHERE id = $2',
      ['pending_sale', listing.id]);

    // Notify seller
    bus.emit('purchase:initiated', {
      orgId: listing.organization_id,
      purchaseId: result.rows[0].id,
      sellerId: listing.seller_id,
      listingTitle: listing.title,
      buyerName,
      buyerPhone,
    });

    // Send email/SMS notification to seller
    notifyPurchaseRequest({
      sellerEmail: listing.seller_email,
      sellerPhone: listing.seller_phone,
      listingTitle: listing.title,
      buyerName,
      price: listing.price,
    }).catch(() => {}); // fire-and-forget

    res.status(201).json({
      ...result.rows[0],
      message: 'Purchase initiated. The seller has been notified and will respond shortly.',
    });
  } catch (err) { next(err); }
};

// GET /marketplace/my-purchases — buyer views their purchases
exports.getMyPurchases = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT p.*, l.title as listing_title, l.region, l.area_sqm, l.images,
              l.seller_name, l.seller_email, l.seller_phone
       FROM land_purchases p
       JOIN land_listings l ON p.listing_id = l.id
       WHERE p.buyer_id = $1 ORDER BY p.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
};

// GET /marketplace/my-sales — seller views purchase requests on their listings
exports.getMySales = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT p.*, l.title as listing_title, l.region, l.area_sqm, l.price,
              l.images, l.platform_fee_amount
       FROM land_purchases p
       JOIN land_listings l ON p.listing_id = l.id
       WHERE p.seller_id = $1 ORDER BY p.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
};

// PATCH /marketplace/purchases/:id/accept — seller accepts a purchase request
exports.acceptPurchase = async (req, res, next) => {
  try {
    const result = await db.query(
      `UPDATE land_purchases SET
         status = 'seller_accepted', seller_accepted_at = now(), updated_at = now()
       WHERE id = $1 AND seller_id = $2 AND status = 'initiated'
       RETURNING *`,
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Purchase not found or cannot be accepted' });

    // Notify buyer
    bus.emit('purchase:accepted', {
      orgId: result.rows[0].organization_id,
      purchaseId: result.rows[0].id,
      buyerId: result.rows[0].buyer_id,
    });

    res.json({ success: true, message: 'Purchase accepted. Buyer has been notified.' });
  } catch (err) { next(err); }
};

// PATCH /marketplace/purchases/:id/reject — seller rejects a purchase request
exports.rejectPurchase = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const result = await db.query(
      `UPDATE land_purchases SET status = 'rejected', seller_notes = $1, cancelled_at = now(), updated_at = now()
       WHERE id = $2 AND seller_id = $3 AND status = 'initiated'
       RETURNING listing_id`,
      [reason || null, req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Purchase not found' });

    // Revert listing to published
    await db.query('UPDATE land_listings SET status = $1 WHERE id = $2', ['published', result.rows[0].listing_id]);

    res.json({ success: true, message: 'Purchase rejected. Listing is back on the market.' });
  } catch (err) { next(err); }
};

// PATCH /marketplace/purchases/:id/confirm-payment — seller confirms payment received
exports.confirmPayment = async (req, res, next) => {
  try {
    const { payment_method, payment_reference } = req.body;
    const result = await db.query(
      `UPDATE land_purchases SET
         status = 'payment_confirmed', payment_confirmed_at = now(),
         updated_at = now()
       WHERE id = $1 AND seller_id = $2 AND status = 'seller_accepted'
       RETURNING *`,
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Purchase not found or not in accepted state' });

    // Notify buyer that payment is confirmed
    const purchaseInfo = await db.query(
      `SELECT p.buyer_id, p.listing_id, l.title, l.price, o.email as buyer_email, o.phone as buyer_phone
       FROM land_purchases p
       JOIN land_listings l ON p.listing_id = l.id
       JOIN owners o ON p.buyer_id = o.id
       WHERE p.id = $1`,
      [req.params.id]
    );
    if (purchaseInfo.rows[0]) {
      const pi = purchaseInfo.rows[0];
      notifyPaymentConfirmed({
        buyerEmail: pi.buyer_email,
        buyerPhone: pi.buyer_phone,
        listingTitle: pi.title,
        amount: pi.price,
      }).catch(() => {});
    }

    res.json({ success: true, message: 'Payment confirmed. You can now generate the receipt.' });
  } catch (err) { next(err); }
};

// POST /marketplace/purchases/:id/generate-receipt — seller generates receipt PDF
exports.generateReceipt = async (req, res, next) => {
  try {
    const { payment_method, payment_reference, transfer_documents } = req.body;

    const purchaseResult = await db.query(
      `SELECT p.*, l.title, l.region, l.area_sqm, l.seller_name, l.seller_email,
              l.seller_phone, l.currency
       FROM land_purchases p
       JOIN land_listings l ON p.listing_id = l.id
       WHERE p.id = $1 AND p.seller_id = $2 AND p.status = 'payment_confirmed'`,
      [req.params.id, req.user.id]
    );
    if (!purchaseResult.rows[0]) return res.status(404).json({ error: 'Purchase not found or payment not confirmed' });
    const purchase = purchaseResult.rows[0];

    // Generate receipt number
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    const receiptNumber = `REC-${dateStr}-${randomStr}`;

    // Get org info
    const orgResult = await db.query('SELECT * FROM organizations WHERE id = $1', [purchase.organization_id]);
    const org = orgResult.rows[0];

    // Generate PDF receipt
    const pdfBuffer = await generateReceiptPDF({
      receiptNumber, purchase, org, payment_method, payment_reference,
    });

    const receiptDataUrl = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;

    // Save receipt
    const receiptResult = await db.query(
      `INSERT INTO land_receipts
         (organization_id, purchase_id, listing_id, receipt_number,
          seller_name, seller_email, buyer_name, buyer_email,
          land_title, region, area_sqm, purchase_price, platform_fee_amount, currency,
          payment_method, payment_reference, payment_date,
          receipt_url, transfer_documents, generated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
               $15, $16, now(), $17, $18, $19)
       RETURNING id, receipt_number`,
      [
        purchase.organization_id, purchase.id, purchase.listing_id, receiptNumber,
        purchase.seller_name, purchase.seller_email,
        purchase.buyer_name, purchase.buyer_email,
        purchase.title, purchase.region, purchase.area_sqm,
        purchase.purchase_price, purchase.platform_fee_amount, purchase.currency,
        payment_method || 'bank_transfer', payment_reference || null,
        receiptDataUrl,
        JSON.stringify(transfer_documents || []),
        req.user.name || req.user.email,
      ]
    );

    // Update purchase status
    await db.query(
      `UPDATE land_purchases SET
         status = 'receipt_generated', receipt_id = $1, receipt_generated_at = now(),
         updated_at = now()
       WHERE id = $2`,
      [receiptResult.rows[0].id, purchase.id]
    );

    // Update seller's commission tracking (outstanding commission increases)
    await db.query(
      `UPDATE owners SET
         outstanding_commission = outstanding_commission + $1,
         total_sales = total_sales + 1
       WHERE id = $2`,
      [purchase.platform_fee_amount, purchase.seller_id]
    );

    // Grant free monitoring to buyer (1 year)
    const freeMonitoringUntil = new Date();
    freeMonitoringUntil.setFullYear(freeMonitoringUntil.getFullYear() + 1);
    await db.query(
      `UPDATE owners SET free_monitoring_until = $1 WHERE id = $2`,
      [freeMonitoringUntil, purchase.buyer_id]
    );
    await db.query(
      `UPDATE land_purchases SET free_monitoring_granted = true, free_monitoring_until = $1 WHERE id = $2`,
      [freeMonitoringUntil, purchase.id]
    );

    // Notify buyer
    bus.emit('purchase:receipt', {
      orgId: purchase.organization_id,
      purchaseId: purchase.id,
      buyerId: purchase.buyer_id,
      receiptNumber,
    });

    res.json({
      receipt_id: receiptResult.rows[0].id,
      receipt_number: receiptNumber,
      message: 'Receipt generated and sent to buyer. 10% platform commission is now due.',
    });
  } catch (err) {
    console.error('Receipt generation error:', err.message);
    next(err);
  }
};

// POST /marketplace/purchases/:id/pay-commission — seller pays the 10% commission
exports.payCommission = async (req, res, next) => {
  try {
    const { payment_reference } = req.body;

    const purchaseResult = await db.query(
      `SELECT p.*, l.title FROM land_purchases p
       JOIN land_listings l ON p.listing_id = l.id
       WHERE p.id = $1 AND p.seller_id = $2 AND p.status = 'receipt_generated'`,
      [req.params.id, req.user.id]
    );
    if (!purchaseResult.rows[0]) return res.status(404).json({ error: 'Purchase not found or receipt not generated' });
    const purchase = purchaseResult.rows[0];

    // Mark commission as paid
    await db.query(
      `UPDATE land_purchases SET platform_fee_paid = true, updated_at = now() WHERE id = $1`,
      [purchase.id]
    );

    // Update seller's commission tracking
    await db.query(
      `UPDATE owners SET
         outstanding_commission = GREATEST(outstanding_commission - $1, 0),
         total_commission_paid = total_commission_paid + $1
       WHERE id = $2`,
      [purchase.platform_fee_amount, purchase.seller_id]
    );

    // Record payment
    await db.query(
      `INSERT INTO payments (owner_id, amount, currency, provider, purpose, status, provider_ref)
       VALUES ($1, $2, $3, 'manual', 'land_sale', 'succeeded', $4)`,
      [purchase.seller_id, purchase.platform_fee_amount, purchase.currency, payment_reference || null]
    );

    // Complete the purchase
    await db.query(
      `UPDATE land_purchases SET status = 'completed', completed_at = now(), updated_at = now() WHERE id = $1`,
      [purchase.id]
    );
    await db.query(
      `UPDATE land_listings SET status = 'sold', updated_at = now() WHERE id = $1`,
      [purchase.listing_id]
    );

    res.json({
      success: true,
      message: 'Commission paid. Ownership can now be transferred. Purchase completed!',
    });
  } catch (err) { next(err); }
};

// POST /marketplace/purchases/:id/transfer-ownership — transfer ownership (blocked if commission unpaid)
exports.transferOwnership = async (req, res, next) => {
  try {
    const purchaseResult = await db.query(
      `SELECT p.*, l.parcel_id, l.title FROM land_purchases p
       JOIN land_listings l ON p.listing_id = l.id
       WHERE p.id = $1 AND p.seller_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!purchaseResult.rows[0]) return res.status(404).json({ error: 'Purchase not found' });
    const purchase = purchaseResult.rows[0];

    // BLOCK if commission unpaid
    if (!purchase.platform_fee_paid) {
      return res.status(403).json({
        error: 'Ownership transfer blocked. The 10% platform commission must be paid first.',
        outstanding_amount: purchase.platform_fee_amount,
      });
    }

    if (purchase.parcel_id) {
      // Transfer the parcel ownership in the database
      await db.query(
        'UPDATE parcels SET owner_id = $1, transfer_history = transfer_history || $2::jsonb WHERE id = $3',
        [
          purchase.buyer_id,
          JSON.stringify({
            date: new Date().toISOString(),
            from_owner: purchase.seller_id,
            to_owner: purchase.buyer_id,
            via: 'marketplace',
            purchase_id: purchase.id,
          }),
        ]
      );
    }

    await db.query(
      `UPDATE land_purchases SET status = 'ownership_transferred', ownership_transferred_at = now(), updated_at = now()
       WHERE id = $1`,
      [purchase.id]
    );

    // Notify buyer that ownership has been transferred
    const buyerInfo = await db.query(
      'SELECT email, phone FROM owners WHERE id = $1',
      [purchase.buyer_id]
    );
    if (buyerInfo.rows[0]) {
      notifyOwnershipTransferred({
        buyerEmail: buyerInfo.rows[0].email,
        buyerPhone: buyerInfo.rows[0].phone,
        listingTitle: purchase.title,
      }).catch(() => {});
    }

    res.json({ success: true, message: 'Ownership transferred successfully.' });
  } catch (err) { next(err); }
};

// GET /marketplace/receipts/:id — download receipt PDF
exports.downloadReceipt = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT r.*, p.buyer_id, p.seller_id
       FROM land_receipts r
       JOIN land_purchases p ON r.purchase_id = p.id
       WHERE r.id = $1 AND (p.buyer_id = $2 OR p.seller_id = $2)`,
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Receipt not found' });

    const receipt = result.rows[0];
    if (!receipt.receipt_url) return res.status(404).json({ error: 'Receipt not available' });

    if (receipt.receipt_url.startsWith('data:')) {
      const base64 = receipt.receipt_url.split(',')[1];
      const buffer = Buffer.from(base64, 'base64');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${receipt.receipt_number}.pdf"`);
      res.send(buffer);
    } else {
      res.redirect(receipt.receipt_url);
    }
  } catch (err) { next(err); }
};

// GET /marketplace/my-receipts — buyer/seller views their receipts
exports.getMyReceipts = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT r.id, r.receipt_number, r.land_title, r.seller_name, r.buyer_name,
              r.purchase_price, r.platform_fee_amount, r.currency,
              r.payment_method, r.generated_at
       FROM land_receipts r
       JOIN land_purchases p ON r.purchase_id = p.id
       WHERE p.buyer_id = $1 OR p.seller_id = $1
       ORDER BY r.generated_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
};

// GET /marketplace/seller/stats — seller dashboard stats
exports.getSellerStats = async (req, res, next) => {
  try {
    const [listings, sales, commission] = await Promise.all([
      db.query(
        `SELECT status, COUNT(*) as count FROM land_listings WHERE seller_id = $1 GROUP BY status`,
        [req.user.id]
      ),
      db.query(
        `SELECT status, COUNT(*) as count FROM land_purchases WHERE seller_id = $1 GROUP BY status`,
        [req.user.id]
      ),
      db.query(
        `SELECT total_sales, total_commission_paid, outstanding_commission, seller_verified FROM owners WHERE id = $1`,
        [req.user.id]
      ),
    ]);

    res.json({
      listings_by_status: listings.rows.map(r => ({ ...r, count: parseInt(r.count) })),
      sales_by_status: sales.rows.map(r => ({ ...r, count: parseInt(r.count) })),
      commission: commission.rows[0] || { total_sales: 0, total_commission_paid: 0, outstanding_commission: 0 },
    });
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════
// PDF RECEIPT GENERATION
// ═══════════════════════════════════════════════════════════

async function generateReceiptPDF({ receiptNumber, purchase, org, payment_method, payment_reference }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      const pageWidth = doc.page.width;
      const contentWidth = pageWidth - 100;

      // ── Letterhead ──
      doc.fontSize(20).font('Helvetica-Bold');
      doc.text(org?.name || 'EarthGlobal Land Management', { align: 'center' });
      doc.fontSize(10).font('Helvetica');
      if (org?.region) doc.text(org.region, { align: 'center' });
      doc.text('LAND SALE RECEIPT', { align: 'center' });
      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(pageWidth - 50, doc.y).strokeColor('#1677ff').lineWidth(2).stroke();
      doc.moveDown(1);

      // ── Receipt Info ──
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text(`Receipt No: ${receiptNumber}`, { align: 'right' });
      doc.fontSize(10).font('Helvetica');
      doc.text(`Date: ${new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}`, { align: 'right' });
      doc.moveDown(1);

      // ── Parties ──
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text('Seller');
      doc.fontSize(10).font('Helvetica');
      doc.text(`Name: ${purchase.seller_name}`);
      if (purchase.seller_email) doc.text(`Email: ${purchase.seller_email}`);
      doc.moveDown(0.5);

      doc.fontSize(12).font('Helvetica-Bold');
      doc.text('Buyer');
      doc.fontSize(10).font('Helvetica');
      doc.text(`Name: ${purchase.buyer_name}`);
      if (purchase.buyer_email) doc.text(`Email: ${purchase.buyer_email}`);
      if (purchase.buyer_phone) doc.text(`Phone: ${purchase.buyer_phone}`);
      if (purchase.buyer_address) doc.text(`Address: ${purchase.buyer_address}`);
      doc.moveDown(1);

      // ── Land Details ──
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text('Land Details');
      doc.fontSize(10).font('Helvetica');
      doc.text(`Title: ${purchase.title}`);
      if (purchase.region) doc.text(`Region: ${purchase.region}`);
      if (purchase.area_sqm) doc.text(`Area: ${Math.round(parseFloat(purchase.area_sqm)).toLocaleString()} m² (${(parseFloat(purchase.area_sqm) / 10000).toFixed(2)} hectares)`);
      doc.moveDown(1);

      // ── Payment Details ──
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text('Payment Details');
      doc.fontSize(10).font('Helvetica');
      doc.text(`Purchase Price: ${purchase.currency} ${parseFloat(purchase.purchase_price).toLocaleString()}`);
      doc.text(`Platform Commission (10%): ${purchase.currency} ${parseFloat(purchase.platform_fee_amount).toLocaleString()}`);
      doc.text(`Payment Method: ${payment_method || 'Bank Transfer'}`);
      if (payment_reference) doc.text(`Payment Reference: ${payment_reference}`);
      doc.moveDown(1);

      // ── Transfer Documents ──
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text('Documents for Ownership Transfer');
      doc.fontSize(10).font('Helvetica');
      doc.text('This receipt, together with the following documents, should be used for the transfer of ownership:');
      doc.moveDown(0.3);
      doc.text('1. This receipt (proof of purchase)');
      doc.text('2. Original land title / indenture');
      doc.text('3. Site plan / survey map');
      doc.text('4. Identification documents of both parties');
      doc.text('5. Stamp duty payment receipt');
      doc.moveDown(1);

      // ── Free Monitoring Notice ──
      doc.fillColor('#16a34a').fontSize(10).font('Helvetica-Bold');
      doc.text('FREE LAND MONITORING INCLUDED', { align: 'center' });
      doc.fillColor('#000').fontSize(9).font('Helvetica');
      doc.text('As a buyer through the EarthGlobal platform, you receive 1 year of free satellite-based land monitoring. You will be alerted to any unauthorized changes to your land.', { align: 'center' });
      doc.moveDown(1);

      // ── Signature ──
      doc.moveTo(50, doc.y + 20).lineTo(250, doc.y + 20).strokeColor('#000').lineWidth(1).stroke();
      doc.fontSize(10).font('Helvetica');
      doc.text(`Seller Signature: ${purchase.seller_name}`, 50, doc.y + 25);
      doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, 50, doc.y + 40);

      // ── Footer ──
      doc.fontSize(8).font('Helvetica-Oblique');
      doc.fillColor('#666');
      doc.text(
        `This receipt was generated electronically by the EarthGlobal Land Management System. Receipt: ${receiptNumber}`,
        50, doc.page.height - 50, { align: 'center', width: contentWidth }
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
