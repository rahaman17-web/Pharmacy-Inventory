import express from "express";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";
const router = express.Router();

// GET /api/suppliers?q=term
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const q = (req.query.q || "").toString().trim();
    const like = `%${q}%`;
    // Get matching suppliers from suppliers table
    const { rows: supRows } = await db.query(`SELECT id, name FROM suppliers WHERE name LIKE $1 ORDER BY name LIMIT 30`, [like]);
    const suppliers = supRows.map(r => ({ id: r.id, name: r.name }));
    res.json(suppliers);
  } catch (err) {
    console.error('Suppliers lookup failed', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
