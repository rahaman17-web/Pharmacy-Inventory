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
		<div className="p-2 sm:p-4 lg:p-6 bg-gray-100 min-h-screen">
			<div>
				<div className="bg-white rounded-lg shadow-lg overflow-hidden">
					{/* Header */}
					<div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-6 sm:p-8 text-white">
						<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
							<div>
								<h1 className="text-3xl sm:text-4xl font-black tracking-tight">📊 SALES REPORT</h1>
								<p className="text-teal-100 text-sm mt-1">Comprehensive sales and profit analysis</p>
							</div>
							<button
								onClick={onBack}
								className="px-5 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-semibold transition text-sm sm:text-base"
							>
								← Back
							</button>
						</div>
					</div>

					{/* Filters */}
					<div className="p-6 bg-gray-50 border-b border-gray-200">
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
							<div>
								<label className="block text-sm font-semibold text-gray-700 mb-1">From</label>
								<input
									type="date"
									value={from}
									onChange={(e) => setFrom(e.target.value)}
									className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
								/>
							</div>
							<div>
								<label className="block text-sm font-semibold text-gray-700 mb-1">To</label>
								<input
									type="date"
									value={to}
									onChange={(e) => setTo(e.target.value)}
									className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
								/>
							</div>
							<button
								onClick={load}
								className="w-full md:w-auto px-6 py-2 bg-teal-500 text-white rounded-lg font-semibold hover:bg-teal-600 transition shadow"
								disabled={loading}
							>
								{loading ? "Loading..." : "Load Report"}
							</button>
						</div>
					</div>

					{loading ? (
						<div className="flex items-center justify-center py-20">
							<p className="text-gray-500">Loading report data...</p>
						</div>
					) : (
						<>
							{/* Summary Cards */}
							<div className="p-6 bg-gray-50">
								<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
									<SummaryCard label="Gross Sales" value={`Rs. ${summaryView.gross_sales.toFixed(2)}`} />
									<SummaryCard label="Discounts" value={`Rs. ${summaryView.discounts.toFixed(2)}`} />
									<SummaryCard label="Net Sales" value={`Rs. ${summaryView.net_sales.toFixed(2)}`} />
									<SummaryCard label="Returns" value={`Rs. ${summaryView.returns.toFixed(2)}`} />
									<SummaryCard label="Expenses" value={`Rs. ${summaryView.expenses.toFixed(2)}`} />
									<SummaryCard label="COGS" value={`Rs. ${summaryView.cogs.toFixed(2)}`} />
									<SummaryCard label="Net Cash" value={`Rs. ${summaryView.net_cash.toFixed(2)}`} />
									<SummaryCard label="Net Profit" value={`Rs. ${summaryView.net_profit.toFixed(2)}`} highlight />
								</div>
								{summaryView.missing_cost_lines > 0 && (
									<p className="text-xs text-orange-600 mt-3">⚠️ {summaryView.missing_cost_lines} line(s) missing cost data — profit may be understated.</p>
								)}
							</div>

							{/* Table */}
							<div className="overflow-x-auto">
								{rows.length === 0 ? (
									<div className="text-center py-20 px-6">
										<p className="text-gray-500">No sales data found for the selected period.</p>
									</div>
								) : (
									<table className="min-w-full divide-y divide-gray-200">
										<thead className="bg-gray-100">
											<tr>
												<th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Invoice</th>
												<th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Date</th>
												<th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">User</th>
												<th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Total</th>
												<th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Discount</th>
												<th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Net</th>
											</tr>
										</thead>
										<tbody className="bg-white divide-y divide-gray-200">
											{rows.map((r) => (
												<tr key={r.id} className="hover:bg-gray-50">
													<td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">#{r.id}</td>
													<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
														{new Date(r.created_at).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })}
													</td>
													<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{r.username || r.user_id}</td>
													<td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-800">Rs. {Number(r.total || 0).toFixed(2)}</td>
													<td className="px-6 py-4 whitespace-nowrap text-right text-sm text-red-600">Rs. {Number(r.discount || 0).toFixed(2)}</td>
													<td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-gray-900">Rs. {Number(r.net_total || 0).toFixed(2)}</td>
												</tr>
											))}
										</tbody>
									</table>
								)}
							</div>
						</>
					)}
				</div>
			</div>
		</div>
	);
}

function SummaryCard({ label, value, highlight = false }) {
	return (
		<div className={`bg-white rounded-lg shadow p-4 ${highlight ? 'ring-2 ring-teal-500' : ''}`}>
			<p className="text-sm font-medium text-gray-500">{label}</p>
			<p className={`text-xl font-bold mt-1 ${highlight ? 'text-teal-700' : 'text-gray-800'}`}>{value}</p>
		</div>
	);
}
