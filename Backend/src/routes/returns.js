import express from "express";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { logAudit } from "../utils/audit.js";
import { body, validationResult } from "express-validator";

const router = express.Router();

async function recomputeSaleTotals(client, saleId) {
  const { rows: itemRows } = await client.query(
    `SELECT COALESCE(SUM(qty * unit_price), 0) AS total
     FROM sale_items
     WHERE sale_id = $1`,
    [saleId]
  );
  const total = Number(itemRows?.[0]?.total || itemRows?.[0]?.TOTAL || 0);

  const { rows: saleRows } = await client.query(`SELECT discount FROM sales WHERE id = $1 LIMIT 1`, [saleId]);
  const existingDiscount = Number(saleRows?.[0]?.discount || saleRows?.[0]?.DISCOUNT || 0);
  const discount = Math.max(0, Math.min(existingDiscount, total));
  const net = total - discount;

  await client.query(`UPDATE sales SET total = $1, discount = $2, net_total = $3 WHERE id = $4`, [total, discount, net, saleId]);
  return { total, discount, net_total: net };
}

// GET sale by ID for returns (to verify and show items)
router.get("/sale/:saleId", requireAuth, async (req, res, next) => {
  const saleId = req.params.saleId;
  try {
    // Get sale details
    const { rows: saleRows } = await db.query(
      `SELECT s.id, s.user_id, s.total, s.discount, s.net_total, s.created_at
       FROM sales s WHERE s.id = $1 LIMIT 1`,
      [saleId]
    );
    
    if (saleRows.length === 0) {
      return res.status(404).json({ error: "Sale not found" });
    }
    
    const sale = saleRows[0];
    
    // Get sale items with product details
    const { rows: itemRows } = await db.query(
      `SELECT 
          si.id as sale_item_id,
          si.product_id,
          p.name as product_name,
          si.batch_id,
          b.batch_no,
          si.qty as sold_qty,
          COALESCE((SELECT SUM(ri.qty) FROM return_items ri WHERE ri.sale_item_id = si.id), 0) as returned_qty,
          (si.qty - COALESCE((SELECT SUM(ri.qty) FROM return_items ri WHERE ri.sale_item_id = si.id), 0)) as remaining_qty,
          si.unit_price,
          COALESCE(si.discount_percent, 0) as discount_percent,
          (si.unit_price * (1 - COALESCE(si.discount_percent, 0) / 100)) as effective_unit_price,
          ((si.qty - COALESCE((SELECT SUM(ri.qty) FROM return_items ri WHERE ri.sale_item_id = si.id), 0)) * si.unit_price * (1 - COALESCE(si.discount_percent, 0) / 100)) as total_price
       FROM sale_items si
       JOIN products p ON p.id = si.product_id
       LEFT JOIN batches b ON b.id = si.batch_id
       WHERE si.sale_id = $1
         AND (si.qty - COALESCE((SELECT SUM(ri.qty) FROM return_items ri WHERE ri.sale_item_id = si.id), 0)) > 0
       ORDER BY p.name`,
      [saleId]
    );
    
    res.json({ sale, items: itemRows });
  } catch (err) {
    console.error("Error fetching sale:", err);
    next(err);
  }
});

