import { useEffect, useMemo, useState } from "react";
import api from "../api";

function toIsoDateString(d) {
	const pad = (n) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function SalesReport({ onBack }) {
	const [rows, setRows] = useState([]);
	const [summary, setSummary] = useState(null);
	const [loading, setLoading] = useState(false);
	const [from, setFrom] = useState(() => {
		const now = new Date();
		const d = new Date(now);
		d.setDate(d.getDate() - 30);
		return toIsoDateString(d);
	});
	const [to, setTo] = useState(() => toIsoDateString(new Date()));

	async function load() {
		setLoading(true);
		try {
			const { data } = await api.get("/reports/sales", { params: { from, to } });
			setRows(data?.rows || []);
			setSummary(data?.summary || null);
		} catch (err) {
			console.error(err);
			alert("Failed to load sales report");
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		load();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const totals = useMemo(() => {
		const totalSales = rows.reduce((s, r) => s + Number(r.total || 0), 0);
		const totalDiscount = rows.reduce((s, r) => s + Number(r.discount || 0), 0);
		const totalNet = rows.reduce((s, r) => s + Number(r.net_total || 0), 0);
		return { totalSales, totalDiscount, totalNet };
	}, [rows]);

	const summaryView = useMemo(() => {
		if (!summary) {
			return {
				gross_sales: totals.totalSales,
				discounts: totals.totalDiscount,
				net_sales: totals.totalNet,
				returns: 0,
				expenses: 0,
				cogs: 0,
				net_cash: totals.totalNet,
				net_profit: 0,
				missing_cost_lines: 0,
			};
		}
		return {
			gross_sales: Number(summary.gross_sales || 0),
			discounts: Number(summary.discounts || 0),
			net_sales: Number(summary.net_sales || 0),
			returns: Number(summary.returns || 0),
			expenses: Number(summary.expenses || 0),
			cogs: Number(summary.cogs || 0),
			net_cash: Number(summary.net_cash || 0),
			net_profit: Number(summary.net_profit || 0),
			missing_cost_lines: Number(summary.missing_cost_lines || 0),
		};
	}, [summary, totals]);

	return (
		<div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50">
			{/* Header */}
			<div className="bg-white shadow-md border-b">
				<div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
					<div className="flex items-center space-x-4">
						<div className="p-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg">
							<svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
							</svg>
						</div>
						<div>
							<h2 className="text-2xl font-bold text-gray-800">Sales Report</h2>
							<p className="text-sm text-gray-500">From {from} to {to}</p>
						</div>
					</div>
					<button
						onClick={onBack}
						className="px-6 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all shadow-md hover:shadow-lg"
					>
						← Back
					</button>
				</div>
			</div>

			<div className="max-w-7xl mx-auto px-6 py-8">
				{/* Filters */}
				<div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
						<div>
							<label className="block text-sm font-semibold text-gray-700 mb-2">From</label>
							<input
								type="date"
								value={from}
								onChange={(e) => setFrom(e.target.value)}
								className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
							/>
						</div>
						<div>
							<label className="block text-sm font-semibold text-gray-700 mb-2">To</label>
							<input
								type="date"
								value={to}
								onChange={(e) => setTo(e.target.value)}
								className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
							/>
						</div>
						<button
							onClick={load}
							className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all shadow-md"
							disabled={loading}
						>
							{loading ? "Loading..." : "Load"}
						</button>
					</div>
				</div>

				{/* Summary (simple accounting) */}
				{summaryView.missing_cost_lines > 0 && (
					<div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl px-4 py-3 mb-6 text-sm">
						Profit may be incorrect: {summaryView.missing_cost_lines} sale lines have missing buy-cost. Fix by entering correct Purchase costs (batch cost).
					</div>
				)}
				<div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-6">
					<div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-emerald-500">
						<p className="text-gray-500 text-sm font-medium">Gross Sales</p>
						<p className="text-2xl font-bold text-gray-800 mt-1">Rs. {summaryView.gross_sales.toFixed(2)}</p>
						<p className="text-xs text-gray-500 mt-1">Before discounts</p>
					</div>
					<div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-purple-500">
						<p className="text-gray-500 text-sm font-medium">Discounts Given</p>
						<p className="text-2xl font-bold text-red-600 mt-1">- Rs. {summaryView.discounts.toFixed(2)}</p>
						<p className="text-xs text-gray-500 mt-1">Customer discounts</p>
					</div>
					<div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-blue-500">
						<p className="text-gray-500 text-sm font-medium">Net Sales (Revenue)</p>
						<p className="text-2xl font-bold text-blue-600 mt-1">Rs. {summaryView.net_sales.toFixed(2)}</p>
						<p className="text-xs text-gray-500 mt-1">After discounts</p>
					</div>
					<div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-red-500">
						<p className="text-gray-500 text-sm font-medium">Returns</p>
						<p className="text-2xl font-bold text-red-600 mt-1">- Rs. {summaryView.returns.toFixed(2)}</p>
						<p className="text-xs text-gray-500 mt-1">Refunded to customers</p>
					</div>
					<div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-orange-500">
						<p className="text-gray-500 text-sm font-medium">Expenses</p>
						<p className="text-2xl font-bold text-orange-600 mt-1">- Rs. {summaryView.expenses.toFixed(2)}</p>
						<p className="text-xs text-gray-500 mt-1">Other expenses</p>
					</div>
					<div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-green-500">
						<p className="text-gray-500 text-sm font-medium">💰 Net Profit</p>
						<p className="text-3xl font-black text-green-600 mt-1">Rs. {summaryView.net_profit.toFixed(2)}</p>
						<p className="text-xs text-gray-500 mt-1">After all costs</p>
					</div>
				</div>

				{/* Table */}
				<div className="bg-white rounded-2xl shadow-lg overflow-hidden">
					<div className="text-center py-12">
						<div className="mb-4">
							<svg className="w-16 h-16 mx-auto text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						</div>
						<h3 className="text-2xl font-bold text-gray-800 mb-2">Sales Summary Report</h3>
						<p className="text-gray-600 mb-4">
							This report shows overall sales data for the entire system from <strong>{from}</strong> to <strong>{to}</strong>
						</p>
						<div className="max-w-2xl mx-auto bg-gray-50 rounded-lg p-6">
							<div className="grid grid-cols-2 gap-4 text-left">
								<div className="border-b pb-2">
									<p className="text-sm text-gray-500">Total Invoices</p>
									<p className="text-xl font-bold text-gray-800">{rows.length}</p>
								</div>
								<div className="border-b pb-2">
									<p className="text-sm text-gray-500">Gross Sales</p>
									<p className="text-xl font-bold text-gray-800">Rs. {summaryView.gross_sales.toFixed(2)}</p>
								</div>
								<div className="border-b pb-2">
									<p className="text-sm text-gray-500">- Discounts</p>
									<p className="text-xl font-bold text-red-600">Rs. {summaryView.discounts.toFixed(2)}</p>
								</div>
								<div className="border-b pb-2">
									<p className="text-sm text-gray-500">= Net Sales (Revenue)</p>
									<p className="text-xl font-bold text-blue-600">Rs. {summaryView.net_sales.toFixed(2)}</p>
								</div>
								<div className="border-b pb-2">
									<p className="text-sm text-gray-500">- Returns</p>
									<p className="text-xl font-bold text-red-600">Rs. {summaryView.returns.toFixed(2)}</p>
								</div>
								<div className="border-b pb-2">
									<p className="text-sm text-gray-500">- Expenses</p>
									<p className="text-xl font-bold text-orange-600">Rs. {summaryView.expenses.toFixed(2)}</p>
								</div>
								<div className="border-b pb-2">
									<p className="text-sm text-gray-500">- Cost of Goods (COGS)</p>
									<p className="text-xl font-bold text-orange-600">Rs. {(summaryView.cogs || 0).toFixed(2)}</p>
								</div>
								<div className="col-span-2 pt-2 bg-green-50 rounded p-3 -mx-3">
									<p className="text-base font-bold text-gray-700">= Net Profit (Your Earnings)</p>
									<p className="text-3xl font-black text-green-600">Rs. {summaryView.net_profit.toFixed(2)}</p>
								</div>
							</div>
						</div>
						<p className="text-sm text-gray-500 mt-6">
							For individual user sales details, please check the <strong>User Sales Report</strong>
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
