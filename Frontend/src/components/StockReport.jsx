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
		<div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
			{/* Header */}
			<div className="bg-white shadow-md border-b">
				<div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
					<div className="flex items-center space-x-4">
						<div className="p-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg">
							<svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
							</svg>
						</div>
						<div>
							<h2 className="text-2xl font-bold text-gray-800">Stock Report</h2>
							<p className="text-sm text-gray-500">Inventory overview and batch details</p>
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
				{/* Stats Cards */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
					<div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-blue-500">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-gray-500 text-sm font-medium">Total Products</p>
								<p className="text-3xl font-bold text-gray-800 mt-1">{filteredRows.length}</p>
							</div>
							<div className="p-3 bg-blue-100 rounded-lg">
								<svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
								</svg>
							</div>
						</div>
					</div>

					<div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-green-500">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-gray-500 text-sm font-medium">Total Quantity</p>
								<p className="text-3xl font-bold text-gray-800 mt-1">{totalQuantity}</p>
							</div>
							<div className="p-3 bg-green-100 rounded-lg">
								<svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
								</svg>
							</div>
						</div>
					</div>

					<div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-purple-500">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-gray-500 text-sm font-medium">Total Value</p>
								<p className="text-3xl font-bold text-gray-800 mt-1">Rs. {totalCostValue.toFixed(2)}</p>
								<p className="text-xs text-gray-500 mt-1">Sell: Rs. {totalSellValue.toFixed(2)} | Profit: Rs. {expectedProfit.toFixed(2)}</p>
							</div>
							<div className="p-3 bg-purple-100 rounded-lg">
								<svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
							</div>
						</div>
					</div>
				</div>

				{/* Search Bar */}
				<div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
					<div className="relative">
						<input
							type="text"
							placeholder="Search by product name, formula/SKU, or batch number..."
							className="w-full px-5 py-3 pl-12 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
						/>
						<svg className="w-6 h-6 text-gray-400 absolute left-4 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
						</svg>
					</div>
				</div>

				{/* Table */}
				<div className="bg-white rounded-2xl shadow-lg overflow-hidden">
					{loading ? (
						<div className="flex items-center justify-center py-20">
							<div className="text-center">
								<svg className="animate-spin h-12 w-12 text-orange-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
									<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
									<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
								</svg>
								<p className="text-gray-500">Loading stock data...</p>
							</div>
						</div>
					) : filteredRows.length === 0 ? (
						<div className="text-center py-20">
							<svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
							</svg>
							<p className="text-gray-500">No stock items found</p>
						</div>
					) : (
						<div className="overflow-x-auto">
							<table className="min-w-full divide-y divide-gray-200">
								<thead className="bg-gradient-to-r from-orange-500 to-yellow-500">
									<tr>
										<th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Product</th>
										<th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Batch</th>
										<th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">Expiry</th>
										<th className="px-6 py-4 text-right text-xs font-bold text-white uppercase tracking-wider">Qty</th>
										<th className="px-6 py-4 text-right text-xs font-bold text-white uppercase tracking-wider">Cost</th>
										<th className="px-6 py-4 text-right text-xs font-bold text-white uppercase tracking-wider">Selling</th>
										<th className="px-6 py-4 text-right text-xs font-bold text-white uppercase tracking-wider">Value</th>
										<th className="px-6 py-4 text-right text-xs font-bold text-white uppercase tracking-wider">Profit</th>
									</tr>
								</thead>
								<tbody className="bg-white divide-y divide-gray-200">
									{filteredRows.map((r, idx) => {
										const expiringSoon = isExpiringSoon(r.expiry);
										const qty = Number(r.qty) || 0;
										const cost = Number(r.cost) || 0;
										const selling = Number(r.selling_price) || 0;
										const profitTotal = qty * (selling - cost);
										return (
											<tr key={`${r.product_id}-${r.batch_id}`} className={`hover:bg-gray-50 transition ${expiringSoon ? 'bg-red-50' : ''}`}>
												<td className="px-6 py-4 whitespace-nowrap">
													<div className="font-medium text-gray-900">{r.product_name}</div>
												</td>

												<td className="px-6 py-4 whitespace-nowrap">
													<span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
														{r.batch_no || "-"}
													</span>
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													{expiringSoon ? (
														<span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium flex items-center w-fit">
															<svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
																<path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
															</svg>
															{r.expiry || "-"}
														</span>
													) : (
														<span className="text-sm text-gray-600">{r.expiry || "-"}</span>
													)}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-right">
													<span className={`font-semibold ${Number(r.qty) < 10 ? 'text-red-600' : 'text-gray-900'}`}>
														{r.qty}
													</span>
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">
												Rs. {Number(r.cost).toFixed(2)}
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
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
