import db from '../src/db.js';

async function run() {
  console.log('Scanning for sale_items with negative qty...');
  const { rows: negRows } = await db.query("SELECT id, sale_id, qty FROM sale_items WHERE qty < 0");
  if (!negRows || negRows.length === 0) {
    console.log('No negative sale_items found.');
  } else {
    console.log(`Found ${negRows.length} negative sale_items. Fixing...`);
    const affectedSales = new Set();
    for (const r of negRows) {
      console.log(`Fixing sale_item id=${r.id} sale_id=${r.sale_id} qty=${r.qty} -> 0`);
      await db.query('UPDATE sale_items SET qty = 0 WHERE id = $1', [r.id]);
      affectedSales.add(r.sale_id);
    }

    // Recompute totals for affected sales
    for (const saleId of affectedSales) {
      console.log(`Recomputing totals for sale ${saleId}`);
      const { rows: itemAgg } = await db.query(
        `SELECT COALESCE(SUM(qty * unit_price), 0) AS total FROM sale_items WHERE sale_id = $1`,
        [saleId]
      );
      const total = Number(itemAgg?.[0]?.total || 0);
      const { rows: saleRows } = await db.query('SELECT discount FROM sales WHERE id = $1 LIMIT 1', [saleId]);
      const existingDiscount = Number(saleRows?.[0]?.discount || 0);
      const discount = Math.max(0, Math.min(existingDiscount, total));
      const net = total - discount;
      await db.query('UPDATE sales SET total = $1, discount = $2, net_total = $3 WHERE id = $4', [total, discount, net, saleId]);
      console.log(`Sale ${saleId} updated: total=${total} discount=${discount} net=${net}`);
    }
  }

  // Ensure sale_items.qty is not null
  console.log('Ensuring no NULL qty in sale_items...');
  await db.query('UPDATE sale_items SET qty = 0 WHERE qty IS NULL');

  console.log('Repair complete.');
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(2); });
