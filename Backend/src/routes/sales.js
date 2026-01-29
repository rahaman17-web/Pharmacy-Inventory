import express from "express";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { consumeStock } from "../utils/stock.js";
import { logAudit } from "../utils/audit.js";
import { body, validationResult } from "express-validator";

const router = express.Router();

// Get next sale/invoice number (uses auto-increment sale.id)
router.get("/next-invoice", requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(`SELECT MAX(id) as max_id FROM sales`);
    const maxId = rows && rows[0] && (rows[0].max_id ?? rows[0].MAX_ID);
    const next = (Number(maxId) || 0) + 1;
    res.json({ invoice_no: String(next) });
  } catch (err) {
    console.error("Next sale invoice error:", err);
    res.json({ invoice_no: "1" });
  }
});

// Example payload:
// { items: [{ product_id, qty, unit_price }], discount }
router.post(
  "/",
  requireAuth,
  // allow cashier, admin, manager to create sales
  (req, res, next) => {
    const role = req.user?.role;
    if (!role || !["admin", "manager", "cashier"].includes(role)) return res.status(403).json({ error: "Insufficient role" });
    next();
  },
    [
    body("items").isArray({ min: 1 }).withMessage("At least one sale item is required"),
    body("items.*.product_id").notEmpty().withMessage("product_id is required for each item"),
    body("items.*.qty").isInt({ min: 1 }).withMessage("qty must be an integer >= 1"),
    body("items.*.unit_price").isFloat({ min: 0 }).withMessage("unit_price must be >= 0"),
    body("discountPercent").optional().isFloat({ min: 0, max: 100 }),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: "Validation failed", details: errors.array() });

    const { items = [] } = req.body;
    const userId = req.user?.id || null;
    
    try {
      // calculate totals
      const total = items.reduce((s, it) => s + Number(it.qty) * Number(it.unit_price || 0), 0);
      // Determine discount percent based on user role and GST presence
      
      // Check if any item has GST
      const productIds = items.map(it => Number(it.product_id));
      const placeholders = productIds.map((_, i) => `$${i + 1}`).join(',');
      const { rows: productRows } = await db.query(
        `SELECT id, gst_percentage FROM products WHERE id IN (${placeholders})`,
        productIds
      );
      const hasGstItems = productRows.some(p => Number(p.gst_percentage || p.GST_PERCENTAGE || 0) > 0);

      // Discount limits (maximums) based on role and GST presence.
      // We allow client to specify a discount percent but cap it to these limits.
      const role = req.user?.role || 'user';
      const capPercent = role === 'admin' ? (hasGstItems ? 7 : 12) : (hasGstItems ? 5 : 10);

      // Accept discountPercent from client (percent value). If not provided, default to 0.
      const requestedDiscount = typeof req.body.discountPercent !== 'undefined' ? Number(req.body.discountPercent) : 0;
      const appliedDiscountPercent = Number.isFinite(requestedDiscount) ? Math.min(requestedDiscount, capPercent) : 0;

      // compute discount amount and net
      const discountAmount = Number(((total * appliedDiscountPercent) / 100).toFixed(2));
      const net = Number((total - discountAmount).toFixed(2));

      // Insert sale (sql.js doesn't support RETURNING, so we get the last insert ID)
      await db.query(
        `INSERT INTO sales (user_id, total, discount, net_total) VALUES ($1,$2,$3,$4)`,
        [userId, total, discountAmount, net]
      );
      
      // Get the last inserted sale ID
      const { rows: saleRows } = await db.query(`SELECT id, user_id, total, discount, net_total, created_at FROM sales ORDER BY id DESC LIMIT 1`);
      const sale = saleRows[0];

      // For each item, consume batches FEFO and create sale_items per batch consumed
      for (const it of items) {
        const consumed = await consumeStock(it.product_id, it.qty);
        for (const c of consumed) {
          await db.query(
            `INSERT INTO sale_items (sale_id, product_id, batch_id, qty, unit_price, unit_cost, discount_percent) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [sale.id, it.product_id, c.batch_id, c.qty, it.unit_price || 0, c.unit_cost || 0, appliedDiscountPercent]
          );
        }
      }

      // audit log
      try {
        await logAudit({ user_id: req.user?.id, action: "sale.create", details: { sale_id: sale.id, total, net } });
      } catch (e) {
        console.error("Audit failed", e);
      }

      res.json({ ok: true, sale_id: sale.id, total, net });
    } catch (err) {
      console.error("Sale creation error:", err);
      res.status(500).json({ error: err.message || "Failed to create sale" });
    }
  }
);

// GET sale details
router.get("/:id", requireAuth, async (req, res, next) => {
  const id = req.params.id;
  try {
    const { rows } = await db.query(
      `SELECT s.id, s.user_id, s.total, s.discount, s.net_total, s.created_at,
              u.username AS user_name, u.role AS user_role
       FROM sales s
       LEFT JOIN users u ON u.id = s.user_id
       WHERE s.id = $1 LIMIT 1`,
      [id]
    );
    const saleRow = rows[0];
    const sale = saleRow ? {
      id: saleRow.id,
      user_id: saleRow.user_id,
      total: saleRow.total,
      discount: saleRow.discount,
      net_total: saleRow.net_total,
      created_at: saleRow.created_at,
      user: saleRow.user_id ? { id: saleRow.user_id, username: saleRow.user_name, role: saleRow.user_role } : null
    } : null;
    if (!sale) return res.status(404).json({ error: "Not found" });

    const { rows: items } = await db.query(
      `SELECT si.id, si.product_id, p.name as product_name, si.batch_id, b.batch_no, si.qty, si.unit_price
       FROM sale_items si
       JOIN products p ON p.id = si.product_id
       LEFT JOIN batches b ON b.id = si.batch_id
       WHERE si.sale_id = $1 AND COALESCE(si.qty, 0) > 0`,
      [id]
    );

    // If all items have been returned (no items with qty > 0), treat invoice as not found
    if (items.length === 0) {
      return res.status(404).json({ error: "Invoice has been fully returned" });
    }

    res.json({ sale, items });
  } catch (err) {
    next(err);
  }
});

export default router;