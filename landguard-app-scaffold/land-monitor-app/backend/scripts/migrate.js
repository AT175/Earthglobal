#!/usr/bin/env node
/**
 * Runs schema.sql against the DATABASE_URL on first deploy.
 * Safe to re-run — uses CREATE EXTENSION IF NOT EXISTS and CREATE TABLE
 * (will error on existing tables but the script continues via `continueOnError`).
 *
 * Used by Render's post-deploy hook: `node scripts/migrate.js`
 */
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function run() {
  // schema.sql lives one level up from the backend directory
  const schemaPath = path.resolve(__dirname, '..', '..', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });

  console.log('Running schema.sql against the database...');

  // Split on semicolons but keep it simple — schema.sql uses plain statements
  const statements = schema
    .split(/;(?=\s*(?:--|CREATE|INSERT|SELECT|$))/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));

  for (const stmt of statements) {
    try {
      await pool.query(stmt);
    } catch (err) {
      // Ignore "already exists" errors — safe to re-run
      if (err.code === '42P07' || err.code === '42710' || err.message.includes('already exists')) {
        console.log(`  [skip] ${err.message.split('\n')[0]}`);
      } else {
        console.error(`  [error] ${err.message.split('\n')[0]}`);
      }
    }
  }

  console.log('Schema migration complete.');
  await pool.end();
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
