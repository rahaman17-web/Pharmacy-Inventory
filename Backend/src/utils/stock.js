// Utilities to consume FEFO (first-expiry-first-out) stock from batches
import db from "../db.js";

export async function consumeStock(productId, quantityNeeded) {
  const consumed = [];
  let remaining = Number(quantityNeeded);

  const q = `SELECT * FROM batches WHERE product_id=$1 AND qty>0 ORDER BY expiry NULLS LAST, id ASC`;
  const { rows } = await db.query(q, [productId]);

  for (const batch of rows) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, batch.qty);
    if (take <= 0) continue;
    // update batch qty
    await db.query(`UPDATE batches SET qty = qty - $1 WHERE id=$2`, [take, batch.id]);
    consumed.push({ batch_id: batch.id, qty: take, unit_cost: batch.cost });
    remaining -= take;
  }

  if (remaining > 0) {
    throw new Error("Insufficient stock");
  }

  return consumed; // array of { batch_id, qty, unit_cost }
}
