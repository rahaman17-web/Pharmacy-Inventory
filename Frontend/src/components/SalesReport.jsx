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
	const [groupBy, setGroupBy] = useState("day"); // day | month
	const [showMissingCost, setShowMissingCost] = useState(false);
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
				missing_cost_items: [],
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
			missing_cost_items: summary.missing_cost_items || [],
		};
	}, [summary, totals]);

	// Group rows by day or month
	const grouped = useMemo(() => {
		const map = {};
		rows.forEach((r) => {
			const d = new Date(r.created_at);
			const key = groupBy === "month"
				? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
				: toIsoDateString(d);
			if (!map[key]) map[key] = { key, invoices: 0, gross: 0, discount: 0, net: 0 };
			map[key].invoices += 1;
			map[key].gross += Number(r.total || 0);
			map[key].discount += Number(r.discount || 0);
			map[key].net += Number(r.net_total || 0);
		});
		return Object.values(map).sort((a, b) => a.key < b.key ? 1 : -1);
	}, [rows, groupBy]);

	return (
		<div className="p-2 sm:p-4 lg:p-6 bg-gray-100 min-h-screen">
			<div>
				<div className="bg-white rounded-lg shadow-lg overflow-hidden">
					{/* Header */}
					<div style={{ background: "#1e293b", color: "#fff", padding: "12px 20px", display: "flex", alignItems: "center", gap: 14 }}>
						<button onClick={onBack} style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", borderRadius: 6, padding: "6px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>← Back</button>
						<span style={{ fontSize: 18, fontWeight: 800 }}>SALES REPORT</span>
					</div>

					{/* Filters */}
					<div className="p-6 bg-gray-50 border-b border-gray-200">
						<div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
							<div>
								<label className="block text-sm font-semibold text-gray-700 mb-1">From</label>
								<input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
									className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
							</div>
							<div>
								<label className="block text-sm font-semibold text-gray-700 mb-1">To</label>
								<input type="date" value={to} onChange={(e) => setTo(e.target.value)}
									className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500" />
							</div>
							<div>
								<label className="block text-sm font-semibold text-gray-700 mb-1">Group By</label>
								<select value={groupBy} onChange={(e) => setGroupBy(e.target.value)}
									className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500">
									<option value="day">Daily</option>
									<option value="month">Monthly</option>
								</select>
							</div>
							<button onClick={load} disabled={loading}
								className="w-full px-6 py-2 bg-teal-500 text-white rounded-lg font-semibold hover:bg-teal-600 transition shadow disabled:opacity-50">
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
									<button
										onClick={() => setShowMissingCost(true)}
										className="text-xs text-orange-600 mt-3 underline hover:text-orange-800 cursor-pointer bg-transparent border-0 p-0 text-left"
									>
										⚠️ {summaryView.missing_cost_lines} line(s) missing cost data — profit may be understated. Click to view.
									</button>
								)}

								{/* Missing-cost items modal */}
								{showMissingCost && (
									<div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}
										onClick={() => setShowMissingCost(false)}>
										<div style={{ background: "#fff", borderRadius: 10, width: "90%", maxWidth: 600, maxHeight: "80vh", overflow: "auto", padding: 24 }}
											onClick={e => e.stopPropagation()}>
											<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
												<h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#c2410c" }}>⚠️ Items Missing Cost Data</h3>
												<button onClick={() => setShowMissingCost(false)}
													style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: 6, padding: "4px 12px", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>✕</button>
											</div>
											{summaryView.missing_cost_items.length === 0 ? (
												<p className="text-gray-500 text-sm">No detail available.</p>
											) : (
												<table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
													<thead>
														<tr style={{ background: "#fff7ed", borderBottom: "2px solid #fed7aa" }}>
															<th style={{ padding: "8px 10px", textAlign: "left" }}>Sale #</th>
															<th style={{ padding: "8px 10px", textAlign: "left" }}>Product</th>
															<th style={{ padding: "8px 10px", textAlign: "right" }}>Qty</th>
															<th style={{ padding: "8px 10px", textAlign: "right" }}>Price</th>
															<th style={{ padding: "8px 10px", textAlign: "left" }}>Date</th>
														</tr>
													</thead>
													<tbody>
														{summaryView.missing_cost_items.map((item, i) => (
															<tr key={item.sale_item_id || i} style={{ borderBottom: "1px solid #f3f4f6" }}>
																<td style={{ padding: "6px 10px" }}>{item.sale_id}</td>
																<td style={{ padding: "6px 10px", fontWeight: 500 }}>{item.product_name}</td>
																<td style={{ padding: "6px 10px", textAlign: "right" }}>{item.qty}</td>
																<td style={{ padding: "6px 10px", textAlign: "right" }}>Rs. {Number(item.unit_price || 0).toFixed(2)}</td>
																<td style={{ padding: "6px 10px" }}>{new Date(item.created_at).toLocaleDateString()}</td>
															</tr>
														))}
													</tbody>
												</table>
											)}
										</div>
									</div>
								)}
							</div>

							{/* Grouped breakdown table */}
							<div className="overflow-x-auto px-6 pb-6">
								<h2 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-3">
									{groupBy === "month" ? "Monthly" : "Daily"} Breakdown
								</h2>
								{grouped.length === 0 ? (
									<p className="text-gray-400 text-sm py-6 text-center">No sales data found for the selected period.</p>
								) : (
									<table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden">
										<thead className="bg-gray-100">
											<tr>
												<th className="px-5 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">{groupBy === "month" ? "Month" : "Date"}</th>
												<th className="px-5 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Invoices</th>
												<th className="px-5 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Gross</th>
												<th className="px-5 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Discount</th>
												<th className="px-5 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Net</th>
											</tr>
										</thead>
										<tbody className="bg-white divide-y divide-gray-200">
											{grouped.map((g) => (
												<tr key={g.key} className="hover:bg-gray-50">
													<td className="px-5 py-3 whitespace-nowrap font-semibold text-gray-800">{g.key}</td>
													<td className="px-5 py-3 whitespace-nowrap text-right text-gray-600">{g.invoices}</td>
													<td className="px-5 py-3 whitespace-nowrap text-right text-gray-700">Rs. {g.gross.toFixed(2)}</td>
													<td className="px-5 py-3 whitespace-nowrap text-right text-red-500">Rs. {g.discount.toFixed(2)}</td>
													<td className="px-5 py-3 whitespace-nowrap text-right font-bold text-gray-900">Rs. {g.net.toFixed(2)}</td>
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
