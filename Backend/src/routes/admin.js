import express from "express";
import db from "../db.js";
import bcrypt from "bcrypt";
import { body, validationResult } from "express-validator";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";

const router = express.Router();

// Repair endpoint: fix negative sale_items.qty and recompute sale totals
router.post("/repair", requireAuth, requireRole(["admin"]), async (req, res) => {
  try {
    // Fix negative quantities
    await db.query(`UPDATE sale_items SET qty = 0 WHERE qty < 0`);

    // Ensure no NULL qty
    await db.query(`UPDATE sale_items SET qty = 0 WHERE qty IS NULL`);

    // Recompute sales totals for affected sales
    const { rows: saleIds } = await db.query(`SELECT DISTINCT sale_id FROM sale_items`);
    for (const s of saleIds) {
      const saleId = s.sale_id ?? s.SALE_ID;
      const { rows: itemAgg } = await db.query(
        `SELECT COALESCE(SUM(qty * unit_price), 0) AS total FROM sale_items WHERE sale_id = $1`,
        [saleId]
      );
      const total = Number(itemAgg?.[0]?.total || 0);
      const { rows: saleRows } = await db.query('SELECT discount FROM sales WHERE id = $1 LIMIT 1', [saleId]);
      const existingDiscount = Number(saleRows?.[0]?.discount || 0);
      const discount = Math.max(0, Math.min(existingDiscount, total));
      const net = total - discount;
      await db.query('UPDATE sales SET total = $1, discount = $2, net_total = $3 WHERE id = $4', [total, discount, net, saleId]);
    }

    res.json({ ok: true, message: 'Repair completed' });
  } catch (err) {
    console.error('Repair failed', err);
    res.status(500).json({ error: err.message || 'Repair failed' });
  }
});

// --- User management (admin-only) ---

// List users
router.get(
  "/users",
  requireAuth,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const { rows } = await db.query("SELECT id, username, role, cnic, cnic_name, emp_id, created_at FROM users ORDER BY id DESC");
      res.json(rows);
    } catch (err) {
      console.error("List users failed", err);
      res.status(500).json({ error: "Failed to list users" });
    }
  }
);

// Verify admin password (re-prompt) - admin must be logged in
router.post(
  "/verify-password",
  requireAuth,
  requireRole(["admin"]),
  async (req, res) => {
    const { password } = req.body || {};
    if (!password) return res.status(400).json({ error: "Password required" });
    try {
      const { rows } = await db.query("SELECT password FROM users WHERE id = $1 LIMIT 1", [req.user.id]);
      const user = rows[0];
      if (!user) return res.status(404).json({ error: "User not found" });
      const ok = await bcrypt.compare(password, user.password);
      if (!ok) return res.status(401).json({ error: "Invalid password" });
      res.json({ ok: true });
    } catch (err) {
      console.error('Verify password failed', err);
      res.status(500).json({ error: 'Failed to verify password' });
    }
  }
);

