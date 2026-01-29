import express from "express";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";

const router = express.Router();

// GET /api/audit?limit=100
router.get("/", requireAuth, requireRole(["admin", "manager"]), async (req, res, next) => {
  const limit = Math.min(1000, Number(req.query.limit) || 200);
  try {
    const { rows } = await db.query(`SELECT a.*, u.username FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id ORDER BY a.created_at DESC LIMIT $1`, [limit]);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

export default router;
