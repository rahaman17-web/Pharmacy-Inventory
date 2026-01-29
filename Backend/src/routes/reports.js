import express from "express";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";

const router = express.Router();

function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function isIsoDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function toIsoDateString(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Aggregated sales per user
router.get("/user-sales", requireAuth, requireRole(["admin", "manager"]), async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT u.id as user_id, u.username, COUNT(s.id) as sales_count, COALESCE(SUM(s.net_total),0) as total_sales
       FROM users u
       LEFT JOIN sales s ON s.user_id = u.id
       GROUP BY u.id, u.username
       ORDER BY total_sales DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Sales report in a date range (inclusive)
// GET /reports/sales?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get("/sales", requireAuth, requireRole(["admin", "manager"]), async (req, res) => {
  try {
    const now = new Date();
    const defaultTo = toIsoDateString(now);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const defaultFrom = toIsoDateString(thirtyDaysAgo);

    const from = isIsoDate(req.query.from) ? req.query.from : defaultFrom;
    const to = isIsoDate(req.query.to) ? req.query.to : defaultTo;

    const { rows } = await db.query(
      `SELECT s.id as sale_id, s.created_at, s.user_id, u.username, s.total, s.discount, s.net_total
       FROM sales s
       LEFT JOIN users u ON u.id = s.user_id
       WHERE DATE(s.created_at) >= DATE($1) AND DATE(s.created_at) <= DATE($2)
       ORDER BY s.created_at DESC, s.id DESC`,
      [from, to]
    );

    // Summary (numbers are computed from source-of-truth: sale_items)
    // Use original quantities (current qty + returned qty) to get true gross sales
    const { rows: salesAggRows } = await db.query(
      `SELECT
          COALESCE(SUM(
            (COALESCE(si.qty, 0) + COALESCE((SELECT SUM(ri.qty) FROM return_items ri WHERE ri.sale_item_id = si.id), 0)) * si.unit_price
          ), 0) AS gross_sales,
          COALESCE(SUM(
            (COALESCE(si.qty, 0) + COALESCE((SELECT SUM(ri.qty) FROM return_items ri WHERE ri.sale_item_id = si.id), 0)) * si.unit_price * COALESCE(si.discount_percent, 0) / 100
          ), 0) AS discounts,
          COALESCE(SUM(
            (COALESCE(si.qty, 0) + COALESCE((SELECT SUM(ri.qty) FROM return_items ri WHERE ri.sale_item_id = si.id), 0)) * si.unit_price * (1 - COALESCE(si.discount_percent, 0) / 100)
          ), 0) AS net_sales
       FROM sales s
       JOIN sale_items si ON si.sale_id = s.id
       WHERE DATE(s.created_at) >= DATE($1) AND DATE(s.created_at) <= DATE($2)`,
      [from, to]
    );

    // COGS for sales in range (reconstruct original sold qty as: current qty + all returned qty for that sale_item)
    const { rows: cogsSalesRows } = await db.query(
      `SELECT
          COALESCE(SUM(
            COALESCE(si.unit_cost, b.cost, 0) *
            (COALESCE(si.qty, 0) + COALESCE((SELECT SUM(ri.qty) FROM return_items ri WHERE ri.sale_item_id = si.id), 0))
          ), 0) AS cogs_sales
       FROM sales s
       JOIN sale_items si ON si.sale_id = s.id
       LEFT JOIN batches b ON b.id = si.batch_id
       WHERE DATE(s.created_at) >= DATE($1) AND DATE(s.created_at) <= DATE($2)`,
      [from, to]
    );

    const { rows: missingCogsRows } = await db.query(
      `SELECT
          COALESCE(SUM(
            CASE
              WHEN COALESCE(si.unit_cost, b.cost, 0) <= 0
               AND (COALESCE(si.qty, 0) + COALESCE((SELECT SUM(ri.qty) FROM return_items ri WHERE ri.sale_item_id = si.id), 0)) > 0
              THEN 1 ELSE 0
            END
          ), 0) AS missing_cost_lines
       FROM sales s
       JOIN sale_items si ON si.sale_id = s.id
       LEFT JOIN batches b ON b.id = si.batch_id
       WHERE DATE(s.created_at) >= DATE($1) AND DATE(s.created_at) <= DATE($2)`,
      [from, to]
    );

    // Returns in range based on ORIGINAL SALE DATE (not return date)
    // This ensures returns are counted in the same period as the original sale
    const { rows: returnsAggRows } = await db.query(
      `SELECT
          COALESCE(SUM(ri.qty * ri.unit_price), 0) AS returns_revenue,
          COALESCE(SUM(ri.qty * COALESCE(ri.unit_cost, si.unit_cost, b.cost, 0)), 0) AS returns_cogs
       FROM returns r
       JOIN return_items ri ON ri.return_id = r.id
       LEFT JOIN sale_items si ON si.id = ri.sale_item_id
       LEFT JOIN sales s ON s.id = r.sale_id
       LEFT JOIN batches b ON b.id = ri.batch_id
       WHERE DATE(s.created_at) >= DATE($1) AND DATE(s.created_at) <= DATE($2)`,
      [from, to]
    );

    // Expenses in range
    const { rows: expAggRows } = await db.query(
      `SELECT COALESCE(SUM(amount), 0) AS expenses
       FROM expenses
       WHERE DATE(created_at) >= DATE($1) AND DATE(created_at) <= DATE($2)`,
      [from, to]
    );

    const grossSales = toNumber(salesAggRows?.[0]?.gross_sales ?? salesAggRows?.[0]?.GROSS_SALES);
    const discounts = toNumber(salesAggRows?.[0]?.discounts ?? salesAggRows?.[0]?.DISCOUNTS);
    const netSales = toNumber(salesAggRows?.[0]?.net_sales ?? salesAggRows?.[0]?.NET_SALES);

    const cogsSales = toNumber(cogsSalesRows?.[0]?.cogs_sales ?? cogsSalesRows?.[0]?.COGS_SALES);
    const missingCostLines = toNumber(missingCogsRows?.[0]?.missing_cost_lines ?? missingCogsRows?.[0]?.MISSING_COST_LINES);
    const returnsRevenue = toNumber(returnsAggRows?.[0]?.returns_revenue ?? returnsAggRows?.[0]?.RETURNS_REVENUE);
    const returnsCogs = toNumber(returnsAggRows?.[0]?.returns_cogs ?? returnsAggRows?.[0]?.RETURNS_COGS);
    const expenses = toNumber(expAggRows?.[0]?.expenses ?? expAggRows?.[0]?.EXPENSES);

    // Correct Profit Calculation:
    // Net Profit = (Net Sales - Returns) - (COGS for sold items - COGS for returned items) - Expenses
    // This gives actual profit after all costs
    const actualRevenue = netSales - returnsRevenue; // Money actually earned after returns
    const actualCogs = cogsSales - returnsCogs; // Actual cost of goods that stayed sold
    const grossProfit = actualRevenue - actualCogs; // Profit before expenses
    const netProfit = grossProfit - expenses; // Final profit after expenses

    const summary = {
      gross_sales: grossSales,
      discounts,
      net_sales: netSales, // This is Gross Sales - Discounts
      returns: returnsRevenue,
      expenses,
      cogs: actualCogs,
      net_cash: actualRevenue - expenses, // Cash in hand after returns and expenses
      missing_cost_lines: missingCostLines,
      gross_profit: grossProfit,
      net_profit: netProfit,
    };

    res.json({ from, to, rows, summary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// User sales + returns history (date range, inclusive)
// GET /reports/user-history?user_id=123&from=YYYY-MM-DD&to=YYYY-MM-DD
router.get("/user-history", requireAuth, requireRole(["admin", "manager"]), async (req, res) => {
  try {
    const userId = Number(req.query.user_id);
    if (!Number.isFinite(userId) || userId <= 0) {
      return res.status(400).json({ error: "user_id is required" });
    }

    const now = new Date();
    const defaultTo = toIsoDateString(now);
    const defaultFrom = defaultTo;

    const from = isIsoDate(req.query.from) ? req.query.from : defaultFrom;
    const to = isIsoDate(req.query.to) ? req.query.to : defaultTo;

    const { rows: sales } = await db.query(
      `SELECT s.id as sale_id, s.created_at, s.total, s.discount, s.net_total
       FROM sales s
       WHERE s.user_id = $1
         AND DATE(s.created_at) >= DATE($2) AND DATE(s.created_at) <= DATE($3)
       ORDER BY s.created_at DESC, s.id DESC`,
      [userId, from, to]
    );

    const { rows: returns } = await db.query(
      `SELECT r.id as return_id, r.sale_id, r.total, r.reason, r.created_at
       FROM returns r
       WHERE r.user_id = $1
         AND DATE(r.created_at) >= DATE($2) AND DATE(r.created_at) <= DATE($3)
       ORDER BY r.created_at DESC, r.id DESC`,
      [userId, from, to]
    );

    res.json({ user_id: userId, from, to, sales, returns });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Item-level user history
// GET /reports/user-history-items?user_id=123&from=YYYY-MM-DD&to=YYYY-MM-DD
router.get("/user-history-items", requireAuth, requireRole(["admin", "manager"]), async (req, res) => {
  try {
    const userId = Number(req.query.user_id);
    if (!Number.isFinite(userId) || userId <= 0) {
      return res.status(400).json({ error: "user_id is required" });
    }

    const now = new Date();
    const defaultTo = toIsoDateString(now);
    const defaultFrom = defaultTo;

    const from = isIsoDate(req.query.from) ? req.query.from : defaultFrom;
    const to = isIsoDate(req.query.to) ? req.query.to : defaultTo;

    const { rows: sales_items } = await db.query(
      `SELECT
          s.id as sale_id,
          s.created_at,
          si.id as sale_item_id,
          si.product_id,
          p.name as product_name,
          si.batch_id,
          b.batch_no,
          si.qty,
          si.unit_price,
          (si.qty * si.unit_price) as line_total
       FROM sales s
       JOIN sale_items si ON si.sale_id = s.id
       JOIN products p ON p.id = si.product_id
       LEFT JOIN batches b ON b.id = si.batch_id
       WHERE s.user_id = $1
         AND DATE(s.created_at) >= DATE($2) AND DATE(s.created_at) <= DATE($3)
         AND COALESCE(si.qty, 0) > 0
       ORDER BY s.created_at DESC, s.id DESC, p.name ASC`,
      [userId, from, to]
    );

    const { rows: return_items } = await db.query(
      `SELECT
          r.id as return_id,
          r.sale_id,
          r.created_at,
          ri.id as return_item_id,
          ri.sale_item_id,
          ri.product_id,
          p.name as product_name,
          ri.batch_id,
          b.batch_no,
          ri.qty,
          ri.unit_price,
          (ri.qty * ri.unit_price) as line_total
       FROM returns r
       JOIN return_items ri ON ri.return_id = r.id
       JOIN products p ON p.id = ri.product_id
       LEFT JOIN batches b ON b.id = ri.batch_id
       WHERE r.user_id = $1
         AND DATE(r.created_at) >= DATE($2) AND DATE(r.created_at) <= DATE($3)
       ORDER BY r.created_at DESC, r.id DESC, p.name ASC`,
      [userId, from, to]
    );

    res.json({ user_id: userId, from, to, sales_items, return_items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
