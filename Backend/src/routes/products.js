import express from "express";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import { body, validationResult } from "express-validator";
import { logAudit } from "../utils/audit.js";
const router = express.Router();

// Create product
router.post(
  "/",
  requireAuth,
  requireRole(["admin", "manager"]),
  [
    body("name").notEmpty().withMessage("Name is required"),
    body("formula").optional().isString(),
    body("category").optional().isString(),
    body("gst_percentage").optional().isFloat({ min: 0 }),
    body("pack_size").optional().isInt({ min: 1 }),
    body("mrp").optional().isFloat({ min: 0 }),
    body("selling_price").optional().isFloat({ min: 0 }),
    body("purchase_price").optional().isFloat({ min: 0 }),
    body("pack_sale_price").optional().isFloat({ min: 0 }),
    body("purchase_percent").optional().isFloat({ min: 0 }),
    body("opening_qty").optional().isInt({ min: 0 }),
    body("min_level").optional().isInt({ min: 0 }),
    body("def_discount").optional().isFloat({ min: 0 }),
    body("active").optional().isBoolean(),
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: "Validation failed", details: errors.array() });
    const {
      name, formula, category, gst_percentage, pack_size, mrp, selling_price, supplier_id,
      ac_unit, purchase_percent, pack_sale_price, purchase_price, opening_qty, min_level,
      brand, batch_no, expiry_date, shelf, active, def_discount, barcode,
      from_date, to_date, expiry_by_brand
    } = req.body;
    try {
      const { rows: inserted } = await db.query(
        `INSERT INTO products (
          name, formula, category, gst_percentage, pack_size, mrp, selling_price, supplier_id,
          ac_unit, purchase_percent, pack_sale_price, purchase_price, opening_qty, min_level,
          brand, batch_no, expiry_date, shelf, active, def_discount, barcode,
          from_date, to_date, expiry_by_brand
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,
          $9,$10,$11,$12,$13,$14,
          $15,$16,$17,$18,$19,$20,$21,
          $22,$23,$24
        ) RETURNING id`,
        [
          name, formula || null, category || null, gst_percentage ?? null, pack_size || 1, mrp || 0, selling_price || 0, supplier_id || null,
          ac_unit || null, purchase_percent || 0, pack_sale_price || 0, purchase_price || 0, opening_qty || 0, min_level || 0,
          brand || null, batch_no || null, expiry_date || null, shelf || null, active !== false, def_discount || 0, barcode || null,
          from_date || null, to_date || null, expiry_by_brand || null
        ]
      );
      const { rows } = await db.query(`SELECT p.*, s.name AS supplier_name FROM products p LEFT JOIN suppliers s ON p.supplier_id = s.id WHERE p.id = $1`, [inserted[0].id]);
      const created = rows[0];
      try {
        await logAudit({ user_id: req.user?.id, action: "product.create", details: created });
      } catch (e) {
        console.error("Audit logging failed", e);
      }
      res.json(created);
    } catch (err) {
      next(err);
    }
  }
);

