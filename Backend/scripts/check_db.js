import db from '../src/db.js';

async function q(sql, params=[]) {
  try {
    const r = await db.query(sql, params);
    return r.rows || [];
  } catch (e) {
    return { error: String(e && e.message ? e.message : e) };
  }
}

async function main(){
  console.log('Checking DB tables...');
  const tables = ['users','products','batches','purchases','purchase_items','sales','sale_items','returns','return_items','expenses','audit_logs'];
  for (const t of tables) {
    const count = await q(`SELECT COUNT(*) as cnt FROM ${t}`);
    if (count.error) {
      console.log(`${t}: ERROR -> ${count.error}`);
      continue;
    }
    console.log(`${t}: ${count[0].cnt}`);
  }

  console.log('\nSample rows (up to 3 each):');
  const sampleQueries = {
    users: 'SELECT id, username, role, created_at FROM users ORDER BY id DESC LIMIT 3',
    products: 'SELECT id, name, formula, selling_price, created_at FROM products ORDER BY id DESC LIMIT 3',
    batches: 'SELECT id, product_id, batch_no, qty, cost, expiry FROM batches ORDER BY id DESC LIMIT 3',
    purchases: 'SELECT id, invoice_no, total, created_at FROM purchases ORDER BY id DESC LIMIT 3',
    sales: 'SELECT id, user_id, total, net_total, created_at FROM sales ORDER BY id DESC LIMIT 3',
    returns: 'SELECT id, sale_id, total, created_at FROM returns ORDER BY id DESC LIMIT 3',
    expenses: 'SELECT id, user_id, amount, description, created_at FROM expenses ORDER BY id DESC LIMIT 3'
  };

  for (const k of Object.keys(sampleQueries)) {
    const rows = await q(sampleQueries[k]);
    if (rows.error) {
      console.log(`${k}: ERROR -> ${rows.error}`);
      continue;
    }
    console.log(`\n${k} rows:`);
    console.table(rows);
  }

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(2); });
