/**
 * Parcel Validation Controller — search validation system
 *
 * Flow:
 *   1. Owner/customer submits a validation request with search parameters
 *   2. System auto-fetches matching parcels from the database
 *   3. Planning officer reviews the search results
 *   4. Planner confirms whether the parcel exists, who it belongs to
 *   5. Planner uploads stamp + signature, certifies the report
 *   6. System generates a PDF report with official letterhead + stamp
 *   7. Report + KML + Google Maps link delivered to requester's dashboard
 */
const db = require('../config/db');
const PDFDocument = require('pdfkit');
const { ee, init: initEE } = require('../config/earthEngine');

// ═══════════════════════════════════════════════════════════
// HELPER: Get org_id from authenticated user
// ═══════════════════════════════════════════════════════════
function getOrgId(req) {
  return req.user.organizationId || req.user.organization_id;
}

// ═══════════════════════════════════════════════════════════
// REQUESTER ENDPOINTS (owners / customers)
// ═══════════════════════════════════════════════════════════

// POST /validation/request — submit a new validation request
exports.createValidationRequest = async (req, res, next) => {
  try {
    const {
      search_parcel_name, search_region, search_coordinates,
      search_description, search_document_ref,
      requester_name, requester_email, requester_phone,
    } = req.body;

    if (!requester_name) return res.status(400).json({ error: 'Requester name is required' });
    if (!search_parcel_name && !search_region && !search_coordinates && !search_description) {
      return res.status(400).json({ error: 'At least one search parameter is required' });
    }

    // Determine org: if owner, use their org; otherwise use the first org (external customer)
    let orgId = getOrgId(req);
    if (!orgId) {
      const orgResult = await db.query('SELECT id FROM organizations WHERE active = true ORDER BY created_at LIMIT 1');
      orgId = orgResult.rows[0]?.id;
    }

    const requesterId = req.user.role === 'owner' ? req.user.id : null;

    const result = await db.query(
      `INSERT INTO parcel_validation_requests
         (organization_id, requester_type, requester_id, requester_name, requester_email, requester_phone,
          search_parcel_name, search_region, search_coordinates, search_description, search_document_ref, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending')
       RETURNING id, status, created_at`,
      [
        orgId,
        req.user.role === 'owner' ? 'owner' : 'customer',
        requesterId,
        requester_name,
        requester_email || null,
        requester_phone || null,
        search_parcel_name || null,
        search_region || null,
        search_coordinates ? JSON.stringify(search_coordinates) : null,
        search_description || null,
        search_document_ref || null,
      ]
    );

    res.status(201).json({
      ...result.rows[0],
      message: 'Validation request submitted. A planning officer will review it shortly.',
    });
  } catch (err) { next(err); }
};

// GET /validation/my-requests — list validation requests for the logged-in owner
exports.listMyValidationRequests = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT id, status, search_parcel_name, search_region, search_description,
              parcel_exists, parcel_found_name, parcel_found_owner, parcel_found_area_sqm,
              planner_name, validated_at, certified_at, report_url, kml_url, google_maps_link,
              created_at
       FROM parcel_validation_requests
       WHERE requester_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
};

// GET /validation/my-requests/:id — get details of a specific validation request
exports.getMyValidationRequest = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT * FROM parcel_validation_requests WHERE id = $1 AND requester_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Request not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

// GET /validation/my-requests/:id/report — download the PDF report
exports.downloadMyReport = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT report_url, search_parcel_name FROM parcel_validation_requests
       WHERE id = $1 AND requester_id = $2 AND status = 'certified'`,
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Report not available' });
    if (!result.rows[0].report_url) return res.status(404).json({ error: 'Report not yet generated' });

    // The report_url is a data URL or a path — redirect or serve
    const reportUrl = result.rows[0].report_url;
    if (reportUrl.startsWith('data:')) {
      // It's a base64 data URL stored in DB — convert to buffer
      const base64 = reportUrl.split(',')[1];
      const buffer = Buffer.from(base64, 'base64');
      const filename = `validation_report_${req.params.id}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } else {
      res.redirect(reportUrl);
    }
  } catch (err) { next(err); }
};

