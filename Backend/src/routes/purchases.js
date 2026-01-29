import express from "express";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { logAudit } from "../utils/audit.js";
import { body, validationResult } from "express-validator";
const router = express.Router();

// Search/list purchases
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const { q } = req.query;
    let query = `SELECT DISTINCT p.*, s.name as supplier_name FROM purchases p 
                 LEFT JOIN suppliers s ON p.supplier_id = s.id`;
    let params = [];
    
    if (q && q.trim()) {
      query += ` WHERE p.invoice_no LIKE $1 OR s.name LIKE $1`;
      params.push(`%${q}%`);
    }
    
    query += ` ORDER BY p.created_at DESC LIMIT 50`;
    
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Search purchases error:", err);
    next(err);
  }
});

// Get next invoice number
router.get("/next-invoice", requireAuth, async (req, res, next) => {
  try {
    // Get all invoice numbers and find max in JavaScript
    const result = await db.query(`SELECT invoice_no FROM purchases`);
    
    let maxInvoice = -1;
    if (result.rows && result.rows.length > 0) {
      result.rows.forEach(row => {
        if (row.invoice_no) {
          const num = parseInt(row.invoice_no, 10);
          if (!isNaN(num) && num > maxInvoice) {
            maxInvoice = num;
          }
        }
      });
    }
    
    const nextInvoice = maxInvoice + 1;
    console.log(`Next invoice number: ${nextInvoice}`);
    res.json({ invoice_no: String(nextInvoice) });
  } catch (err) {
    console.error("Next invoice error:", err);
    console.error("Error stack:", err.stack);
    // If table doesn't exist or any error, return 0
    res.json({ invoice_no: "0" });
  }
});

// Get purchase by invoice number
router.get("/invoice/:invoiceNo", requireAuth, async (req, res, next) => {
  try {
    const { invoiceNo } = req.params;
    
    // Get purchase header
    const purchaseResult = await db.query(
      `SELECT p.*, s.name as supplier_name FROM purchases p 
       LEFT JOIN suppliers s ON p.supplier_id = s.id 
       WHERE p.invoice_no = $1`,
      [invoiceNo]
    );
    
    if (purchaseResult.rows.length === 0) {
      return res.status(404).json({ error: "Invoice not found" });
    }
    
    const purchase = purchaseResult.rows[0];
    
    // Get purchase items with product details and ALL original data
    const itemsResult = await db.query(
      `SELECT pi.*, p.name as product_name, p.formula, p.category, b.batch_no, b.expiry, b.cost 
       FROM purchase_items pi
       JOIN products p ON pi.product_id = p.id
       JOIN batches b ON pi.batch_id = b.id
       WHERE pi.purchase_id = $1`,
      [purchase.id]
    );
    
    res.json({
      purchase,
      items: itemsResult.rows
    });
  } catch (err) {
    next(err);
  }
});

// Get returnable items (trial/consignment items that are still pending)
router.get("/returnable", requireAuth, async (req, res, next) => {
  try {
    // Get all purchases with trial/consignment items that are still pending
    const purchasesResult = await db.query(
      `SELECT p.*, s.name as supplier_name 
       FROM purchases p 
       LEFT JOIN suppliers s ON p.supplier_id = s.id 
       WHERE p.availability_type IN ('trial', 'consignment') 
       AND p.payment_status = 'pending' 
       ORDER BY p.trial_end_date ASC, p.created_at DESC`
    );
    
    const purchasesWithItems = [];
    
    for (const purchase of purchasesResult.rows) {
      // Get items for each purchase
      const itemsResult = await db.query(
        `SELECT pi.*, p.name as product_name, b.batch_no, b.expiry
         FROM purchase_items pi
         JOIN products p ON pi.product_id = p.id
         JOIN batches b ON pi.batch_id = b.id
         WHERE pi.purchase_id = $1`,
        [purchase.id]
      );
      
      purchasesWithItems.push({
        ...purchase,
        items: itemsResult.rows
      });
    }
    
    res.json(purchasesWithItems);
  } catch (err) {
    console.error("Get returnable items error:", err);
    next(err);
  }
});

// Process return for trial/consignment items
router.post("/process-return", requireAuth, async (req, res, next) => {
  try {
    const { purchase_id, items } = req.body;
    
    // Update the purchase payment status based on what's being returned
    if (items.length === 0) {
      // All items are being kept - mark as paid
      await db.query(
        `UPDATE purchases SET payment_status = 'paid' WHERE id = $1`,
        [purchase_id]
      );
      
      await logAudit(req.user.id, "purchase", "return_processed", {
        purchase_id,
        action: "kept_all_items",
        status: "paid"
      });
    } else {
      // Some or all items are being returned
      const allItemsReturned = items.every(item => item.return_qty === item.qty);
      
      if (allItemsReturned) {
        await db.query(
          `UPDATE purchases SET payment_status = 'returned' WHERE id = $1`,
          [purchase_id]
        );
      } else {
        await db.query(
          `UPDATE purchases SET payment_status = 'partial' WHERE id = $1`,
          [purchase_id]
        );
      }
      
      await logAudit(req.user.id, "purchase", "return_processed", {
        purchase_id,
        returned_items: items.length,
        action: allItemsReturned ? "returned_all" : "partial_return"
      });
    }
    
    res.json({ message: "Return processed successfully" });
  } catch (err) {
    console.error("Process return error:", err);
    next(err);
  }
});