// Create user
router.post(
  "/users",
  requireAuth,
  requireRole(["admin"]),
  [body("username").notEmpty(), body("cnic").notEmpty(), body("cnic_name").notEmpty(), body("emp_id").notEmpty(), body("role").optional()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { username, cnic, cnic_name, role } = req.body;
    try {
      // normalize cnic digits and extract last 3 digits
      const digits = (cnic || "").toString().replace(/\D/g, "");
      if (digits.length < 3) return res.status(400).json({ error: "CNIC must contain at least 3 digits" });
      const last3 = digits.slice(-3);

      // ensure username, cnic, emp_id and last3 are unique
      const { rows: sameUser } = await db.query("SELECT id FROM users WHERE username = $1", [username]);
      if (sameUser && sameUser.length > 0) return res.status(400).json({ error: "Username already exists" });

      const { rows: sameCnic } = await db.query("SELECT id FROM users WHERE cnic = $1", [cnic]);
      if (sameCnic && sameCnic.length > 0) return res.status(400).json({ error: "CNIC already registered" });

      const { rows: sameEmp } = await db.query("SELECT id FROM users WHERE emp_id = $1", [req.body.emp_id]);
      if (sameEmp && sameEmp.length > 0) return res.status(400).json({ error: "Employee ID already registered" });

      const { rows: sameLast } = await db.query("SELECT id FROM users WHERE cnic_last3 = $1", [last3]);
      if (sameLast && sameLast.length > 0) return res.status(400).json({ error: "Another user already has the same CNIC last 3 digits" });

      const hash = await bcrypt.hash(last3, 10);
      await db.query(
        "INSERT INTO users (username, password, role, cnic, cnic_name, cnic_last3, emp_id) VALUES ($1,$2,$3,$4,$5,$6,$7)",
        [username, hash, role, cnic, cnic_name, last3, req.body.emp_id]
      );
      res.json({ ok: true, username, role, default_password_hint: "last 3 digits of CNIC" });
    } catch (err) {
      console.error("Create user failed", err);
      res.status(500).json({ error: "Failed to create user" });
    }
  }
);

// Update user (password or role)
router.patch(
  "/users/:id",
  requireAuth,
  requireRole(["admin"]),
  async (req, res) => {
    const id = req.params.id;
    const { password, role, cnic, cnic_name, emp_id } = req.body;
    try {
      const updates = [];
      const params = [];
      if (password) {
        const hash = await bcrypt.hash(password, 10);
        params.push(hash);
        updates.push(`password = $${params.length}`);
      }
      if (role) {
        params.push(role);
        updates.push(`role = $${params.length}`);
      }
      if (cnic) {
        const digits = (cnic || "").toString().replace(/\D/g, "");
        if (digits.length < 3) return res.status(400).json({ error: "CNIC must contain at least 3 digits" });
        const last3 = digits.slice(-3);
        // check uniqueness of cnic and last3 (ignore current user)
        const { rows: sameCnic } = await db.query("SELECT id FROM users WHERE cnic = $1 AND id != $2", [cnic, id]);
        if (sameCnic && sameCnic.length > 0) return res.status(400).json({ error: "CNIC already registered to another user" });
        const { rows: sameLast } = await db.query("SELECT id FROM users WHERE cnic_last3 = $1 AND id != $2", [last3, id]);
        if (sameLast && sameLast.length > 0) return res.status(400).json({ error: "Another user already has the same CNIC last 3 digits" });
        params.push(cnic);
        updates.push(`cnic = $${params.length}`);
        params.push(cnic_name || null);
        updates.push(`cnic_name = $${params.length}`);
        params.push(last3);
        updates.push(`cnic_last3 = $${params.length}`);
        // emp_id uniqueness
        params.push(emp_id || null);
        updates.push(`emp_id = $${params.length}`);
      } else if (cnic_name) {
        params.push(cnic_name);
        updates.push(`cnic_name = $${params.length}`);
      } else if (emp_id) {
        params.push(emp_id);
        updates.push(`emp_id = $${params.length}`);
      }
      if (updates.length === 0) return res.status(400).json({ error: "Nothing to update" });
      params.push(id);
      const sql = `UPDATE users SET ${updates.join(",")} WHERE id = $${params.length}`;
      await db.query(sql, params);
      res.json({ ok: true });
    } catch (err) {
      console.error("Update user failed", err);
      res.status(500).json({ error: "Failed to update user" });
    }
  }
);

// Delete user
router.delete(
  "/users/:id",
  requireAuth,
  requireRole(["admin"]),
  async (req, res) => {
    const id = req.params.id;
    try {
      await db.query("DELETE FROM users WHERE id = $1", [id]);
      res.json({ ok: true });
    } catch (err) {
      console.error("Delete user failed", err);
      res.status(500).json({ error: "Failed to delete user" });
    }
  }
);

export default router;
