/**
 * Migration: Add extended subscription model columns to plans + subscriptions tables
 * + add top_ups table + tenant_wallets + payment_settlements + tenant_payouts
 * + payment_method column on payments
 *
 * Run: node scripts/migrate-subscription-model.js
 */
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

(async () => {
  const client = await pool.connect();
  try {
    await client.query("SET search_path TO earthglobal, public, extensions");
    console.log('Running subscription model migration...\n');

    // ── 1. Add enums ──
    const enums = [
      ["plan_category", "('monitoring', 'search')"],
      ["billing_cycle", "('monthly', 'quarterly', 'yearly')"],
      ["top_up_type", "('extra_parcel', 'extra_search', 'field_visit', 'rush_delivery')"],
      ["top_up_status", "('pending', 'fulfilled', 'cancelled')"],
      ["payment_method", "('cash', 'momo', 'card')"],
      ["settlement_destination", "('system', 'tenant')"],
      ["settlement_status", "('pending', 'settled', 'failed', 'reversed')"],
      ["payout_status", "('pending', 'approved', 'rejected', 'paid', 'failed')"],
      ["payout_method", "('momo', 'bank', 'cash')"],
    ];
    for (const [name, values] of enums) {
      try {
        await client.query(`CREATE TYPE ${name} AS ENUM ${values}`);
        console.log(`  [OK] enum ${name} created`);
      } catch (e) { console.log(`  [SKIP] enum ${name}: ${e.message}`); }
    }

    // ── 2. Add columns to plans table ──
    const planCols = [
      ["category", "plan_category NOT NULL DEFAULT 'monitoring'"],
      ["tier", "VARCHAR(50) NOT NULL DEFAULT 'regular'"],
      ["max_parcels", "INT NOT NULL DEFAULT 5"],
      ["includes_quick_search", "BOOLEAN NOT NULL DEFAULT false"],
      ["includes_validated_search", "BOOLEAN NOT NULL DEFAULT false"],
      ["includes_field_verification", "BOOLEAN NOT NULL DEFAULT false"],
      ["min_delivery_days", "INT"],
      ["max_delivery_days", "INT"],
      ["base_price", "NUMERIC(12, 2)"],
      ["rush_fee_per_day", "NUMERIC(12, 2) DEFAULT 0"],
      ["quarterly_discount", "NUMERIC(3, 2) DEFAULT 0.00"],
      ["yearly_discount", "NUMERIC(3, 2) DEFAULT 0.00"],
      ["is_active", "BOOLEAN NOT NULL DEFAULT true"],
      ["sort_order", "INT NOT NULL DEFAULT 0"],
      ["description", "TEXT"],
    ];
    for (const [col, def] of planCols) {
      try {
        await client.query(`ALTER TABLE plans ADD COLUMN IF NOT EXISTS ${col} ${def}`);
        console.log(`  [OK] plans.${col} added`);
      } catch (e) { console.log(`  [SKIP] plans.${col}: ${e.message}`); }
    }

    // ── 3. Add columns to subscriptions table ──
    const subCols = [
      ["billing_cycle", "billing_cycle"],
      ["delivery_days", "INT"],
      ["price_paid", "NUMERIC(12, 2) DEFAULT 0"],
      ["currency", "VARCHAR(10) NOT NULL DEFAULT 'GHS'"],
      ["parcels_used", "INT NOT NULL DEFAULT 0"],
      ["searches_used", "INT NOT NULL DEFAULT 0"],
      ["expires_at", "TIMESTAMPTZ"],
    ];
    for (const [col, def] of subCols) {
      try {
        await client.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS ${col} ${def}`);
        console.log(`  [OK] subscriptions.${col} added`);
      } catch (e) { console.log(`  [SKIP] subscriptions.${col}: ${e.message}`); }
    }

    // ── 4. Create top_ups table ──
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS top_ups (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
          owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
          type top_up_type NOT NULL,
          quantity INT NOT NULL DEFAULT 1,
          amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
          currency VARCHAR(10) NOT NULL DEFAULT 'GHS',
          status top_up_status NOT NULL DEFAULT 'pending',
          notes TEXT,
          fulfilled_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);
      console.log('  [OK] top_ups table created');
    } catch (e) { console.log(`  [SKIP] top_ups: ${e.message}`); }

    // ── 5. Add payment columns to payments table ──
    const payCols = [
      ["method", "payment_method"],
      ["organization_id", "UUID REFERENCES organizations(id) ON DELETE SET NULL"],
      ["method_reference", "VARCHAR(255)"],
      ["momo_number", "VARCHAR(20)"],
      ["card_last4", "VARCHAR(4)"],
      ["settled_at", "TIMESTAMPTZ"],
    ];
    for (const [col, def] of payCols) {
      try {
        await client.query(`ALTER TABLE payments ADD COLUMN IF NOT EXISTS ${col} ${def}`);
        console.log(`  [OK] payments.${col} added`);
      } catch (e) { console.log(`  [SKIP] payments.${col}: ${e.message}`); }
    }

    // ── 6. Add new payment_purpose enum values ──
    const purposes = ['tenant_billing', 'validated_search', 'field_visit_fee', 'upgrade'];
    for (const p of purposes) {
      try {
        await client.query(`ALTER TYPE payment_purpose ADD VALUE IF NOT EXISTS '${p}'`);
        console.log(`  [OK] payment_purpose: added ${p}`);
      } catch (e) { console.log(`  [SKIP] payment_purpose ${p}: ${e.message}`); }
    }

    // ── 7. Create tenant_wallets table ──
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS tenant_wallets (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
          balance NUMERIC(14, 2) NOT NULL DEFAULT 0,
          total_earned NUMERIC(14, 2) NOT NULL DEFAULT 0,
          total_paid_out NUMERIC(14, 2) NOT NULL DEFAULT 0,
          currency VARCHAR(10) NOT NULL DEFAULT 'GHS',
          payout_momo_number VARCHAR(20),
          payout_bank_name VARCHAR(100),
          payout_bank_account VARCHAR(50),
          payout_account_name VARCHAR(255),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);
      console.log('  [OK] tenant_wallets table created');
    } catch (e) { console.log(`  [SKIP] tenant_wallets: ${e.message}`); }

    // ── 8. Create payment_settlements table ──
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS payment_settlements (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
          organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
          destination settlement_destination NOT NULL,
          amount NUMERIC(14, 2) NOT NULL,
          currency VARCHAR(10) NOT NULL DEFAULT 'GHS',
          description VARCHAR(255),
          status settlement_status NOT NULL DEFAULT 'pending',
          settled_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);
      console.log('  [OK] payment_settlements table created');
    } catch (e) { console.log(`  [SKIP] payment_settlements: ${e.message}`); }

    // ── 9. Create tenant_payouts table ──
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS tenant_payouts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          amount NUMERIC(14, 2) NOT NULL,
          currency VARCHAR(10) NOT NULL DEFAULT 'GHS',
          method payout_method NOT NULL DEFAULT 'momo',
          destination_account VARCHAR(255),
          destination_name VARCHAR(255),
          reference VARCHAR(255),
          notes TEXT,
          status payout_status NOT NULL DEFAULT 'pending',
          requested_by UUID REFERENCES admins(id) ON DELETE SET NULL,
          approved_by UUID REFERENCES admins(id) ON DELETE SET NULL,
          requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          approved_at TIMESTAMPTZ,
          paid_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);
      console.log('  [OK] tenant_payouts table created');
    } catch (e) { console.log(`  [SKIP] tenant_payouts: ${e.message}`); }

    // ── 10. Create indexes ──
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_plans_category ON plans(category)',
      'CREATE INDEX IF NOT EXISTS idx_plans_tier ON plans(tier)',
      'CREATE INDEX IF NOT EXISTS idx_plans_active ON plans(is_active)',
      'CREATE INDEX IF NOT EXISTS idx_payments_method ON payments(method)',
      'CREATE INDEX IF NOT EXISTS idx_payments_org ON payments(organization_id)',
      'CREATE INDEX IF NOT EXISTS idx_payments_purpose ON payments(purpose)',
      'CREATE INDEX IF NOT EXISTS idx_tenant_wallets_org ON tenant_wallets(organization_id)',
      'CREATE INDEX IF NOT EXISTS idx_settlements_payment ON payment_settlements(payment_id)',
      'CREATE INDEX IF NOT EXISTS idx_settlements_org ON payment_settlements(organization_id)',
      'CREATE INDEX IF NOT EXISTS idx_settlements_destination ON payment_settlements(destination)',
      'CREATE INDEX IF NOT EXISTS idx_settlements_status ON payment_settlements(status)',
      'CREATE INDEX IF NOT EXISTS idx_payouts_org ON tenant_payouts(organization_id)',
      'CREATE INDEX IF NOT EXISTS idx_payouts_status ON tenant_payouts(status)',
    ];
    for (const idx of indexes) {
      try { await client.query(idx); } catch (e) {}
    }
    console.log('  [OK] Indexes created');

    // ── 11. Seed default plans ──
    try {
      await client.query(`
        INSERT INTO plans (name, category, tier, period, price, included_visits_per_period, max_parcels,
          includes_quick_search, includes_validated_search, includes_field_verification,
          min_delivery_days, max_delivery_days, base_price, rush_fee_per_day,
          quarterly_discount, yearly_discount, is_active, sort_order, description)
        VALUES
          ('Quick Search', 'search', 'quick_search', 'one_time', 50.00, 0, 5, true, false, false, 3, 5, 50.00, 10.00, 0, 0, true, 1, 'Basic land search — results within 5 working days'),
          ('Validated Search', 'search', 'validated_search', 'one_time', 150.00, 0, 5, true, true, false, 2, 5, 150.00, 30.00, 0, 0, true, 2, 'Assembly-validated land search with official stamp'),
          ('Taboo Search', 'search', 'taboo_search', 'one_time', 300.00, 0, 5, true, true, true, 1, 5, 300.00, 50.00, 0, 0, true, 3, 'Full search with field verification + taboo land check'),
          ('Regular Monitoring', 'monitoring', 'regular', 'monthly', 100.00, 4, 5, false, false, false, NULL, NULL, NULL, 0, 0.10, 0.20, true, 4, 'Monthly satellite monitoring with 4 field visits per year'),
          ('Executive Suite', 'monitoring', 'executive_suite', 'monthly', 250.00, 12, 5, false, true, true, NULL, NULL, NULL, 0, 0.10, 0.20, true, 5, 'Premium monitoring with 12 visits, validated search + field verification'),
          ('Golden Member', 'monitoring', 'golden_member', 'monthly', 500.00, 24, 5, true, true, true, NULL, NULL, NULL, 0, 0.15, 0.25, true, 6, 'Top-tier monitoring with unlimited visits + all search features')
        ON CONFLICT DO NOTHING
      `);
      console.log('  [OK] Default plans seeded');
    } catch (e) { console.log(`  [SKIP] seed plans: ${e.message}`); }

    // ── 12. Add profile columns to user tables ──
    const profileCols = [
      ['owners', 'avatar_url', 'TEXT'],
      ['owners', 'bio', 'TEXT'],
      ['owners', 'address', 'TEXT'],
      ['owners', 'notification_email', 'BOOLEAN DEFAULT true'],
      ['owners', 'notification_sms', 'BOOLEAN DEFAULT false'],
      ['owners', 'notification_push', 'BOOLEAN DEFAULT true'],
      ['agents', 'avatar_url', 'TEXT'],
      ['agents', 'bio', 'TEXT'],
      ['agents', 'address', 'TEXT'],
      ['agents', 'notification_email', 'BOOLEAN DEFAULT true'],
      ['agents', 'notification_push', 'BOOLEAN DEFAULT true'],
      ['admins', 'avatar_url', 'TEXT'],
      ['admins', 'bio', 'TEXT'],
      ['admins', 'phone', 'VARCHAR(50)'],
      ['admins', 'notification_email', 'BOOLEAN DEFAULT true'],
      ['assembly_users', 'avatar_url', 'TEXT'],
      ['assembly_users', 'bio', 'TEXT'],
      ['assembly_users', 'address', 'TEXT'],
      ['assembly_users', 'notification_email', 'BOOLEAN DEFAULT true'],
      ['assembly_users', 'notification_push', 'BOOLEAN DEFAULT true'],
    ];
    for (const [table, col, def] of profileCols) {
      try {
        await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${col} ${def}`);
      } catch (e) {}
    }
    console.log('  [OK] Profile columns added to user tables');

    console.log('\nMigration complete!');
  } catch (err) {
    console.error('Migration error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})();
