import express from "express";
import db from "../db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { body, validationResult } from "express-validator";
import { requireAuth } from "../middleware/auth.js";

dotenv.config();
const router = express.Router();

// Simple login endpoint - assumes users table exists with username/password(hash)
router.post(
  "/login",
  [body("username").notEmpty(), body("password").notEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { username, password } = req.body;
    try {
        // allow login using username, CNIC (with or without dashes), or CNIC name
        const cleaned = (username || '').toString().replace(/\D/g, '');
        const { rows } = await db.query(
          `SELECT * FROM users WHERE username = $1 OR cnic = $1 OR cnic_name = $1 OR regexp_replace(cnic, '\\D', '', 'g') = $2 LIMIT 1`,
          [username, cleaned]
        );
        const user = rows[0];
      if (!user) return res.status(401).json({ error: "Invalid credentials" });

      const ok = await bcrypt.compare(password, user.password);
      if (!ok) return res.status(401).json({ error: "Invalid credentials" });

      const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || "7d",
      });
      res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// Verify token endpoint
router.get("/verify", requireAuth, async (req, res) => {
  try {
    // Token is valid (verified by requireAuth middleware)
    res.json({ valid: true, user: req.user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
