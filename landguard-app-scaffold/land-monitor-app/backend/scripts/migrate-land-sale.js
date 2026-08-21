/**
 * Migration: Add land sale marketplace infrastructure
 *   - land_listings: land parcels listed for sale by sellers
 *   - land_purchases: purchase transactions between buyers and sellers
 *   - land_receipts: receipts generated after purchase completion
 *   - land_commissions: 10% platform commission tracking
 *
 * Run: node scripts/migrate-land-sale.js
 */
const { Pool } = require('pg');

const pool = new Pool({
  host: 'aws-0-eu-west-2.pooler.supabase.com',
  port: 5432,
  user: 'postgres.plvtvsavhqaayjspxmst',
  password: 'Echendaa@2024',
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
});

(async () => {
  const client = await pool.connect();
  try {
    await client.query("SET search_path TO earthglobal, public, extensions");
    console.log('Running land sale migration...\n');

    // ── 1. Create land_listings table ──
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS land_listings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

          -- Seller info
          seller_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
          seller_name VARCHAR(255) NOT NULL,
          seller_email VARCHAR(255),
          seller_phone VARCHAR(50),
          seller_type VARCHAR(20) NOT NULL DEFAULT 'seller',
          -- 'seller' = registered just to sell, 'owner' = existing owner offering land

          -- Land details
          parcel_id UUID REFERENCES parcels(id) ON DELETE SET NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          region VARCHAR(255),
          area_sqm DOUBLE PRECISION,
          boundary JSONB,
          centroid_lat DOUBLE PRECISION,
          centroid_lng DOUBLE PRECISION,

          -- Pricing
          price NUMERIC(14, 2) NOT NULL,
          currency VARCHAR(10) NOT NULL DEFAULT 'GHS',
          platform_fee_percent NUMERIC(5, 2) NOT NULL DEFAULT 10.00,
          platform_fee_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
          -- 10% commission on each sale

          -- Validation (auto-query on creation)
          validation_status VARCHAR(30) NOT NULL DEFAULT 'pending',
          -- 'pending', 'validated', 'rejected', 'confirmed'
          validation_result JSONB,
          nearby_hazards JSONB DEFAULT '[]'::jsonb,
          planner_id UUID REFERENCES assembly_users(id) ON DELETE SET NULL,
          planner_name VARCHAR(255),
          validated_at TIMESTAMPTZ,
          confirmed_at TIMESTAMPTZ,
          planner_notes TEXT,

          -- Listing status
          status VARCHAR(30) NOT NULL DEFAULT 'draft',
          -- 'draft', 'pending_review', 'published', 'sold', 'withdrawn', 'rejected'
          published_at TIMESTAMPTZ,

          -- Images
          images JSONB DEFAULT '[]'::jsonb,

          -- Views/interest
          view_count INTEGER DEFAULT 0,
          inquiry_count INTEGER DEFAULT 0,

          -- Metadata
          metadata JSONB,

          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now()
        )
      `);
      console.log('  [OK] land_listings table created');
    } catch (e) { console.log('  [SKIP] listings:', e.message); }

    // ── 2. Create land_purchases table ──
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS land_purchases (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

          -- Listing + parties
          listing_id UUID NOT NULL REFERENCES land_listings(id) ON DELETE CASCADE,
          seller_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
          buyer_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
          buyer_name VARCHAR(255) NOT NULL,
          buyer_email VARCHAR(255),
          buyer_phone VARCHAR(50),
          buyer_address TEXT,

          -- Purchase details
          purchase_price NUMERIC(14, 2) NOT NULL,
          platform_fee_amount NUMERIC(14, 2) NOT NULL,
          platform_fee_paid BOOLEAN NOT NULL DEFAULT false,
          -- If platform fee unpaid, ownership transfer is blocked

          -- Purchase form data
          purchase_form JSONB,
          -- { full_name, id_type, id_number, address, occupation, purpose, financing_method, ... }

          -- Status flow:
          -- 'initiated' -> 'seller_notified' -> 'seller_accepted' -> 'payment_pending' ->
          -- 'payment_confirmed' -> 'receipt_generated' -> 'ownership_transferred' -> 'completed'
          -- OR 'cancelled' / 'rejected' at any stage
          status VARCHAR(40) NOT NULL DEFAULT 'initiated',

          -- Timeline
          initiated_at TIMESTAMPTZ DEFAULT now(),
          seller_notified_at TIMESTAMPTZ,
          seller_accepted_at TIMESTAMPTZ,
          payment_confirmed_at TIMESTAMPTZ,
          receipt_generated_at TIMESTAMPTZ,
          ownership_transferred_at TIMESTAMPTZ,
          completed_at TIMESTAMPTZ,
          cancelled_at TIMESTAMPTZ,

          -- Receipt
          receipt_id UUID,

          -- Notes
          seller_notes TEXT,
          buyer_notes TEXT,
          admin_notes TEXT,

          -- Free monitoring for buyer
          free_monitoring_granted BOOLEAN NOT NULL DEFAULT false,
          free_monitoring_until TIMESTAMPTZ,

          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now()
        )
      `);
      console.log('  [OK] land_purchases table created');
    } catch (e) { console.log('  [SKIP] purchases:', e.message); }

    // ── 3. Create land_receipts table ──
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS land_receipts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          purchase_id UUID NOT NULL REFERENCES land_purchases(id) ON DELETE CASCADE,
          listing_id UUID NOT NULL REFERENCES land_listings(id) ON DELETE CASCADE,

          receipt_number VARCHAR(50) NOT NULL UNIQUE,
          -- Format: REC-YYYYMMDD-XXXX

          -- Parties
          seller_name VARCHAR(255) NOT NULL,
          seller_email VARCHAR(255),
          buyer_name VARCHAR(255) NOT NULL,
          buyer_email VARCHAR(255),

          -- Transaction details
          land_title VARCHAR(255) NOT NULL,
          region VARCHAR(255),
          area_sqm DOUBLE PRECISION,
          purchase_price NUMERIC(14, 2) NOT NULL,
          platform_fee_amount NUMERIC(14, 2) NOT NULL,
          currency VARCHAR(10) NOT NULL DEFAULT 'GHS',

          -- Payment
          payment_method VARCHAR(50),
          payment_reference VARCHAR(255),
          payment_date TIMESTAMPTZ,

          -- Document
          receipt_url TEXT,
          -- Data URL or file path for the PDF receipt

          -- Transfer documents
          transfer_documents JSONB DEFAULT '[]'::jsonb,
          -- Array of document references needed for ownership transfer

          generated_by VARCHAR(255) NOT NULL,
          generated_at TIMESTAMPTZ DEFAULT now(),

          created_at TIMESTAMPTZ DEFAULT now()
        )
      `);
      console.log('  [OK] land_receipts table created');
    } catch (e) { console.log('  [SKIP] receipts:', e.message); }

    // ── 4. Add seller-related columns to owners table ──
    try {
      await client.query(`
        ALTER TABLE owners
          ADD COLUMN IF NOT EXISTS account_type VARCHAR(20) NOT NULL DEFAULT 'owner',
          ADD COLUMN IF NOT EXISTS seller_verified BOOLEAN NOT NULL DEFAULT false,
          ADD COLUMN IF NOT EXISTS total_sales INTEGER NOT NULL DEFAULT 0,
          ADD COLUMN IF NOT EXISTS total_commission_paid NUMERIC(14, 2) NOT NULL DEFAULT 0,
          ADD COLUMN IF NOT EXISTS outstanding_commission NUMERIC(14, 2) NOT NULL DEFAULT 0,
          ADD COLUMN IF NOT EXISTS free_monitoring_until TIMESTAMPTZ
      `);
      console.log('  [OK] Added seller columns to owners table');
    } catch (e) { console.log('  [SKIP] alter owners:', e.message); }

    // ── 5. Indexes ──
    try {
      await client.query('CREATE INDEX IF NOT EXISTS idx_ll_org ON land_listings(organization_id)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_ll_seller ON land_listings(seller_id)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_ll_status ON land_listings(status)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_ll_validation ON land_listings(validation_status)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_ll_location ON land_listings USING GIST (ST_SetSRID(ST_MakePoint(centroid_lng, centroid_lat), 4326))');
      await client.query('CREATE INDEX IF NOT EXISTS idx_lp_org ON land_purchases(organization_id)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_lp_listing ON land_purchases(listing_id)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_lp_buyer ON land_purchases(buyer_id)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_lp_seller ON land_purchases(seller_id)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_lp_status ON land_purchases(status)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_lr_purchase ON land_receipts(purchase_id)');
      console.log('  [OK] Indexes created');
    } catch (e) { console.log('  [SKIP] indexes:', e.message); }

    console.log('\nMigration complete!');
  } catch (err) {
    console.error('Migration error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})();

