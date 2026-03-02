import express from "express";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { logAudit } from "../utils/audit.js";

const router = express.Router();

// Ensure tables exist (lazy migration)
async function ensureTables() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS supplier_returns (
      id            BIGSERIAL PRIMARY KEY,
      supplier_id   BIGINT NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
      return_date   DATE NOT NULL DEFAULT CURRENT_DATE,
      reason        TEXT,
      total_amount  NUMERIC(14,2) NOT NULL DEFAULT 0,
      created_by    BIGINT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS supplier_return_items (
      id          BIGSERIAL PRIMARY KEY,
      return_id   BIGINT NOT NULL REFERENCES supplier_returns(id) ON DELETE CASCADE,
      product_id  BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
      batch_id    BIGINT REFERENCES batches(id) ON DELETE SET NULL,
      qty         INTEGER NOT NULL DEFAULT 1,
      unit_cost   NUMERIC(12,2) NOT NULL DEFAULT 0,
      total_cost  NUMERIC(14,2) NOT NULL DEFAULT 0,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

// GET /api/supplier-returns/all-returnable
// Returns ALL short-expire/expired/testing items across all suppliers with supplier name
router.get("/all-returnable", requireAuth, async (req, res, next) => {
  try {
    await ensureTables();
    const { rows } = await db.query(`
      -- Batch-based items (came through purchase invoices)
      SELECT DISTINCT ON (b.id)
        b.id            AS batch_id,
        b.batch_no,
        b.expiry,
        b.qty,
        b.cost,
        p.id            AS product_id,
        p.name          AS product_name,
        p.formula,
        p.category,
        p.selling_price,
        s.id            AS supplier_id,
        s.name          AS supplier_name,
        pur.id          AS purchase_id,
        pur.invoice_no  AS purchase_invoice,
        pur.purchase_date,
        pur.availability_type,
        CASE WHEN pur.availability_type IN ('trial','consignment') THEN true ELSE false END AS is_testing
      FROM batches b
      JOIN products p ON p.id = b.product_id
      JOIN purchase_items pi ON pi.batch_id = b.id
      JOIN purchases pur ON pur.id = pi.purchase_id
      JOIN suppliers s ON s.id = pur.supplier_id
      WHERE b.qty > 0
        AND (
          (b.expiry IS NOT NULL AND b.expiry <= CURRENT_DATE + INTERVAL '8 months')
          OR pur.availability_type IN ('trial', 'consignment')
        )

      UNION ALL

      -- Opening-qty products (no purchase invoice) that are expired or short-expire
      SELECT
        NULL::BIGINT    AS batch_id,
        p.batch_no      AS batch_no,
        p.expiry_date   AS expiry,
        p.opening_qty   AS qty,
        p.purchase_price AS cost,
        p.id            AS product_id,
        p.name          AS product_name,
        p.formula,
        p.category,
        p.selling_price,
        s.id            AS supplier_id,
        s.name          AS supplier_name,
        NULL::BIGINT    AS purchase_id,
        NULL::TEXT      AS purchase_invoice,
        NULL::DATE      AS purchase_date,
        'normal'        AS availability_type,
        false           AS is_testing
      FROM products p
      LEFT JOIN suppliers s ON s.id = p.supplier_id
      WHERE p.opening_qty > 0
        AND NOT EXISTS (SELECT 1 FROM batches b2 WHERE b2.product_id = p.id)
        AND (
          p.expiry_date IS NULL
          OR p.expiry_date <= CURRENT_DATE + INTERVAL '8 months'
        )

      ORDER BY batch_id ASC NULLS LAST
    `);
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/supplier-returns/supplier/:supplierId/items
// Returns batches that came from this supplier (via purchases) and are short-expire or testing
router.get("/supplier/:supplierId/items", requireAuth, async (req, res, next) => {
  try {
    await ensureTables();
    const { supplierId } = req.params;
    const { rows } = await db.query(`
      SELECT DISTINCT ON (b.id)
        b.id            AS batch_id,
        b.batch_no,
        b.expiry,
        b.qty,
        b.cost,
        p.id            AS product_id,
        p.name          AS product_name,
        p.formula,
        p.category,
        p.selling_price,
        pur.id          AS purchase_id,
        pur.invoice_no  AS purchase_invoice,
        pur.purchase_date,
        pur.availability_type,
        CASE WHEN pur.availability_type IN ('trial','consignment') THEN true ELSE false END AS is_testing
      FROM batches b
      JOIN products p ON p.id = b.product_id
      JOIN purchase_items pi ON pi.batch_id = b.id
      JOIN purchases pur ON pur.id = pi.purchase_id
      WHERE pur.supplier_id = $1
        AND b.qty > 0
        AND (
          -- expired or short expire: expiry within 8 months from today (includes already expired)
          (b.expiry IS NOT NULL AND b.expiry <= CURRENT_DATE + INTERVAL '8 months')
          OR
          -- testing / trial / consignment
          pur.availability_type IN ('trial', 'consignment')
        )
      ORDER BY b.id, b.expiry ASC NULLS LAST
    `, [supplierId]);
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/supplier-returns — list all returns with supplier name
router.get("/", requireAuth, async (req, res, next) => {
  try {
    await ensureTables();
    const { rows } = await db.query(`
      SELECT sr.id, sr.return_date, sr.reason, sr.total_amount, sr.created_at,
             s.name AS supplier_name, s.id AS supplier_id
      FROM supplier_returns sr
      JOIN suppliers s ON s.id = sr.supplier_id
      ORDER BY sr.created_at DESC
      LIMIT 200
    `);
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/supplier-returns/:id — single return with items
router.get("/:id", requireAuth, async (req, res, next) => {
  try {
    await ensureTables();
    const { rows: [ret] } = await db.query(`
      SELECT sr.*, s.name AS supplier_name
      FROM supplier_returns sr JOIN suppliers s ON s.id = sr.supplier_id
      WHERE sr.id = $1
    `, [req.params.id]);
    if (!ret) return res.status(404).json({ error: "Return not found" });

    const { rows: items } = await db.query(`
      SELECT sri.*, p.name AS product_name, b.batch_no, b.expiry
      FROM supplier_return_items sri
      JOIN products p ON p.id = sri.product_id
      LEFT JOIN batches b ON b.id = sri.batch_id
      WHERE sri.return_id = $1
      ORDER BY p.name
    `, [req.params.id]);

    res.json({ ...ret, items });
  } catch (err) { next(err); }
});

// POST /api/supplier-returns — create a return
// Body: { supplier_id, reason, return_date, items: [{ product_id, batch_id, qty, unit_cost }] }
router.post("/", requireAuth, async (req, res, next) => {
  const client = await db.getClient();
  try {
    await ensureTables();
    const { supplier_id, reason, return_date, items } = req.body;

    if (!supplier_id) return res.status(400).json({ error: "supplier_id is required" });
    if (!Array.isArray(items) || items.length === 0)
      return res.status(400).json({ error: "At least one item is required" });

    await client.query("BEGIN");

    const totalAmount = items.reduce((sum, it) => sum + (Number(it.qty) * Number(it.unit_cost)), 0);

    // Insert return header
    const { rows: [ret] } = await client.query(`
      INSERT INTO supplier_returns (supplier_id, return_date, reason, total_amount, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [supplier_id, return_date || new Date().toISOString().slice(0,10), reason || null, totalAmount, req.user?.id || null]);

    // Insert items & deduct from batches
    for (const it of items) {
      const qty = Number(it.qty);
      const unitCost = Number(it.unit_cost);
      const totalCost = qty * unitCost;
      const batchId = it.batch_id || null;

      // Validate batch has enough stock and deduct
      if (batchId) {
        const { rows: [batch] } = await client.query(`SELECT qty FROM batches WHERE id = $1`, [batchId]);
        if (!batch) throw Object.assign(new Error(`Batch ${batchId} not found`), { status: 400 });
        if (Number(batch.qty) < qty)
          throw Object.assign(new Error(`Not enough stock in batch. Available: ${batch.qty}`), { status: 400 });
        await client.query(`UPDATE batches SET qty = qty - $1 WHERE id = $2`, [qty, batchId]);
      } else {
        // Opening-qty product (no batch) — deduct from products.opening_qty
        const { rows: [prod] } = await client.query(`SELECT opening_qty FROM products WHERE id = $1`, [it.product_id]);
        if (!prod) throw Object.assign(new Error(`Product ${it.product_id} not found`), { status: 400 });
        if (Number(prod.opening_qty) < qty)
          throw Object.assign(new Error(`Not enough opening stock. Available: ${prod.opening_qty}`), { status: 400 });
        await client.query(`UPDATE products SET opening_qty = opening_qty - $1 WHERE id = $2`, [qty, it.product_id]);
      }

      await client.query(`
        INSERT INTO supplier_return_items (return_id, product_id, batch_id, qty, unit_cost, total_cost)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [ret.id, it.product_id, batchId, qty, unitCost, totalCost]);
    }

    await client.query("COMMIT");

    await logAudit({
      user_id: req.user?.id,
      action: "CREATE_SUPPLIER_RETURN",
      details: { supplier_id, total_amount: totalAmount, items_count: items.length, reason },
    }).catch(() => {});

    res.status(201).json({ id: ret.id, total_amount: totalAmount });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  } finally {
    client.release();
  }
});

export default router;
