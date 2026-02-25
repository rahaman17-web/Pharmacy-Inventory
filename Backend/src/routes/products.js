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
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: "Validation failed", details: errors.array() });
    const { name, formula, category, gst_percentage, pack_size, mrp, selling_price, supplier_id } = req.body;
    try {
      const insertResult = await db.query(
        `INSERT INTO products (name, formula, category, gst_percentage, pack_size, mrp, selling_price, supplier_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [name, formula || null, category || null, gst_percentage ?? null, pack_size || 1, mrp || 0, selling_price || 0, supplier_id || null]
      );
      // Query to get the inserted product
      const { rows } = await db.query(`SELECT p.*, s.name AS supplier_name FROM products p LEFT JOIN suppliers s ON p.supplier_id = s.id WHERE p.name = $1`, [name]);
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

// List / search products (public - no auth required)
router.get("/", async (req, res, next) => {
  const q = req.query.q || "";
  const supplier_id = req.query.supplier_id ? parseInt(req.query.supplier_id, 10) : null;
  try {
    const searchTerm = `%${q}%`;
    let searchSql, params;
    if (supplier_id) {
      searchSql = `SELECT p.*, s.name AS supplier_name FROM products p LEFT JOIN suppliers s ON p.supplier_id = s.id WHERE p.supplier_id = $2 AND (p.name ILIKE $1 OR p.formula ILIKE $1 OR p.category ILIKE $1) ORDER BY p.name LIMIT 100`;
      params = [searchTerm, supplier_id];
    } else {
      searchSql = `SELECT p.*, s.name AS supplier_name FROM products p LEFT JOIN suppliers s ON p.supplier_id = s.id WHERE p.name ILIKE $1 OR p.formula ILIKE $1 OR p.category ILIKE $1 ORDER BY p.name LIMIT 100`;
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
    const { name, formula, category, gst_percentage, pack_size, mrp, selling_price, supplier_id } = req.body;
    try {
      const { rows } = await db.query(
        `UPDATE products SET name=$1, formula=$2, category=$3, gst_percentage=$4, pack_size=$5, mrp=$6, selling_price=$7, supplier_id=$8 WHERE id=$9 RETURNING *`,
        [name, formula || null, category || null, gst_percentage ?? null, pack_size || 1, mrp || 0, selling_price || 0, supplier_id || null, id]
      );
      if (rows.length === 0) return res.status(404).json({ error: "Product not found" });
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
    try {
      const { rows } = await db.query(`DELETE FROM products WHERE id=$1 RETURNING *`, [id]);
      if (rows.length === 0) return res.status(404).json({ error: "Product not found" });
      await logAudit({ user_id: req.user?.id, action: "product.delete", details: rows[0] }).catch(() => {});
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
