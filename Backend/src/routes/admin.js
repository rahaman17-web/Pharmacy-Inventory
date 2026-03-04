import express from "express";
import db from "../db.js";
import bcrypt from "bcrypt";
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
      const { rows } = await db.query("SELECT id, username, role, cnic, cnic_name, emp_id, address, contact_no, father_contact_no, created_at FROM users ORDER BY id DESC");
      res.json(rows);
    } catch (err) {
      console.error("List users failed", err);
      res.status(500).json({ error: "Failed to list users" });
    }
  }
);

// Verify panel PIN — if a panel_pin is set use it, otherwise fall back to login password
router.post(
  "/verify-password",
  requireAuth,
  requireRole(["admin"]),
  async (req, res) => {
    const { password } = req.body || {};
    if (!password) return res.status(400).json({ error: "Password required" });
    try {
      const { rows } = await db.query("SELECT password, panel_pin FROM users WHERE id = $1 LIMIT 1", [req.user.id]);
      const user = rows[0];
      if (!user) return res.status(404).json({ error: "User not found" });
      // If a panel PIN has been set, verify against it; otherwise fall back to login password
      const hashToCheck = user.panel_pin || user.password;
      const ok = await bcrypt.compare(password, hashToCheck);
      if (!ok) return res.status(401).json({ error: "Incorrect PIN" });
      res.json({ ok: true, usingPin: !!user.panel_pin });
    } catch (err) {
      console.error('Verify password failed', err);
      res.status(500).json({ error: 'Failed to verify' });
    }
  }
);

// Set / change the panel PIN
router.post(
  "/set-pin",
  requireAuth,
  requireRole(["admin"]),
  async (req, res) => {
    const { current_password, new_pin } = req.body || {};
    if (!current_password) return res.status(400).json({ error: "Current login password required" });
    if (!new_pin || new_pin.toString().trim().length < 4)
      return res.status(400).json({ error: "PIN must be at least 4 characters" });
    try {
      // Always verify current LOGIN password before allowing PIN change
      const { rows } = await db.query("SELECT password FROM users WHERE id = $1 LIMIT 1", [req.user.id]);
      const user = rows[0];
      if (!user) return res.status(404).json({ error: "User not found" });
      const ok = await bcrypt.compare(current_password, user.password);
      if (!ok) return res.status(401).json({ error: "Incorrect login password" });
      const hash = await bcrypt.hash(new_pin.toString(), 10);
      await db.query("UPDATE users SET panel_pin = $1 WHERE id = $2", [hash, req.user.id]);
      res.json({ ok: true });
    } catch (err) {
      console.error('Set PIN failed', err);
      res.status(500).json({ error: 'Failed to set PIN' });
    }
  }
);

// Create user
router.post(
  "/users",
  requireAuth,
  requireRole(["admin"]),
  async (req, res) => {
    const { name, cnic, role, address, contact_no, father_contact_no, password } = req.body;
    const emp_id = req.body.emp_id;
    if (!name || !name.trim()) return res.status(400).json({ error: "Name is required" });
    if (!cnic || !cnic.trim()) return res.status(400).json({ error: "CNIC is required" });
    if (!emp_id || !emp_id.toString().trim()) return res.status(400).json({ error: "User ID is required" });
    if (!password || !password.trim()) return res.status(400).json({ error: "Password is required" });
    // username = name (used as login identifier)
    const username = name.trim();
    try {
      // normalize cnic digits and extract last 3 digits
      const digits = (cnic || "").toString().replace(/\D/g, "");
      if (digits.length < 3) return res.status(400).json({ error: "CNIC must contain at least 3 digits" });
      const last3 = digits.slice(-3);

      // ensure username, cnic, emp_id and last3 are unique
      const { rows: sameUser } = await db.query("SELECT id FROM users WHERE username = $1", [username]);
      if (sameUser && sameUser.length > 0) return res.status(400).json({ error: "Name already exists" });

      const { rows: sameCnic } = await db.query("SELECT id FROM users WHERE cnic = $1", [cnic]);
      if (sameCnic && sameCnic.length > 0) return res.status(400).json({ error: "CNIC already registered" });

      const { rows: sameEmp } = await db.query("SELECT id FROM users WHERE emp_id = $1", [emp_id]);
      if (sameEmp && sameEmp.length > 0) return res.status(400).json({ error: "User ID already registered" });

      const { rows: sameLast } = await db.query("SELECT id FROM users WHERE cnic_last3 = $1", [last3]);
      if (sameLast && sameLast.length > 0) return res.status(400).json({ error: "Another user already has the same CNIC last 3 digits" });

      const hash = await bcrypt.hash(password, 10);
      await db.query(
        "INSERT INTO users (username, password, role, cnic, cnic_name, cnic_last3, emp_id, address, contact_no, father_contact_no) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
        [username, hash, role || "user", cnic, username, last3, emp_id, address || null, contact_no || null, father_contact_no || null]
      );
      res.json({ ok: true, username, role });
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
    const { password, role, cnic, cnic_name, emp_id, name, address, contact_no, father_contact_no } = req.body;
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
      // name updates both username and cnic_name
      const effectiveName = name || cnic_name;
      if (effectiveName) {
        params.push(effectiveName.trim());
        updates.push(`username = $${params.length}`);
        params.push(effectiveName.trim());
        updates.push(`cnic_name = $${params.length}`);
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
        params.push(last3);
        updates.push(`cnic_last3 = $${params.length}`);
      }
      if (emp_id !== undefined) {
        params.push(emp_id || null);
        updates.push(`emp_id = $${params.length}`);
      }
      if (address !== undefined) {
        params.push(address || null);
        updates.push(`address = $${params.length}`);
      }
      if (contact_no !== undefined) {
        params.push(contact_no || null);
        updates.push(`contact_no = $${params.length}`);
      }
      if (father_contact_no !== undefined) {
        params.push(father_contact_no || null);
        updates.push(`father_contact_no = $${params.length}`);
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
    // Prevent self-deletion
    if (String(id) === String(req.user.id)) {
      return res.status(400).json({ error: "You cannot delete your own account" });
    }
    try {
      // Block deleting any admin-role user
      const { rows } = await db.query("SELECT role FROM users WHERE id = $1 LIMIT 1", [id]);
      if (!rows[0]) return res.status(404).json({ error: "User not found" });
      if (rows[0].role === "admin") {
        return res.status(400).json({ error: "Admin accounts cannot be deleted" });
      }
      await db.query("DELETE FROM users WHERE id = $1", [id]);
      res.json({ ok: true });
    } catch (err) {
      console.error("Delete user failed", err);
      res.status(500).json({ error: "Failed to delete user" });
    }
  }
);

export default router;
