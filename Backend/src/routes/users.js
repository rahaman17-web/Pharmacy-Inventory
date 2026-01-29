import express from "express";
import db from "../db.js";

const router = express.Router();

// Public list of users (id, username, cnic_name) to populate login dropdown
router.get("/", async (req, res) => {
  try {
    const { rows } = await db.query("SELECT id, username, cnic_name FROM users ORDER BY username");
    res.json(rows);
  } catch (err) {
    console.error("List public users failed", err);
    res.status(500).json({ error: "Failed to list users" });
  }
});

export default router;
