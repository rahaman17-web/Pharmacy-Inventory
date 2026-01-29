import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

export default function UserSaleReport({ onBack }) {
	const navigate = useNavigate();
	const [rows, setRows] = useState([]);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		async function load() {
			setLoading(true);
			try {
				const { data } = await api.get("/reports/user-sales");
				setRows(data);
			} catch (err) {
				console.error(err);
				alert("Failed to load user sales report");
			} finally {
				setLoading(false);
			}
		}
		load();
	}, []);

	const totalSales = rows.reduce((sum, r) => sum + Number(r.total_sales || 0), 0);
	const totalTransactions = rows.reduce((sum, r) => sum + Number(r.sales_count || 0), 0);

	return (
		<div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
			{/* Header */}
			<div className="bg-white shadow-md border-b">
				<div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
					<div className="flex items-center space-x-4">
						<div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
							<svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
							</svg>
						</div>
						<div>
							<h2 className="text-2xl font-bold text-gray-800">User Sales Report</h2>
							<p className="text-sm text-gray-500">Sales performance by user</p>
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
								<p className="text-gray-500 text-sm font-medium">Total Users</p>
								<p className="text-3xl font-bold text-gray-800 mt-1">{rows.length}</p>
							</div>
							<div className="p-3 bg-blue-100 rounded-lg">
								<svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
								</svg>
							</div>
						</div>
					</div>

					<div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-green-500">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-gray-500 text-sm font-medium">Total Transactions</p>
								<p className="text-3xl font-bold text-gray-800 mt-1">{totalTransactions}</p>
							</div>
							<div className="p-3 bg-green-100 rounded-lg">
								<svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
								</svg>
							</div>
						</div>
					</div>

					<div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-purple-500">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-gray-500 text-sm font-medium">Total Revenue</p>
								<p className="text-3xl font-bold text-gray-800 mt-1">Rs. {totalSales.toFixed(2)}</p>
							</div>
							<div className="p-3 bg-purple-100 rounded-lg">
								<svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
							</div>
						</div>
					</div>
				</div>

				{/* User Cards Grid */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{loading ? (
						<div className="col-span-full flex items-center justify-center py-20">
							<div className="text-center">
								<svg className="animate-spin h-12 w-12 text-purple-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
									<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
									<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
								</svg>
								<p className="text-gray-500">Loading user sales data...</p>
							</div>
						</div>
					) : rows.length === 0 ? (
						<div className="col-span-full text-center py-20">
							<svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
							</svg>
							<p className="text-gray-500">No sales data found</p>
						</div>
					) : (
						rows.map((r, idx) => {
							const avgSale = Number(r.total_sales) / Number(r.sales_count);
							const colors = [
								{ from: 'from-blue-400', to: 'to-blue-600', bg: 'bg-blue-100', text: 'text-blue-600' },
								{ from: 'from-green-400', to: 'to-green-600', bg: 'bg-green-100', text: 'text-green-600' },
								{ from: 'from-purple-400', to: 'to-purple-600', bg: 'bg-purple-100', text: 'text-purple-600' },
								{ from: 'from-pink-400', to: 'to-pink-600', bg: 'bg-pink-100', text: 'text-pink-600' },
								{ from: 'from-indigo-400', to: 'to-indigo-600', bg: 'bg-indigo-100', text: 'text-indigo-600' },
								{ from: 'from-red-400', to: 'to-red-600', bg: 'bg-red-100', text: 'text-red-600' },
							];
							const color = colors[idx % colors.length];

							return (
								<button
									type="button"
									key={r.user_id}
									onClick={() => navigate(`/user-sales/${r.user_id}`)}
									className="text-left bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden transform hover:-translate-y-2"
									title="Open this user's sales/returns history"
								>
									<div className={`h-2 bg-gradient-to-r ${color.from} ${color.to}`}></div>
									<div className="p-6">
										<div className="flex items-center mb-4">
											<div className={`p-3 bg-gradient-to-br ${color.from} ${color.to} rounded-full`}>
												<svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
												</svg>
											</div>
											<div className="ml-4">
												<h3 className="text-lg font-bold text-gray-800">{r.username}</h3>
												<p className="text-sm text-gray-500">User ID: {r.user_id}</p>
											</div>
										</div>

										<div className="space-y-3">
											<div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
												<div className="flex items-center">
													<svg className="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
													</svg>
													<span className="text-sm text-gray-600">Sales Count</span>
												</div>
												<span className="font-bold text-gray-800">{r.sales_count}</span>
											</div>

											<div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
												<div className="flex items-center">
													<svg className="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
													</svg>
													<span className="text-sm text-gray-600">Total Sales</span>
												</div>
													<span className="font-bold text-gray-800">Rs. {Number(r.total_sales).toFixed(2)}</span>
											</div>

											<div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
												<div className="flex items-center">
													<svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
													</svg>
													<span className="text-sm text-gray-600 font-medium">Avg per Sale</span>
												</div>
													<span className="font-bold text-green-700">Rs. {avgSale.toFixed(2)}</span>
											</div>
										</div>
									</div>
								</button>
							);
						})
					)}
				</div>
			</div>
		</div>
	);
}
