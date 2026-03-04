import express from "express";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";

const router = express.Router();

// Returns list of batches with product info
router.get("/", requireAuth, requireRole(["admin", "manager", "storekeeper", "cashier"]), async (req, res) => {
  try {
    // Detect DB type to avoid sqlite-specific system tables in Postgres
    const formulaExpr = 'p.formula';

    const sql = `
      SELECT * FROM (
        -- Real batch rows (from purchase invoices)
        SELECT b.id as batch_id, p.id as product_id, p.name as product_name, ${formulaExpr},
           COALESCE(
             NULLIF(TRIM(p.category), ''),
             (SELECT NULLIF(TRIM(p2.category), '') FROM products p2
              WHERE LOWER(TRIM(p2.name)) = LOWER(TRIM(p.name))
                AND p2.category IS NOT NULL AND TRIM(p2.category) <> ''
                AND p2.id <> p.id
              LIMIT 1)
           ) AS category,
           p.selling_price, b.batch_no, b.expiry, b.qty, b.cost,
           (
             SELECT s.name FROM purchases pur
             JOIN purchase_items pi ON pi.purchase_id = pur.id
             JOIN suppliers s ON s.id = pur.supplier_id
             WHERE pi.batch_id = b.id
             LIMIT 1
           ) AS supplier_name,
           (
             SELECT pur.invoice_no FROM purchases pur
             JOIN purchase_items pi ON pi.purchase_id = pur.id
             WHERE pi.batch_id = b.id
             LIMIT 1
           ) AS purchase_invoice
           FROM batches b
           JOIN products p ON p.id = b.product_id
         -- No qty > 0 filter: show all batches including depleted ones

        UNION ALL

        -- Opening-qty-only products (added directly, no purchase invoice / no batch row)
        SELECT
           NULL::BIGINT   AS batch_id,
           p.id           AS product_id,
           p.name         AS product_name,
           p.formula,
           COALESCE(NULLIF(TRIM(p.category), ''), 'General') AS category,
           p.selling_price,
           p.batch_no     AS batch_no,
           p.expiry_date  AS expiry,
           p.opening_qty  AS qty,
           p.purchase_price AS cost,
           s.name         AS supplier_name,
           NULL::TEXT     AS purchase_invoice
           FROM products p
           LEFT JOIN suppliers s ON s.id = p.supplier_id
           WHERE NOT EXISTS (SELECT 1 FROM batches b WHERE b.product_id = p.id)
           -- No opening_qty > 0 filter: show even 0-qty products
      ) AS combined
      ORDER BY product_name, COALESCE(expiry, '9999-12-31'::date)`;

    const { rows } = await db.query(sql);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
