/**
 * Settlement Utility
 *
 * Determines how a payment is split between the system (platform finance)
 * and the tenant (assembly organization) based on the payment purpose.
 *
 * HIERARCHICAL PAYMENT RULES:
 *   - subscription  → 100% to system
 *   - upgrade       → 100% to system
 *   - search        → 100% to system (quick search is a platform feature)
 *   - validated_search → system gets platform_fee %, tenant gets the rest
 *   - field_visit_fee  → system gets platform_fee %, tenant gets the rest
 *   - tenant_billing   → 100% to system (tenant pays the platform for using EarthGlobal)
 *   - land_sale        → system gets commission %, seller gets the rest (handled separately)
 *   - one_off_visit    → system gets platform_fee %, tenant gets the rest (if org-scoped)
 *   - top_up           → 100% to system
 */
const db = require('../config/db');

// ── Get the current platform fee settings ──
async function getPlatformSettings() {
  const result = await db.query('SELECT * FROM platform_fee_settings WHERE id = $1', ['default']);
  return result.rows[0] || { land_sale_commission_percent: 10, default_currency: 'GHS' };
}

// ── Get tenant billing config (may have commission override) ──
async function getTenantBilling(orgId) {
  if (!orgId) return null;
  const result = await db.query('SELECT * FROM tenant_billing WHERE organization_id = $1', [orgId]);
  return result.rows[0] || null;
}

/**
 * Calculate the settlement split for a payment.
 * Returns an array of { destination, amount, description } entries.
 *
 * @param {Object} params - { purpose, amount, currency, organizationId, planCategory }
 */
async function calculateSettlement({ purpose, amount, currency = 'GHS', organizationId, planCategory }) {
  const settings = await getPlatformSettings();
  const tenantBilling = await getTenantBilling(organizationId);
  const commissionPercent = tenantBilling?.commission_override_percent != null
    ? parseFloat(tenantBilling.commission_override_percent)
    : parseFloat(settings.land_sale_commission_percent);

  const settlements = [];
  const amt = parseFloat(amount);

  switch (purpose) {
    // ── 100% to system ──
    case 'subscription':
    case 'upgrade':
    case 'top_up':
    case 'tenant_billing':
      settlements.push({
        destination: 'system',
        amount: amt,
        description: `Platform ${purpose.replace(/_/g, ' ')} fee`,
      });
      break;

    // ── Search plans: 100% to system (platform feature) ──
    case 'search':
      settlements.push({
        destination: 'system',
        amount: amt,
        description: 'Land search subscription',
      });
      break;

    // ── Validated search: tenant does the work, gets most of the fee ──
    // System takes commission %, tenant gets the rest
    case 'validated_search':
      if (organizationId) {
        const systemShare = amt * (commissionPercent / 100);
        const tenantShare = amt - systemShare;
        settlements.push({
          destination: 'system',
          amount: parseFloat(systemShare.toFixed(2)),
          description: `Platform commission (${commissionPercent}%) on validated search`,
        });
        settlements.push({
          destination: 'tenant',
          amount: parseFloat(tenantShare.toFixed(2)),
          organizationId,
          description: `Tenant share of validated search fee`,
        });
      } else {
        // No org — all to system
        settlements.push({ destination: 'system', amount: amt, description: 'Validated search fee (no tenant)' });
      }
      break;

    // ── Field visit fee: tenant's agent does the visit ──
    // System takes commission %, tenant gets the rest
    case 'field_visit_fee':
      if (organizationId) {
        const systemShare = amt * (commissionPercent / 100);
        const tenantShare = amt - systemShare;
        settlements.push({
          destination: 'system',
          amount: parseFloat(systemShare.toFixed(2)),
          description: `Platform commission (${commissionPercent}%) on field visit`,
        });
        settlements.push({
          destination: 'tenant',
          amount: parseFloat(tenantShare.toFixed(2)),
          organizationId,
          description: `Tenant share of field visit fee`,
        });
      } else {
        settlements.push({ destination: 'system', amount: amt, description: 'Field visit fee (no tenant)' });
      }
      break;

    // ── One-off visit: split if org-scoped, else all to system ──
    case 'one_off_visit':
      if (organizationId) {
        const systemShare = amt * (commissionPercent / 100);
        const tenantShare = amt - systemShare;
        settlements.push({
          destination: 'system',
          amount: parseFloat(systemShare.toFixed(2)),
          description: `Platform commission (${commissionPercent}%) on visit`,
        });
        settlements.push({
          destination: 'tenant',
          amount: parseFloat(tenantShare.toFixed(2)),
          organizationId,
          description: `Tenant share of visit fee`,
        });
      } else {
        settlements.push({ destination: 'system', amount: amt, description: 'One-off visit payment' });
      }
      break;

    // ── Land sale: system gets commission, seller gets rest (handled in marketplace) ──
    case 'land_sale':
      settlements.push({
        destination: 'system',
        amount: amt,
        description: 'Land sale commission',
      });
      break;

    default:
      settlements.push({ destination: 'system', amount: amt, description: `Payment for ${purpose}` });
  }

  return settlements;
}

/**
 * Process settlements for a payment — creates settlement rows
 * and credits tenant wallets for tenant-destined amounts.
 *
 * @param {Object} client - db client (from a transaction)
 * @param {String} paymentId - the payment ID
 * @param {Array} settlements - output from calculateSettlement()
 */
async function processSettlements(client, paymentId, settlements) {
  for (const s of settlements) {
    // Create settlement record
    await client.query(
      `INSERT INTO payment_settlements
         (payment_id, organization_id, destination, amount, currency, description, status, settled_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'settled', now())`,
      [paymentId, s.organizationId || null, s.destination, s.amount, 'GHS', s.description]
    );

    // If tenant-destined, credit their wallet
    if (s.destination === 'tenant' && s.organizationId) {
      // Upsert wallet (create if doesn't exist) then credit
      await client.query(
        `INSERT INTO tenant_wallets (organization_id, balance, total_earned, currency)
         VALUES ($1, $2, $2, 'GHS')
         ON CONFLICT (organization_id) DO UPDATE SET
           balance = tenant_wallets.balance + $2,
           total_earned = tenant_wallets.total_earned + $2,
           updated_at = now()`,
        [s.organizationId, s.amount]
      );
    }
  }

  // Mark payment as settled
  await client.query(
    'UPDATE payments SET settled_at = now() WHERE id = $1',
    [paymentId]
  );
}

module.exports = { calculateSettlement, processSettlements, getPlatformSettings, getTenantBilling };