// All distinct categories (used by stock report dropdown)
router.get("/categories", async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT DISTINCT TRIM(category) AS category FROM products WHERE category IS NOT NULL AND TRIM(category) <> '' ORDER BY 1`
    );
    res.json(rows.map(r => r.category));
  } catch (err) {
    next(err);
  }
});

// List / search products (public - no auth required)
router.get("/", async (req, res, next) => {
  const q = req.query.q || "";
  const supplier_id = req.query.supplier_id ? parseInt(req.query.supplier_id, 10) : null;
  try {
    const searchTerm = `%${q}%`;
    let searchSql, params;
    if (supplier_id) {
      searchSql = `SELECT p.*, s.name AS supplier_name FROM products p LEFT JOIN suppliers s ON p.supplier_id = s.id WHERE p.supplier_id = $2 AND (p.name ILIKE $1 OR p.formula ILIKE $1 OR p.category ILIKE $1) ORDER BY p.name LIMIT 500`;
      params = [searchTerm, supplier_id];
    } else {
      searchSql = `SELECT p.*, s.name AS supplier_name FROM products p LEFT JOIN suppliers s ON p.supplier_id = s.id WHERE p.name ILIKE $1 OR p.formula ILIKE $1 OR p.category ILIKE $1 ORDER BY p.name LIMIT 500`;
      params = [searchTerm];
    }
    const { rows } = await db.query(searchSql, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Update product
router.put(
  "/:id",
  requireAuth,
  requireRole(["admin", "manager"]),
  async (req, res, next) => {
    const { id } = req.params;
    const {
      name, formula, category, gst_percentage, pack_size, mrp, selling_price, supplier_id,
      ac_unit, purchase_percent, pack_sale_price, purchase_price, opening_qty, min_level,
      brand, batch_no, expiry_date, shelf, active, def_discount, barcode,
      from_date, to_date, expiry_by_brand
    } = req.body;
    try {
      const { rows } = await db.query(
        `UPDATE products SET
          name=$1, formula=$2, category=$3, gst_percentage=$4, pack_size=$5, mrp=$6, selling_price=$7, supplier_id=$8,
          ac_unit=$9, purchase_percent=$10, pack_sale_price=$11, purchase_price=$12, opening_qty=$13, min_level=$14,
          brand=$15, batch_no=$16, expiry_date=$17, shelf=$18, active=$19, def_discount=$20, barcode=$21,
          from_date=$22, to_date=$23, expiry_by_brand=$24
        WHERE id=$25 RETURNING *`,
        [
          name, formula || null, category || null, gst_percentage ?? null, pack_size || 1, mrp || 0, selling_price || 0, supplier_id || null,
          ac_unit || null, purchase_percent || 0, pack_sale_price || 0, purchase_price || 0, opening_qty || 0, min_level || 0,
          brand || null, batch_no || null, expiry_date || null, shelf || null, active !== false, def_discount || 0, barcode || null,
          from_date || null, to_date || null, expiry_by_brand || null,
          id
        ]
      );
      if (rows.length === 0) return res.status(404).json({ error: "Product not found" });
      // Propagate category + formula to other products with same name that are missing them
      if (name) {
        if (category) {
          await db.query(
            `UPDATE products SET category = $1 WHERE LOWER(TRIM(name)) = LOWER(TRIM($2)) AND id != $3 AND (category IS NULL OR TRIM(category) = '')`,
            [category, name, id]
          ).catch(() => {});
        }
        if (formula) {
          await db.query(
            `UPDATE products SET formula = $1 WHERE LOWER(TRIM(name)) = LOWER(TRIM($2)) AND id != $3 AND (formula IS NULL OR TRIM(formula) = '')`,
            [formula, name, id]
          ).catch(() => {});
        }
      }
      await logAudit({ user_id: req.user?.id, action: "product.update", details: rows[0] }).catch(() => {});
      res.json(rows[0]);
    } catch (err) {
      next(err);
    }
  }
);

// Delete product
router.delete(
  "/:id",
  requireAuth,
  requireRole(["admin"]),
  async (req, res, next) => {
    const { id } = req.params;
    const forceDeactivate = req.query.deactivate === "true";
    try {
      if (forceDeactivate) {
        // Soft delete: just mark inactive
        const { rows } = await db.query(
          `UPDATE products SET active = false WHERE id = $1 RETURNING *`, [id]
        );
        if (rows.length === 0) return res.status(404).json({ error: "Product not found" });
        await logAudit({ user_id: req.user?.id, action: "product.deactivate", details: rows[0] }).catch(() => {});
        return res.json({ success: true, deactivated: true });
      }
      // Try hard delete first
      const { rows } = await db.query(`DELETE FROM products WHERE id=$1 RETURNING *`, [id]);
      if (rows.length === 0) return res.status(404).json({ error: "Product not found" });
      await logAudit({ user_id: req.user?.id, action: "product.delete", details: rows[0] }).catch(() => {});
      res.json({ success: true });
    } catch (err) {
      // If foreign key constraint error, inform frontend
      if (err.code === "23503") {
        return res.status(409).json({
          error: "Cannot delete: this product has purchase/sale records. You can deactivate it instead.",
          canDeactivate: true
        });
      }
      next(err);
    }
  }
);

export default router;
