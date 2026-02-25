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
		<div className="p-2 sm:p-4 lg:p-6 bg-gray-100 min-h-screen">
			<div>
				<div className="bg-white rounded-lg shadow-lg overflow-hidden">
					{/* Header */}
					<div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 sm:p-8 text-white">
						<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
							<div>
								<h1 className="text-3xl sm:text-4xl font-black tracking-tight">👥 USER SALES REPORT</h1>
								<p className="text-pink-100 text-sm mt-1">Sales performance by user</p>
							</div>
							<button
								onClick={onBack}
								className="px-5 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-semibold transition text-sm sm:text-base"
							>
								← Back
							</button>
						</div>
					</div>

					{/* Stats Cards */}
					<div className="p-6 bg-gray-50">
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
							<StatCard label="Total Users" value={rows.length} />
							<StatCard label="Total Transactions" value={totalTransactions} />
							<StatCard label="Total Revenue" value={`Rs. ${totalSales.toFixed(2)}`} />
						</div>
					</div>

					{/* Table */}
					<div className="overflow-x-auto">
						{loading ? (
							<div className="flex items-center justify-center py-20">
								<p className="text-gray-500">Loading user sales data...</p>
							</div>
						) : rows.length === 0 ? (
							<div className="text-center py-20 px-6">
								<p className="text-gray-500">No sales data found for any user.</p>
							</div>
						) : (
							<table className="min-w-full divide-y divide-gray-200">
								<thead className="bg-gray-100">
									<tr>
										<th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">User</th>
										<th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Sales Count</th>
										<th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Total Sales</th>
										<th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Avg. per Sale</th>
										<th className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Actions</th>
									</tr>
								</thead>
								<tbody className="bg-white divide-y divide-gray-200">
									{rows.map((r) => {
										const avgSale = (Number(r.total_sales) / Number(r.sales_count)) || 0;
										return (
											<tr key={r.user_id} className="hover:bg-gray-50">
												<td className="px-6 py-4 whitespace-nowrap">
													<div className="font-medium text-gray-900">{r.username}</div>
													<div className="text-sm text-gray-500">ID: {r.user_id}</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-gray-800">
													{r.sales_count}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-green-700">
													Rs. {Number(r.total_sales).toFixed(2)}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">
													Rs. {avgSale.toFixed(2)}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-center">
													<button
														type="button"
														onClick={() => navigate(`/user-sales/${r.user_id}`)}
														className="px-4 py-2 text-sm font-medium text-purple-600 bg-purple-100 rounded-lg hover:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
														title="View this user's sales history"
													>
														View History
													</button>
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
