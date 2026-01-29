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
    const { name, formula, category, gst_percentage, pack_size, mrp, selling_price } = req.body;
    try {
      const insertResult = await db.query(
        `INSERT INTO products (name, formula, category, gst_percentage, pack_size, mrp, selling_price) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [name, formula || null, category || null, gst_percentage ?? null, pack_size || 1, mrp || 0, selling_price || 0]
      );
      // Query to get the inserted product
      const { rows } = await db.query(`SELECT * FROM products WHERE name = $1`, [name]);
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
  try {
    const searchTerm = `%${q}%`;
    // Detect DB type: for Postgres migrations create `formula` and `category` columns
    const searchSql = `SELECT * FROM products WHERE name ILIKE $1 OR formula ILIKE $1 OR category ILIKE $1 ORDER BY name LIMIT 100`;

    const { rows } = await db.query(searchSql, [searchTerm]);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

export default router;
