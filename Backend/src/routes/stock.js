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

    const sql = `SELECT b.id as batch_id, p.id as product_id, p.name as product_name, ${formulaExpr}, p.selling_price, b.batch_no, b.expiry, b.qty, b.cost
       FROM batches b
       JOIN products p ON p.id = b.product_id
       ORDER BY p.name, COALESCE(b.expiry, '9999-12-31')`;

    const { rows } = await db.query(sql);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
