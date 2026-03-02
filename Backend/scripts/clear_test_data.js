/**
 * clear_test_data.js
 * Deletes all products, suppliers, and all related transactional data
 * (batches, purchases, purchase_items, sales, sale_items, returns,
 *  return_items, stock, supplier_returns, expenses, audit_logs).
 *
 * Users are NOT deleted.
 *
 * Run from the Backend folder:
 *   node scripts/clear_test_data.js
 */

import db from '../src/db.js';

const TABLES = [
  // children first to avoid FK violations
  'sale_items',
  'sales',
  'return_items',
  'returns',
  'supplier_returns',
  'purchase_items',
  'purchases',
  'batches',
  'stock',
  'expenses',
  'audit_logs',
  'products',
  'suppliers',
];

async function clearAll() {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    for (const table of TABLES) {
      try {
        const res = await client.query(`DELETE FROM ${table}`);
        console.log(`✓ ${table}: ${res.rowCount} rows deleted`);
      } catch (e) {
        // table might not exist in this DB version — skip
        console.warn(`  skipped ${table}: ${e.message}`);
      }
    }

    // Reset sequences so IDs start from 1 again
    const seqTables = ['products', 'suppliers', 'purchases', 'sales', 'batches'];
    for (const t of seqTables) {
      try {
        await client.query(`ALTER SEQUENCE IF EXISTS ${t}_id_seq RESTART WITH 1`);
        console.log(`  ↺ reset sequence for ${t}`);
      } catch (e) {
        console.warn(`  could not reset sequence for ${t}: ${e.message}`);
      }
    }

    await client.query('COMMIT');
    console.log('\n✅ Done — all data cleared. Users untouched.');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌ Error — rolled back:', e.message);
  } finally {
    client.release();
    process.exit(0);
  }
}

clearAll();
