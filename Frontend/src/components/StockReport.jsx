import { useEffect, useState } from "react";
import api from "../api";

export default function StockReport({ onBack }) {
	const [rows, setRows] = useState([]);
	const [loading, setLoading] = useState(false);
	const [searchTerm, setSearchTerm] = useState("");

	useEffect(() => {
		async function load() {
			setLoading(true);
			try {
				const { data } = await api.get("/stock");
				setRows(data);
			} catch (err) {
				console.error(err);
				alert("Failed to load stock");
			} finally {
				setLoading(false);
			}
		}
		load();
	}, []);

	const filteredRows = rows.filter(r => 
		r.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
		r.formula?.toLowerCase().includes(searchTerm.toLowerCase()) ||
		r.batch_no?.toLowerCase().includes(searchTerm.toLowerCase())
	);

	const isExpiringSoon = (expiry) => {
		if (!expiry) return false;
		const expiryDate = new Date(expiry);
		const threeMonths = new Date();
		threeMonths.setMonth(threeMonths.getMonth() + 3);
		return expiryDate < threeMonths;
	};

	const totalQuantity = filteredRows.reduce((sum, r) => sum + (Number(r.qty) || 0), 0);
	const totalCostValue = filteredRows.reduce((sum, r) => sum + ((Number(r.qty) || 0) * (Number(r.cost) || 0)), 0);
	const totalSellValue = filteredRows.reduce((sum, r) => sum + ((Number(r.qty) || 0) * (Number(r.selling_price) || 0)), 0);
	const expectedProfit = totalSellValue - totalCostValue;

	return (
		<div className="p-2 sm:p-4 lg:p-6 bg-gray-100 min-h-screen">
			<div>
				<div className="bg-white rounded-lg shadow-lg overflow-hidden">
					{/* Header */}
					<div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-6 sm:p-8 text-white">
						<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
							<div>
								<h1 className="text-3xl sm:text-4xl font-black tracking-tight">📦 STOCK REPORT</h1>
								<p className="text-orange-100 text-sm mt-1">Live inventory overview and batch details</p>
							</div>
							<button
								onClick={onBack}
								className="px-5 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-semibold transition text-sm sm:text-base"
							>
								← Back
							</button>
						</div>
					</div>

					{/* Search Bar */}
					<div className="p-6 border-b border-gray-200">
						<div className="relative">
							<input
								type="text"
								placeholder="Search by product name, formula, or batch number..."
								className="w-full px-5 py-3 pl-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
							/>
							<svg className="w-6 h-6 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
							</svg>
						</div>
					</div>

					{/* Stats Cards */}
					<div className="p-6 bg-gray-50">
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
							<StatCard label="Products" value={filteredRows.length} />
							<StatCard label="Total Quantity" value={totalQuantity} />
							<StatCard label="Total Cost Value" value={`Rs. ${totalCostValue.toFixed(2)}`} />
							<StatCard label="Expected Profit" value={`Rs. ${expectedProfit.toFixed(2)}`} />
						</div>
					</div>

					{/* Table */}
					<div className="overflow-x-auto">
						{loading ? (
							<div className="flex items-center justify-center py-20">
								<p className="text-gray-500">Loading stock data...</p>
							</div>
						) : filteredRows.length === 0 ? (
							<div className="text-center py-20 px-6">
								<p className="text-gray-500">No stock items found matching your search.</p>
							</div>
						) : (
							<table className="min-w-full divide-y divide-gray-200">
								<thead className="bg-gray-100">
									<tr>
										<th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Product</th>
										<th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Batch</th>
										<th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Expiry</th>
										<th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Qty</th>
										<th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Cost</th>
										<th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Selling</th>
										<th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Total Value</th>
										<th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Total Profit</th>
									</tr>
								</thead>
								<tbody className="bg-white divide-y divide-gray-200">
									{filteredRows.map((r) => {
										const expiringSoon = isExpiringSoon(r.expiry);
										const qty = Number(r.qty) || 0;
										const cost = Number(r.cost) || 0;
										const selling = Number(r.selling_price) || 0;
										const profitTotal = qty * (selling - cost);
										return (
											<tr key={`${r.product_id}-${r.batch_id}`} className={`hover:bg-gray-50 ${expiringSoon ? 'bg-red-50' : ''}`}>
												<td className="px-6 py-4 whitespace-nowrap">
													<div className="font-medium text-gray-900">{r.product_name}</div>
													<div className="text-sm text-gray-500">{r.formula}</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													<span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
														{r.batch_no || "-"}
													</span>
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm">
													{expiringSoon ? (
														<span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
															Expiring: {r.expiry}
														</span>
													) : (
														<span className="text-gray-600">{r.expiry || "-"}</span>
													)}
												</td>
												<td className={`px-6 py-4 whitespace-nowrap text-right font-semibold ${qty < 10 ? 'text-red-600' : 'text-gray-900'}`}>
													{qty}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">
													Rs. {cost.toFixed(2)}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">
													Rs. {selling.toFixed(2)}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-gray-900">
													Rs. {(qty * cost).toFixed(2)}
												</td>
												<td className={`px-6 py-4 whitespace-nowrap text-right font-semibold ${profitTotal >= 0 ? 'text-green-700' : 'text-red-700'}`}>
													Rs. {profitTotal.toFixed(2)}
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

function StatCard({ label, value }) {
	return (
		<div className="bg-white rounded-lg shadow p-4">
			<p className="text-sm font-medium text-gray-500">{label}</p>
			<p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
		</div>
	)
}