// GET /validation/my-requests/:id/kml — download the KML for the validated parcel
exports.downloadMyKML = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT v.kml_url, v.parcel_found_name, v.validated_parcel_id,
              p.boundary
       FROM parcel_validation_requests v
       LEFT JOIN parcels p ON v.validated_parcel_id = p.id
       WHERE v.id = $1 AND v.requester_id = $2 AND v.status = 'certified'`,
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'KML not available' });

    const row = result.rows[0];
    if (row.kml_url && row.kml_url.startsWith('data:')) {
      const base64 = row.kml_url.split(',')[1];
      const buffer = Buffer.from(base64, 'base64');
      res.setHeader('Content-Type', 'application/vnd.google-earth.kml+xml');
      res.setHeader('Content-Disposition', `attachment; filename="${row.parcel_found_name || 'parcel'}.kml"`);
      res.send(buffer);
    } else if (row.boundary) {
      // Generate KML from boundary
      const kml = generateParcelKML(row.boundary, row.parcel_found_name || 'Parcel');
      res.setHeader('Content-Type', 'application/vnd.google-earth.kml+xml');
      res.setHeader('Content-Disposition', `attachment; filename="${row.parcel_found_name || 'parcel'}.kml"`);
      res.send(kml);
    } else {
      res.status(404).json({ error: 'No KML available' });
    }
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════
// PLANNER ENDPOINTS (planning_officer / assembly_admin)
// ═══════════════════════════════════════════════════════════

// GET /validation/planner/requests — list all validation requests for this org
exports.listValidationRequests = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    const { status } = req.query;
    let query = `SELECT * FROM parcel_validation_requests WHERE organization_id = $1`;
    const params = [orgId];
    if (status) { query += ` AND status = $2`; params.push(status); }
    query += ' ORDER BY created_at DESC LIMIT 100';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) { next(err); }
};

// GET /validation/planner/requests/:id — get full details of a validation request
exports.getValidationRequest = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    const result = await db.query(
      `SELECT * FROM parcel_validation_requests WHERE id = $1 AND organization_id = $2`,
      [req.params.id, orgId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Request not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

// POST /validation/planner/search — auto-search the database for matching parcels
// This is the automatic DB fetch that happens when the planner opens a request
exports.searchParcels = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    const { request_id } = req.body;

    // Get the request to know what to search for
    let searchParams = req.body;
    if (request_id) {
      const reqResult = await db.query(
        'SELECT * FROM parcel_validation_requests WHERE id = $1 AND organization_id = $2',
        [request_id, orgId]
      );
      if (!reqResult.rows[0]) return res.status(404).json({ error: 'Request not found' });
      searchParams = reqResult.rows[0];
    }

    const { search_parcel_name, search_region, search_coordinates, search_description } = searchParams;

    // Build search query — match by name (ILIKE), region, or coordinates
    let query = `SELECT id, name, region, area_sqm, survey_date, owner_id, centroid_lat, centroid_lng,
                        ST_AsGeoJSON(boundary) as geojson,
                        (SELECT name FROM owners WHERE id = p.owner_id) as owner_name,
                        (SELECT email FROM owners WHERE id = p.owner_id) as owner_email,
                        (SELECT phone FROM owners WHERE id = p.owner_id) as owner_phone
                 FROM parcels p WHERE p.organization_id = $1`;
    const params = [orgId];
    let conditions = [];
    let paramCount = 1;

    if (search_parcel_name) {
      paramCount++;
      conditions.push(`p.name ILIKE $${paramCount}`);
      params.push(`%${search_parcel_name}%`);
    }
    if (search_region) {
      paramCount++;
      conditions.push(`p.region ILIKE $${paramCount}`);
      params.push(`%${search_region}%`);
    }
    if (search_coordinates) {
      // Search by proximity to coordinates
      const coords = typeof search_coordinates === 'string' ? JSON.parse(search_coordinates) : search_coordinates;
      if (coords.lat && coords.lng) {
        paramCount++;
        conditions.push(`ST_DWithin(p.boundary, ST_SetSRID(ST_MakePoint($${paramCount}, $${paramCount + 1}), 4326)::geography, 1000)`);
        params.push(coords.lng, coords.lat);
        paramCount++; // account for the extra param
      }
    }
    if (search_description && !search_parcel_name) {
      // Search in name as a fallback if description is provided
      paramCount++;
      conditions.push(`p.name ILIKE $${paramCount}`);
      params.push(`%${search_description.substring(0, 50)}%`);
    }

    if (conditions.length > 0) {
      query += ' AND (' + conditions.join(' OR ') + ')';
    }
    query += ' ORDER BY name LIMIT 20';

    const result = await db.query(query, params);

    res.json({
      matches: result.rows.map(row => ({
        ...row,
        geojson: row.geojson ? JSON.parse(row.geojson) : null,
        area_sqm: parseFloat(row.area_sqm) || 0,
      })),
      search_criteria: { search_parcel_name, search_region, search_coordinates, search_description },
      total_matches: result.rows.length,
    });
  } catch (err) { next(err); }
};

// PATCH /validation/planner/requests/:id/validate — planner validates the request
// Sets whether the parcel exists and links to the found parcel
exports.validateRequest = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    const { parcel_exists, validated_parcel_id, planner_notes } = req.body;

    let foundParcel = null;
    if (validated_parcel_id) {
      const parcelResult = await db.query(
        `SELECT p.id, p.name, p.region, p.area_sqm, p.centroid_lat, p.centroid_lng,
                ST_AsGeoJSON(p.boundary) as geojson,
                (SELECT name FROM owners WHERE id = p.owner_id) as owner_name
         FROM parcels p WHERE p.id = $1 AND p.organization_id = $2`,
        [validated_parcel_id, orgId]
      );
      foundParcel = parcelResult.rows[0];
    }

    const result = await db.query(
      `UPDATE parcel_validation_requests SET
         status = 'validated',
         parcel_exists = $1,
         validated_parcel_id = $2,
         parcel_found_name = $3,
         parcel_found_owner = $4,
         parcel_found_region = $5,
         parcel_found_area_sqm = $6,
         parcel_found_coordinates = $7,
         parcel_found_centroid_lat = $8,
         parcel_found_centroid_lng = $9,
         planner_notes = $10,
         planner_id = $11,
         planner_name = $12,
         validated_at = now(),
         updated_at = now()
       WHERE id = $13 AND organization_id = $14
       RETURNING *`,
      [
        parcel_exists,
        validated_parcel_id || null,
        foundParcel?.name || null,
        foundParcel?.owner_name || null,
        foundParcel?.region || null,
        foundParcel ? parseFloat(foundParcel.area_sqm) : null,
        foundParcel?.geojson ? foundParcel.geojson : null,
        foundParcel?.centroid_lat || null,
        foundParcel?.centroid_lng || null,
        planner_notes || null,
        req.user.id,
        req.user.name || req.user.email,
        req.params.id,
        orgId,
      ]
    );

    if (!result.rows[0]) return res.status(404).json({ error: 'Request not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

// POST /validation/planner/stamp — upload planner's stamp + signature
exports.uploadStamp = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    const plannerId = req.user.id;
    const plannerName = req.user.name || req.user.email;
    const { title } = req.body;

    const stampFile = req.files?.stamp ? req.files.stamp[0] : null;
    const signatureFile = req.files?.signature ? req.files.signature[0] : null;

    if (!stampFile && !signatureFile) {
      return res.status(400).json({ error: 'At least one of stamp or signature image is required' });
    }

    // Upsert stamp record
    const result = await db.query(
      `INSERT INTO planner_stamps (organization_id, planner_id, planner_name, title,
                                    stamp_image, stamp_image_type, signature_image, signature_image_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (organization_id, planner_id)
       DO UPDATE SET
         stamp_image = COALESCE(EXCLUDED.stamp_image, planner_stamps.stamp_image),
         stamp_image_type = COALESCE(EXCLUDED.stamp_image_type, planner_stamps.stamp_image_type),
         signature_image = COALESCE(EXCLUDED.signature_image, planner_stamps.signature_image),
         signature_image_type = COALESCE(EXCLUDED.signature_image_type, planner_stamps.signature_image_type),
         title = COALESCE(EXCLUDED.title, planner_stamps.title),
         updated_at = now()
       RETURNING id, planner_name, title, created_at`,
      [
        orgId, plannerId, plannerName, title || null,
        stampFile ? stampFile.buffer : null,
        stampFile ? stampFile.mimetype : null,
        signatureFile ? signatureFile.buffer : null,
        signatureFile ? signatureFile.mimetype : null,
      ]
    );

    res.json({ success: true, stampId: result.rows[0].id, message: 'Stamp and signature saved' });
  } catch (err) { next(err); }
};

// GET /validation/planner/stamp — get planner's stamp info (without binary)
exports.getStamp = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    const result = await db.query(
      `SELECT id, planner_name, title, created_at, updated_at,
              (stamp_image IS NOT NULL) as has_stamp,
              (signature_image IS NOT NULL) as has_signature
       FROM planner_stamps WHERE organization_id = $1 AND planner_id = $2`,
      [orgId, req.user.id]
    );
    res.json(result.rows[0] || { has_stamp: false, has_signature: false });
  } catch (err) { next(err); }
};

// GET /validation/planner/stamp/image/:type — get stamp or signature image
exports.getStampImage = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    const type = req.params.type; // 'stamp' or 'signature'
    const column = type === 'signature' ? 'signature_image' : 'stamp_image';
    const typeColumn = type === 'signature' ? 'signature_image_type' : 'stamp_image_type';

    const result = await db.query(
      `SELECT ${column} as image, ${typeColumn} as mime_type
       FROM planner_stamps WHERE organization_id = $1 AND planner_id = $2`,
      [orgId, req.user.id]
    );
    if (!result.rows[0] || !result.rows[0].image) {
      return res.status(404).json({ error: `${type} not found` });
    }
    res.setHeader('Content-Type', result.rows[0].mime_type || 'image/png');
    res.send(result.rows[0].image);
  } catch (err) { next(err); }
};

// POST /validation/planner/requests/:id/certify — generate PDF report + KML + Google Maps link
exports.certifyRequest = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    const requestId = req.params.id;

    // Get the validation request
    const reqResult = await db.query(
      `SELECT * FROM parcel_validation_requests WHERE id = $1 AND organization_id = $2`,
      [requestId, orgId]
    );
    if (!reqResult.rows[0]) return res.status(404).json({ error: 'Request not found' });
    const validation = reqResult.rows[0];

    if (validation.status !== 'validated') {
      return res.status(400).json({ error: 'Request must be validated before certification' });
    }

    // Get org info for letterhead
    const orgResult = await db.query('SELECT * FROM organizations WHERE id = $1', [orgId]);
    const org = orgResult.rows[0];

    // Get planner's stamp + signature
    const stampResult = await db.query(
      'SELECT stamp_image, stamp_image_type, signature_image, signature_image_type, title FROM planner_stamps WHERE organization_id = $1 AND planner_id = $2',
      [orgId, req.user.id]
    );
    const stamp = stampResult.rows[0];

    // Get parcel boundary if parcel exists
    let parcelBoundary = null;
    if (validation.validated_parcel_id) {
      const parcelResult = await db.query(
        'SELECT ST_AsGeoJSON(boundary) as geojson FROM parcels WHERE id = $1',
        [validation.validated_parcel_id]
      );
      if (parcelResult.rows[0]) {
        parcelBoundary = JSON.parse(parcelResult.rows[0].geojson);
      }
    }

    // Generate PDF report
    const pdfBuffer = await generatePDFReport({
      validation,
      org,
      stamp,
      plannerName: req.user.name || req.user.email,
      parcelBoundary,
    });

    // Generate KML if parcel exists
    let kmlBuffer = null;
    if (parcelBoundary) {
      kmlBuffer = Buffer.from(generateParcelKML(parcelBoundary, validation.parcel_found_name || 'Parcel'));
    }

    // Generate Google Maps link if parcel has centroid
    let googleMapsLink = null;
    if (validation.parcel_found_centroid_lat && validation.parcel_found_centroid_lng) {
      googleMapsLink = `https://www.google.com/maps?q=${validation.parcel_found_centroid_lat},${validation.parcel_found_centroid_lng}&z=16`;
    }

    // Store as data URLs (for simplicity — in production use S3/R2)
    const reportDataUrl = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;
    const kmlDataUrl = kmlBuffer ? `data:application/vnd.google-earth.kml+xml;base64,${kmlBuffer.toString('base64')}` : null;

    // Update request
    const result = await db.query(
      `UPDATE parcel_validation_requests SET
         status = 'certified',
         report_url = $1,
         kml_url = $2,
         google_maps_link = $3,
         stamp_image_url = $4,
         signature_image_url = $5,
         certified_at = now(),
         updated_at = now()
       WHERE id = $6 AND organization_id = $7
       RETURNING id, status, certified_at, google_maps_link`,
      [
        reportDataUrl,
        kmlDataUrl,
        googleMapsLink,
        stamp?.stamp_image ? `data:${stamp.stamp_image_type};base64,${stamp.stamp_image.toString('base64')}` : null,
        stamp?.signature_image ? `data:${stamp.signature_image_type};base64,${stamp.signature_image.toString('base64')}` : null,
        requestId,
        orgId,
      ]
    );

    res.json({
      ...result.rows[0],
      message: 'Report certified and generated. The requester can now download it from their dashboard.',
    });
  } catch (err) {
    console.error('Certification error:', err.message);
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════
// PDF REPORT GENERATION
// ═══════════════════════════════════════════════════════════

async function generatePDFReport({ validation, org, stamp, plannerName, parcelBoundary }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      const pageWidth = doc.page.width;
      const contentWidth = pageWidth - 100;

      // ── Official Letterhead ──
      // Organization name (large, bold, centered)
      doc.fontSize(20).font('Helvetica-Bold');
      doc.text(org.name, { align: 'center' });
      doc.fontSize(11).font('Helvetica');
      doc.text(org.region || '', { align: 'center' });
      if (org.address) doc.text(org.address, { align: 'center' });
      if (org.contact_email || org.contact_phone) {
        doc.text(
          [org.contact_email, org.contact_phone].filter(Boolean).join(' | '),
          { align: 'center' }
        );
      }

      // Horizontal line
      doc.moveDown(0.5);
      const lineY = doc.y;
      doc.moveTo(50, lineY).lineTo(pageWidth - 50, lineY).strokeColor('#1677ff').lineWidth(2).stroke();
      doc.moveDown(1);

      // ── Title ──
      doc.fontSize(16).font('Helvetica-Bold');
      doc.text('PARCEL VALIDATION REPORT', { align: 'center' });
      doc.fontSize(10).font('Helvetica');
      doc.text(`Reference: VR-${validation.id.substring(0, 8).toUpperCase()}`, { align: 'center' });
      doc.text(`Date: ${new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}`, { align: 'center' });
      doc.moveDown(1.5);

      // ── Requester Information ──
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text('Requester Information');
      doc.moveDown(0.3);
      doc.fontSize(10).font('Helvetica');
      doc.text(`Name: ${validation.requester_name}`);
      if (validation.requester_email) doc.text(`Email: ${validation.requester_email}`);
      if (validation.requester_phone) doc.text(`Phone: ${validation.requester_phone}`);
      doc.moveDown(1);

      // ── Search Parameters ──
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text('Search Parameters Provided');
      doc.moveDown(0.3);
      doc.fontSize(10).font('Helvetica');
      if (validation.search_parcel_name) doc.text(`Parcel Name: ${validation.search_parcel_name}`);
      if (validation.search_region) doc.text(`Region: ${validation.search_region}`);
      if (validation.search_description) doc.text(`Description: ${validation.search_description}`);
      if (validation.search_document_ref) doc.text(`Document Reference: ${validation.search_document_ref}`);
      doc.moveDown(1);

      // ── Validation Result ──
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text('Validation Result');
      doc.moveDown(0.3);
      doc.fontSize(10).font('Helvetica');

      if (validation.parcel_exists) {
        doc.fillColor('#16a34a').fontSize(11).font('Helvetica-Bold');
        doc.text('CONFIRMED: The parcel exists in the district assembly records.');
        doc.fillColor('#000').fontSize(10).font('Helvetica');
        doc.moveDown(0.3);
        doc.text(`Parcel Name: ${validation.parcel_found_name || 'N/A'}`);
        doc.text(`Registered Owner: ${validation.parcel_found_owner || 'N/A'}`);
        doc.text(`Region: ${validation.parcel_found_region || 'N/A'}`);
        doc.text(`Area: ${validation.parcel_found_area_sqm ? Math.round(validation.parcel_found_area_sqm).toLocaleString() + ' m²' : 'N/A'}`);
        if (validation.parcel_found_centroid_lat) {
          doc.text(`Coordinates: ${validation.parcel_found_centroid_lat.toFixed(6)}°, ${validation.parcel_found_centroid_lng.toFixed(6)}°`);
        }
        doc.text(`Survey Date: ${validation.parcel_found_name ? 'On record' : 'N/A'}`);
      } else {
        doc.fillColor('#dc2626').fontSize(11).font('Helvetica-Bold');
        doc.text('NOT FOUND: No matching parcel was found in the district assembly records.');
        doc.fillColor('#000').fontSize(10).font('Helvetica');
      }
      doc.moveDown(1);

      // ── Planner Notes ──
      if (validation.planner_notes) {
        doc.fontSize(12).font('Helvetica-Bold');
        doc.text('Planning Officer Notes');
        doc.moveDown(0.3);
        doc.fontSize(10).font('Helvetica');
        doc.text(validation.planner_notes, { width: contentWidth });
        doc.moveDown(1);
      }

      // ── Certification ──
      doc.moveDown(1);
      doc.fontSize(10).font('Helvetica');
      doc.text('This report is certified by the Planning Officer of the above-named District Assembly. The information contained herein is based on official records maintained by the Assembly as of the date of this report.');
      doc.moveDown(2);

      // ── Signature area ──
      const sigY = doc.y;

      // Stamp image (if available)
      if (stamp?.stamp_image) {
        try {
          doc.image(stamp.stamp_image, 50, sigY, { width: 120, height: 120 });
        } catch (e) { /* image format not supported by pdfkit */ }
      }

      // Signature image (if available)
      if (stamp?.signature_image) {
        try {
          doc.image(stamp.signature_image, 200, sigY + 30, { width: 150 });
        } catch (e) { /* image format not supported by pdfkit */ }
      }

      // Signature line + text
      doc.moveTo(200, sigY + 80).lineTo(400, sigY + 80).strokeColor('#000').lineWidth(1).stroke();
      doc.fontSize(10).font('Helvetica');
      doc.text(`Certified by: ${plannerName}`, 200, sigY + 85);
      doc.text('Planning Officer', 200, sigY + 100);
      if (stamp?.title) doc.text(stamp.title, 200, sigY + 115);
      doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, 200, sigY + 130);

      // ── Footer ──
      doc.fontSize(8).font('Helvetica-Oblique');
      doc.fillColor('#666');
      doc.text(
        `This document was generated electronically by the EarthGlobal Land Management System on ${new Date().toISOString()}. ` +
        `Reference: VR-${validation.id.substring(0, 8).toUpperCase()}`,
        50, doc.page.height - 50,
        { align: 'center', width: contentWidth }
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// ═══════════════════════════════════════════════════════════
// KML GENERATION for a single parcel
// ═══════════════════════════════════════════════════════════

function generateParcelKML(geometry, name) {
  let coords = '';
  if (geometry && geometry.type === 'Polygon' && geometry.coordinates) {
    coords = geometry.coordinates[0].map(([lng, lat]) => `${lng},${lat},0`).join(' ');
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escapeXml(name)} — Parcel Validation</name>
    <Style id="parcelStyle">
      <LineStyle><color>ff3ba7ff</color><width>2</width></LineStyle>
      <PolyStyle><color>301677ff</color><fill>1</fill></PolyStyle>
    </Style>
    <Placemark>
      <name>${escapeXml(name)}</name>
      <description>Validated parcel — EarthGlobal Land Management System</description>
      <styleUrl>#parcelStyle</styleUrl>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>${coords}</coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
  </Document>
</kml>`;
}

function escapeXml(s) {
  if (s == null) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
