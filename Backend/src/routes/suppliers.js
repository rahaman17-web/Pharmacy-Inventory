import express from "express";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";
const router = express.Router();

// GET /api/suppliers?q=term  — returns full details + computed final_balance
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const q = (req.query.q || "").toString().trim();
    const like = `%${q}%`;
    const { rows } = await db.query(
      `SELECT s.id, s.name, s.phone, s.address, s.opening_balance,
              COALESCE(SUM(p.total), 0) AS total_billed,
              COALESCE((SELECT SUM(sr.total_amount) FROM supplier_returns sr WHERE sr.supplier_id = s.id), 0) AS total_returned
         FROM suppliers s
         LEFT JOIN purchases p ON p.supplier_id = s.id
        WHERE s.name ILIKE $1
        GROUP BY s.id
        ORDER BY s.name
        LIMIT 500`,
      [like]
    );
    const suppliers = rows.map(r => ({
      id: r.id,
      name: r.name,
      phone: r.phone || "",
      address: r.address || "",
      opening_balance: Number(r.opening_balance) || 0,
      total_billed: Number(r.total_billed) || 0,
      total_returned: Number(r.total_returned) || 0,
      final_balance: (Number(r.opening_balance) || 0) + (Number(r.total_billed) || 0) - (Number(r.total_returned) || 0),
    }));
    res.json(suppliers);
  } catch (err) {
    console.error('Suppliers lookup failed', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/suppliers — create supplier
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { name, phone, address, opening_balance } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: "Company name is required" });
    const dup = await db.query(`SELECT id FROM suppliers WHERE LOWER(name)=LOWER($1)`, [name.trim()]);
    if (dup.rows.length) return res.status(409).json({ error: "A supplier with this name already exists" });
    const { rows } = await db.query(
      `INSERT INTO suppliers (name, phone, address, opening_balance) VALUES ($1,$2,$3,$4) RETURNING *`,
      [name.trim(), phone || null, address || null, Number(opening_balance) || 0]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/suppliers/:id — update supplier
router.put("/:id", requireAuth, async (req, res, next) => {
  try {
    const { name, phone, address, opening_balance } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: "Company name is required" });
    const dup = await db.query(`SELECT id FROM suppliers WHERE LOWER(name)=LOWER($1) AND id<>$2`, [name.trim(), req.params.id]);
    if (dup.rows.length) return res.status(409).json({ error: "A supplier with this name already exists" });
    const { rows } = await db.query(
      `UPDATE suppliers SET name=$1, phone=$2, address=$3, opening_balance=$4 WHERE id=$5 RETURNING *`,
      [name.trim(), phone || null, address || null, Number(opening_balance) || 0, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Supplier not found" });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/suppliers/:id
router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    await db.query(`DELETE FROM suppliers WHERE id=$1`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
