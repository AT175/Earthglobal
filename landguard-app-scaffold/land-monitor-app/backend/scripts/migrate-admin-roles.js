/**
 * Migration: Add `role` column to the admins table to support sub-roles.
 *
 *   - super_admin     → full platform access (can create/delete other admins)
 *   - finance_officer → finance dashboard only (cannot create/delete admins)
 *
 * Run: node scripts/migrate-admin-roles.js
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
    console.log('Running admin roles migration...\n');

    // 1. Add the role column with a default of 'super_admin' so existing admins
    //    keep full access (matches the auth middleware fallback).
    await client.query(`
      ALTER TABLE earthglobal.admins
      ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'super_admin'
    `);
    console.log("✓ Added 'role' column to admins (default: super_admin)");

    // 2. Backfill any NULLs just in case.
    await client.query(`
      UPDATE earthglobal.admins SET role = 'super_admin' WHERE role IS NULL
    `);

    // 3. Verify
    const res = await client.query(
      'SELECT id, email, role FROM earthglobal.admins ORDER BY created_at'
    );
    console.log('\nCurrent admins:');
    for (const row of res.rows) {
      console.log(`  • ${row.email} → ${row.role}`);
    }

    console.log('\nMigration complete.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