// Example payload:
// { supplier_id, invoice_no, purchase_date, items: [{ product_id, batch_no, expiry, qty, unit_price }] }
router.post(
  "/",
  requireAuth,
  // allow admin, manager, storekeeper to create purchases
  (req, res, next) => {
    // inline role check to avoid import cycles; reuse requireRole if preferred
    const role = req.user?.role;
    if (!role || !["admin", "manager", "storekeeper"].includes(role)) return res.status(403).json({ error: "Insufficient role" });
    next();
  },
  [
    body("purchase_date").optional().isISO8601().toDate(),
    body("items").isArray({ min: 1 }).withMessage("At least one purchase item is required"),
    body("items.*.qty").isInt({ min: 1 }).withMessage("qty must be an integer >= 1"),
    body("items.*.unit_price").isFloat({ min: 0 }).withMessage("unit_price must be >= 0"),
    body("items.*.bonus_qty").optional().isInt({ min: 0 }).withMessage("bonus_qty must be an integer >= 0"),
    body("items.*.line_total").optional().isFloat({ min: 0 }).withMessage("line_total must be >= 0"),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error("Validation errors:", errors.array());
      return res.status(400).json({ error: "Validation failed", details: errors.array() });
    }

    console.log("Purchase request body:", JSON.stringify(req.body, null, 2));
    let { supplier_id, supplier_name, invoice_no, purchase_date, received_date, availability_type, trial_end_date, payment_status, items } = req.body;
    
    // Convert date to string if it's a Date object
    if (purchase_date && typeof purchase_date === 'object') {
      purchase_date = purchase_date.toISOString ? purchase_date.toISOString().split('T')[0] : null;
    }
    if (received_date && typeof received_date === 'object') {
      received_date = received_date.toISOString ? received_date.toISOString().split('T')[0] : null;
    }
    if (trial_end_date && typeof trial_end_date === 'object') {
      trial_end_date = trial_end_date.toISOString ? trial_end_date.toISOString().split('T')[0] : null;
    }
    
    try {
      // Check for duplicate invoice number if provided
      if (invoice_no && String(invoice_no).trim()) {
        const { rows: existingInvoice } = await db.query(
          `SELECT id FROM purchases WHERE invoice_no = $1`,
          [invoice_no]
        );
        
        if (existingInvoice.length > 0) {
          return res.status(400).json({ 
            error: `Invoice number ${invoice_no} already exists. Please use a different invoice number.` 
          });
        }
      }

      // Resolve supplier by name if supplier_id isn't provided
      if ((!supplier_id || supplier_id === null) && supplier_name && String(supplier_name).trim()) {
        const name = String(supplier_name).trim();
        const { rows: sRows } = await db.query(`SELECT * FROM suppliers WHERE name = $1 LIMIT 1`, [name]);
        if (sRows && sRows[0]) {
          supplier_id = sRows[0].id;
        } else {
          await db.query(`INSERT INTO suppliers (name) VALUES ($1)`, [name]);
          const { rows: s2 } = await db.query(`SELECT * FROM suppliers ORDER BY id DESC LIMIT 1`);
          supplier_id = s2 && s2[0] ? s2[0].id : null;
        }
      }

      // Note: sql.js doesn't support transactions
      const { rows: pRows } = await db.query(
        `INSERT INTO purchases (supplier_id, invoice_no, purchase_date, received_date, availability_type, trial_end_date, payment_status, total) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [supplier_id || null, invoice_no || null, purchase_date || null, received_date || null, availability_type || 'owned', trial_end_date || null, payment_status || 'pending', 0]
      );
      
      // Get the inserted purchase
      const { rows: purchaseRows } = await db.query(`SELECT * FROM purchases ORDER BY id DESC LIMIT 1`);
      const purchase = purchaseRows[0];

      let total = 0;
      for (const it of items) {
        const purchasedQty = Number(it.qty) || 0;
        const bonusQty = Number(it.bonus_qty) || 0;
        const addedQty = purchasedQty + bonusQty;

        // Create product if it doesn't exist
        let productId = it.product_id;
        if (!productId && it.product_name) {
          await db.query(
            `INSERT INTO products (name, formula, category, pack_size, selling_price) VALUES ($1, $2, $3, $4, $5)`,
            [
              it.product_name,
              it.formula || null,
              it.category || null,
              Number(it.pack_size) > 0 ? Number(it.pack_size) : 1,
              it.selling_price ?? it.unit_price
            ]
          );
          const { rows: prodRows } = await db.query(`SELECT * FROM products ORDER BY id DESC LIMIT 1`);
          productId = prodRows[0].id;
        } else if (productId) {
          // Update product info if provided
          if (it.selling_price !== undefined && it.selling_price !== null) {
            await db.query(`UPDATE products SET selling_price = $1 WHERE id = $2`, [it.selling_price, productId]);
          }
          if (Number(it.pack_size) > 0) {
            await db.query(`UPDATE products SET pack_size = $1 WHERE id = $2`, [Number(it.pack_size), productId]);
          }
          if (it.formula) {
            // Don't overwrite an existing formula with empty
            await db.query(`UPDATE products SET formula = COALESCE(NULLIF(formula, ''), $1) WHERE id = $2`, [it.formula, productId]);
          }
          if (it.category) {
            await db.query(`UPDATE products SET category = COALESCE(NULLIF(category, ''), $1) WHERE id = $2`, [it.category, productId]);
          }
          if (it.gst_percentage !== undefined && it.gst_percentage !== null && !isNaN(Number(it.gst_percentage))) {
            // Set a default GST% on the product if it's not set yet
            await db.query(
              `UPDATE products SET gst_percentage = COALESCE(gst_percentage, $1) WHERE id = $2`,
              [Number(it.gst_percentage), productId]
            );
          }
        }
        
        if (!productId) {
          throw new Error('Product ID or product name is required');
        }
        
        // insert or find batch
        const { rows: batchRows } = await db.query(
          `SELECT * FROM batches WHERE product_id=$1 AND batch_no=$2 LIMIT 1`,
          [productId, it.batch_no]
        );
        let batch = batchRows[0];
        if (batch) {
          // update qty and cost (weighted average cost)
          const oldQty = Number(batch.qty) || 0;
          const oldCost = Number(batch.cost) || 0;
          const newCost = Number(it.unit_cost ?? it.unit_price ?? 0) || 0;
          const denom = oldQty + addedQty;
          const avgCost = denom > 0 ? ((oldQty * oldCost) + (addedQty * newCost)) / denom : newCost;
          await db.query(`UPDATE batches SET qty = qty + $1, cost = $2 WHERE id=$3`, [addedQty, avgCost, batch.id]);
          const { rows } = await db.query(`SELECT * FROM batches WHERE id=$1`, [batch.id]);
          batch = rows[0];
        } else {
          await db.query(
            `INSERT INTO batches (product_id, batch_no, expiry, qty, cost) VALUES ($1,$2,$3,$4,$5)`,
            [productId, it.batch_no || null, it.expiry || null, addedQty, Number(it.unit_cost ?? it.unit_price ?? 0) || 0]
          );
          const { rows } = await db.query(`SELECT * FROM batches ORDER BY id DESC LIMIT 1`);
          batch = rows[0];
        }

        await db.query(
          `INSERT INTO purchase_items (purchase_id, product_id, batch_id, qty, bonus_qty, unit_price, line_total, original_sale_price, discount1_percent, discount2_percent, gst_percent, pack_size) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [
            purchase.id,
            productId,
            batch.id,
            purchasedQty,
            bonusQty,
            Number(it.unit_cost ?? it.unit_price ?? 0) || 0,
            Number(it.line_total ?? 0) || 0,
            Number(it.selling_price ?? 0) || 0,
            Number(it.discount1 ?? 0) || 0,
            Number(it.discount2 ?? 0) || 0,
            Number(it.gst ?? 0) || 0,
            Number(it.pack_size ?? 1) || 1,
          ]
        );

        // Prefer line_total from client (it already includes GST/discounts and is independent of bonus costing).
        if (it.line_total !== undefined && it.line_total !== null) {
          total += Number(it.line_total) || 0;
        } else {
          total += purchasedQty * (Number(it.unit_price) || 0);
        }
      }

      await db.query(`UPDATE purchases SET total=$1 WHERE id=$2`, [total, purchase.id]);
      // audit
      try {
        await logAudit({ user_id: req.user?.id, action: "purchase.create", details: { purchase_id: purchase.id, invoice_no, supplier_id } });
      } catch (e) {
        console.error("Audit failed", e);
      }
      res.json({ ok: true, purchase_id: purchase.id });
    } catch (err) {
      console.error("Purchase creation error:", err);
      console.error("Error stack:", err.stack);
      res.status(500).json({ error: err.message || "Failed to create purchase" });
    }
  }
);

export default router;
