import db from '../src/db.js';

async function checkTodaySales() {
  try {
    console.log('=== SALES TODAY ===');
    const { rows: sales } = await db.query(
      `SELECT id, created_at, total, discount, net_total FROM sales WHERE DATE(created_at) = DATE('now') ORDER BY created_at DESC`
    );
    console.table(sales);

    console.log('\n=== SALE ITEMS TODAY (with returns info) ===');
    const { rows: saleItems } = await db.query(
      `SELECT 
        si.sale_id, 
        si.id as sale_item_id, 
        si.qty as current_qty,
        si.unit_price,
        (si.qty * si.unit_price) as current_total,
        COALESCE((SELECT SUM(ri.qty) FROM return_items ri WHERE ri.sale_item_id = si.id), 0) as returned_qty,
        (si.qty + COALESCE((SELECT SUM(ri.qty) FROM return_items ri WHERE ri.sale_item_id = si.id), 0)) as original_qty,
        ((si.qty + COALESCE((SELECT SUM(ri.qty) FROM return_items ri WHERE ri.sale_item_id = si.id), 0)) * si.unit_price) as original_total
      FROM sale_items si 
      JOIN sales s ON s.id = si.sale_id 
      WHERE DATE(s.created_at) = DATE('now') 
      ORDER BY si.sale_id, si.id`
    );
    console.table(saleItems);

    console.log('\n=== RETURNS TODAY ===');
    const { rows: returns } = await db.query(
      `SELECT r.id, r.sale_id, r.total, r.created_at 
       FROM returns r 
       WHERE DATE(r.created_at) = DATE('now') 
       ORDER BY r.created_at DESC`
    );
    console.table(returns);

    console.log('\n=== CALCULATED TOTALS (for sales report) ===');
    const originalTotal = saleItems.reduce((sum, item) => sum + Number(item.original_total), 0);
    const currentTotal = saleItems.reduce((sum, item) => sum + Number(item.current_total), 0);
    const returnsTotal = returns.reduce((sum, r) => sum + Number(r.total), 0);
    
    console.log(`Original Sales Total (what was sold): Rs. ${originalTotal.toFixed(2)}`);
    console.log(`Current Sales Total (after returns): Rs. ${currentTotal.toFixed(2)}`);
    console.log(`Returns Total: Rs. ${returnsTotal.toFixed(2)}`);
    console.log(`\nShould show in report: Rs. ${originalTotal.toFixed(2)} (before returns)`);
    console.log(`Returns separately: Rs. ${returnsTotal.toFixed(2)}`);
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkTodaySales();
