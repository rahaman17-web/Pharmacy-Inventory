import express from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import authRoutes from "./routes/auth.js";
import usersRoutes from "./routes/users.js";
import productsRoutes from "./routes/products.js";
import purchasesRoutes from "./routes/purchases.js";
import suppliersRoutes from "./routes/suppliers.js";
import salesRoutes from "./routes/sales.js";
import stockRoutes from "./routes/stock.js";
import reportsRoutes from "./routes/reports.js";
import auditRoutes from "./routes/audit.js";
import returnsRoutes from "./routes/returns.js";
import expensesRoutes from "./routes/expenses.js";
import adminRoutes from "./routes/admin.js";
import errorHandler from "./middleware/errorHandler.js";
import ensureSchema from "./initSchema.js";

dotenv.config();

const app = express();
app.use(bodyParser.json());

// Ensure DB schema is up-to-date (non-blocking) before mounting routes
(async () => {
	try {
		await ensureSchema();
	} catch (e) {
		console.error('Schema initialization error:', e && e.message ? e.message : e);
	}
})();

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/purchases", purchasesRoutes);
app.use("/api/suppliers", suppliersRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/stock", stockRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/returns", returnsRoutes);
app.use("/api/expenses", expensesRoutes);
app.use("/api/admin", adminRoutes);

// error handler (must be last)
app.use(errorHandler);

app.get("/api/health", (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4000;
if (process.env.NODE_ENV !== "test") {
	app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

export default app;