// POST create a return
router.post(
  "/",
  requireAuth,
  // allow cashier, admin, manager to process returns
  (req, res, next) => {
    const role = req.user?.role;
    if (!role || !["admin", "manager", "cashier"].includes(role)) {
      return res.status(403).json({ error: "Insufficient role" });
    }
    next();
  },
  [
    body("sale_id").notEmpty().withMessage("sale_id is required"),
    body("items").isArray({ min: 1 }).withMessage("At least one return item is required"),
    body("items.*.sale_item_id").notEmpty().withMessage("sale_item_id is required for each item"),
    body("items.*.product_id").notEmpty().withMessage("product_id is required"),
    body("items.*.batch_id").notEmpty().withMessage("batch_id is required"),
    body("items.*.qty").isInt({ min: 1 }).withMessage("qty must be an integer >= 1"),
    body("items.*.unit_price").isFloat({ min: 0 }).withMessage("unit_price must be >= 0"),
    body("items.*.discount_percent").optional().isFloat({ min: 0, max: 100 }),
    body("reason").optional().isString(),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: "Validation failed", details: errors.array() });
    }

    const { sale_id, items = [], reason = "" } = req.body;
    const userId = req.user?.id || null;
    
    try {
      const client = await db.getClient();
      try {
        // Verify sale exists
        const { rows: saleRows } = await client.query(`SELECT * FROM sales WHERE id = $1`, [sale_id]);
        if (!saleRows || saleRows.length === 0) {
          return res.status(404).json({ error: "Sale not found" });
        }

        // Verify all items belong to this sale and quantities are valid (accounting for previous returns)
        const normalizedItems = [];
        for (const item of items) {
          const saleItemId = Number(item.sale_item_id);
          const { rows: saleItemRows } = await client.query(
            `SELECT * FROM sale_items WHERE id = $1 AND sale_id = $2`,
            [saleItemId, sale_id]
          );

          if (!saleItemRows || saleItemRows.length === 0) {
            return res.status(400).json({ error: `Sale item ${item.sale_item_id} not found in this sale` });
          }

          const saleItem = saleItemRows[0];
          const soldQty = Number(saleItem.qty || 0);

          const { rows: returnedRows } = await client.query(
            `SELECT COALESCE(SUM(qty), 0) as returned_qty FROM return_items WHERE sale_item_id = $1`,
            [saleItemId]
          );
          const returnedQty = Number(returnedRows?.[0]?.returned_qty || returnedRows?.[0]?.RETURNED_QTY || 0);
          const remainingQty = soldQty - returnedQty;

          const reqQty = Number(item.qty);
          if (!Number.isFinite(reqQty) || reqQty <= 0) {
            return res.status(400).json({ error: `Invalid return qty for item ${item.sale_item_id}` });
          }
          if (reqQty > remainingQty) {
            return res.status(400).json({
              error: `Return quantity (${reqQty}) exceeds remaining quantity (${remainingQty}) for item ${item.sale_item_id}`
            });
          }

          // Calculate effective unit price after discount
          const unitPrice = Number(item.unit_price || 0);
          const discountPercent = Number(item.discount_percent !== undefined ? item.discount_percent : saleItem.discount_percent || 0);
          const effectiveUnitPrice = unitPrice * (1 - discountPercent / 100);
          const unitCost = Number(saleItem.unit_cost || 0);
          
          normalizedItems.push({
            sale_item_id: saleItemId,
            product_id: Number(saleItem.product_id),
            batch_id: Number(saleItem.batch_id),
            qty: reqQty,
            unit_price: effectiveUnitPrice,  // Use discounted price for refund
            unit_cost: unitCost,
          });
        }

        const total = normalizedItems.reduce((s, it) => s + Number(it.qty) * Number(it.unit_price || 0), 0);

        // Insert return record
        await client.query(
          `INSERT INTO returns (sale_id, user_id, total, reason) VALUES ($1, $2, $3, $4)`,
          [sale_id, userId, total, reason]
        );

        const { rows: returnRows } = await client.query(
          `SELECT id, sale_id, user_id, total, reason, created_at FROM returns ORDER BY id DESC LIMIT 1`
        );
        const returnRecord = returnRows[0];

        for (const item of normalizedItems) {
          await client.query(
            `INSERT INTO return_items (return_id, sale_item_id, product_id, batch_id, qty, unit_price, unit_cost)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [returnRecord.id, item.sale_item_id, item.product_id, item.batch_id, item.qty, item.unit_price, item.unit_cost || 0]
          );

          // Restore stock to the original batch
          await client.query(`UPDATE batches SET qty = qty + $1 WHERE id = $2`, [item.qty, item.batch_id]);

          // Reduce the original invoice item (erase it from the invoice as requested)
          await client.query(`UPDATE sale_items SET qty = qty - $1 WHERE id = $2`, [item.qty, item.sale_item_id]);
        }

        const newTotals = await recomputeSaleTotals(client, sale_id);

        // Audit log
        try {
          await logAudit({
            user_id: userId,
            action: "return.create",
            details: { return_id: returnRecord.id, sale_id, total, reason }
          });
        } catch (e) {
          console.error("Audit failed", e);
        }

        res.json({
          ok: true,
          return_id: returnRecord.id,
          sale_id,
          total,
          sale_totals: newTotals,
          message: "Return processed successfully. Invoice updated and stock restored."
        });
      } finally {
        client.release?.();
      }
      
    } catch (err) {
      console.error("Return creation error:", err);
      res.status(500).json({ error: err.message || "Failed to process return" });
    }
  }
);

// GET all returns
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const onlyMine = String(req.query.mine || "").toLowerCase() === "true";
    const mineUserId = req.user?.id;

    const { rows } = await db.query(`
      SELECT r.id, r.sale_id, r.user_id, u.username, r.total, r.reason, r.created_at
      FROM returns r
      LEFT JOIN users u ON u.id = r.user_id
      ${onlyMine ? "WHERE r.user_id = $1" : ""}
      ORDER BY r.created_at DESC
      LIMIT 100
    `, onlyMine ? [mineUserId] : []);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching returns:", err);
    next(err);
  }
});

// GET return details by ID
router.get("/:id", requireAuth, async (req, res, next) => {
  const id = req.params.id;
  try {
    const { rows: returnRows } = await db.query(
      `SELECT r.id, r.sale_id, r.user_id, u.username, r.total, r.reason, r.created_at
       FROM returns r
       LEFT JOIN users u ON u.id = r.user_id
       WHERE r.id = $1`,
      [id]
    );
    
    if (returnRows.length === 0) {
      return res.status(404).json({ error: "Return not found" });
    }
    
    const returnRecord = returnRows[0];
    
    const { rows: items } = await db.query(
      `SELECT ri.id, ri.sale_item_id, ri.product_id, p.name as product_name,
              ri.batch_id, b.batch_no, ri.qty, ri.unit_price,
              (ri.qty * ri.unit_price) as total_price
       FROM return_items ri
       JOIN products p ON p.id = ri.product_id
       LEFT JOIN batches b ON b.id = ri.batch_id
       WHERE ri.return_id = $1`,
      [id]
    );
    
    res.json({ return: returnRecord, items });
  } catch (err) {
    console.error("Error fetching return details:", err);
    next(err);
  }
});

export default router;
