import express from "express";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import { body, validationResult } from "express-validator";

const router = express.Router();

function isIsoDate(value) {
	return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function toIsoDateString(d) {
	const pad = (n) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// GET /expenses?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get("/", requireAuth, requireRole(["admin", "manager"]), async (req, res) => {
	try {
		const now = new Date();
		const defaultTo = toIsoDateString(now);
		const thirtyDaysAgo = new Date(now);
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
		const defaultFrom = toIsoDateString(thirtyDaysAgo);

		const from = isIsoDate(req.query.from) ? req.query.from : defaultFrom;
		const to = isIsoDate(req.query.to) ? req.query.to : defaultTo;

		const { rows } = await db.query(
			`SELECT e.id, e.user_id, u.username, e.amount, e.description, e.created_at
       FROM expenses e
       LEFT JOIN users u ON u.id = e.user_id
       WHERE DATE(e.created_at) >= DATE($1) AND DATE(e.created_at) <= DATE($2)
       ORDER BY e.created_at DESC, e.id DESC
       LIMIT 500`,
			[from, to]
		);

		res.json({ from, to, rows });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Server error" });
	}
});

// POST /expenses { amount, description }
router.post(
	"/",
	requireAuth,
	requireRole(["admin", "manager"]),
	[
		body("amount").isFloat({ min: 0.01 }).withMessage("amount must be > 0"),
		body("description").optional().isString(),
	],
	async (req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) return res.status(400).json({ error: "Validation failed", details: errors.array() });

		try {
			const userId = req.user?.id || null;
			const amount = Number(req.body.amount);
			const description = String(req.body.description || "");

			await db.query(`INSERT INTO expenses (user_id, amount, description) VALUES ($1, $2, $3)`, [userId, amount, description]);
			const { rows } = await db.query(
				`SELECT e.id, e.user_id, u.username, e.amount, e.description, e.created_at
         FROM expenses e
         LEFT JOIN users u ON u.id = e.user_id
         ORDER BY e.id DESC
         LIMIT 1`
			);
			res.json({ ok: true, expense: rows[0] });
		} catch (err) {
			console.error(err);
			res.status(500).json({ error: "Server error" });
		}
	}
);

export default router;
