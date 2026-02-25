import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api";

function toIsoDateString(d) {
	const pad = (n) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function UserSalesHistory({ onBack }) {
	const navigate = useNavigate();
	const params = useParams();
	const initialUserId = params.userId ? Number(params.userId) : NaN;

	const [users, setUsers] = useState([]);
	const [userId, setUserId] = useState(Number.isFinite(initialUserId) ? initialUserId : "");
	const [from, setFrom] = useState(() => toIsoDateString(new Date()));
	const [to, setTo] = useState(() => toIsoDateString(new Date()));
	const [loading, setLoading] = useState(false);
	const [salesItems, setSalesItems] = useState([]);
	const [returnItems, setReturnItems] = useState([]);

	useEffect(() => {
		(async () => {
			try {
				const { data } = await api.get("/reports/user-sales");
				setUsers(Array.isArray(data) ? data : []);
			} catch (e) {
				console.error(e);
				setUsers([]);
			}
		})();
	}, []);

	useEffect(() => {
		if (!Number.isFinite(initialUserId)) return;
		setUserId(initialUserId);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [params.userId]);

	async function load() {
		if (!userId) {
			alert("Select a user");
			return;
		}
		setLoading(true);
		try {
			const { data: itemsData } = await api.get("/reports/user-history-items", { params: { user_id: userId, from, to } });
			setSalesItems(itemsData?.sales_items || []);
			setReturnItems(itemsData?.return_items || []);
		} catch (e) {
			console.error(e);
			alert(e.response?.data?.error || "Failed to load user history");
		} finally {
			setLoading(false);
		}
	}

	const selectedUser = useMemo(() => {
		return users.find((u) => Number(u.user_id) === Number(userId));
	}, [users, userId]);

	const activityRows = useMemo(() => {
		const sold = (salesItems || []).map((it) => ({
			type: "Sale",
			key: `S-${it.sale_id}-${it.sale_item_id}`,
			invoice: it.sale_id,
			ref: it.sale_id,
			created_at: it.created_at,
			item: it.product_name,
			batch_no: it.batch_no,
			qty: Number(it.qty || 0),
			unit_price: Number(it.unit_price || 0),
			amount: Number(it.line_total || 0),
		}));

		const ret = (returnItems || []).map((it) => ({
			type: "Return",
			key: `R-${it.return_id}-${it.return_item_id}`,
			invoice: it.sale_id,
			ref: it.return_id,
			created_at: it.created_at,
			item: it.product_name,
			batch_no: it.batch_no,
			qty: -Math.abs(Number(it.qty || 0)),
			unit_price: Number(it.unit_price || 0),
			amount: -Math.abs(Number(it.line_total || 0)),
		}));

		return [...sold, ...ret].sort((a, b) => {
			const ad = String(a.created_at || "");
			const bd = String(b.created_at || "");
			if (ad < bd) return 1;
			if (ad > bd) return -1;
			return 0;
		});
	}, [salesItems, returnItems]);

	const totals = useMemo(() => {
		const salesAmount = activityRows.filter((r) => r.type === "Sale").reduce((s, r) => s + Number(r.amount || 0), 0);
		const returnsAmount = activityRows.filter((r) => r.type === "Return").reduce((s, r) => s + Math.abs(Number(r.amount || 0)), 0);
		const net = salesAmount - returnsAmount;
		return { salesAmount, returnsAmount, net };
	}, [activityRows]);

	return (
		<div className="p-2 sm:p-4 lg:p-6 bg-gray-100 min-h-screen">
			<div>
				{/* Header */}
				<div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
					<div className="bg-gradient-to-r from-purple-500 to-indigo-600 p-6 sm:p-8 text-white">
						<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
							<div>
								<h1 className="text-3xl sm:text-4xl font-black tracking-tight">📜 USER HISTORY</h1>
								<p className="text-indigo-100 text-sm mt-1">Sales and returns for a specific user</p>
							</div>
							<button
								onClick={onBack}
								className="px-5 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-semibold transition text-sm sm:text-base"
							>
								← Back
							</button>
						</div>
					</div>

					{/* Filter Controls */}
					<div className="p-6 border-b border-gray-200">
						<div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
							<div className="md:col-span-2">
								<label className="block text-sm font-semibold text-gray-700 mb-2">User</label>
								<select
									value={userId}
									onChange={(e) => {
										const v = e.target.value;
										setUserId(v ? Number(v) : "");
										if (v) navigate(`/user-sales/${v}`);
									}}
									className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
								>
									<option value="">Select user…</option>
									{users.map((u) => (
										<option key={u.user_id} value={u.user_id}>
											{u.username} (ID: {u.user_id})
										</option>
									))}
								</select>
							</div>
							<div>
								<label className="block text-sm font-semibold text-gray-700 mb-2">From</label>
								<input
									type="date"
									value={from}
									onChange={(e) => setFrom(e.target.value)}
									className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
								/>
							</div>
							<div>
								<label className="block text-sm font-semibold text-gray-700 mb-2">To</label>
								<input
									type="date"
									value={to}
									onChange={(e) => setTo(e.target.value)}
									className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
								/>
							</div>
						</div>
						<div className="flex justify-between items-center mt-4">
							<div className="text-sm text-gray-600">
								{selectedUser ? (
									<span>Showing history for: <span className="font-semibold">{selectedUser.username}</span></span>
								) : (
									<span>Please select a user.</span>
								)}
							</div>
							<button
								onClick={load}
								disabled={loading || !userId}
								className="px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-indigo-600 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{loading ? "Loading..." : "Load History"}
							</button>
						</div>
					</div>

					{/* Stats */}
					<div className="p-6 bg-gray-50">
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
							<StatCard label="Sales Total" value={`Rs. ${totals.salesAmount.toFixed(2)}`} color="green" />
							<StatCard label="Returns Total" value={`Rs. ${totals.returnsAmount.toFixed(2)}`} color="red" />
							<StatCard label="Net Total" value={`Rs. ${totals.net.toFixed(2)}`} color="purple" />
						</div>
					</div>
				</div>

				{/* Table */}
				<div className="bg-white rounded-lg shadow-lg overflow-hidden">
					<div className="overflow-x-auto">
						{loading ? (
							<div className="flex items-center justify-center py-20">
								<p className="text-gray-500">Loading history...</p>
							</div>
						) : activityRows.length === 0 ? (
							<div className="text-center py-20 px-6">
								<p className="text-gray-500">No activity found for the selected user and date range.</p>
							</div>
						) : (
							<table className="min-w-full divide-y divide-gray-200">
								<thead className="bg-gray-100">
									<tr>
										<th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Type</th>
										<th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Date</th>
										<th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Item</th>
										<th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Batch</th>
										<th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Qty</th>
										<th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Unit Price</th>
										<th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Amount</th>
										<th className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Ref ID</th>
									</tr>
								</thead>
								<tbody className="bg-white divide-y divide-gray-200">
									{activityRows.map((r) => (
										<tr key={r.key} className="hover:bg-gray-50">
											<td className="px-6 py-4 whitespace-nowrap">
												<span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${r.type === "Return" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
													{r.type}
												</span>
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
													{new Date(r.created_at).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })}
											</td>
											<td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{r.item}</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{r.batch_no || "-"}</td>
											<td className={`px-6 py-4 whitespace-nowrap text-right font-semibold ${r.qty < 0 ? "text-red-600" : "text-gray-800"}`}>
												{r.qty}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">
												Rs. {r.unit_price.toFixed(2)}
											</td>
											<td className={`px-6 py-4 whitespace-nowrap text-right font-semibold ${r.amount < 0 ? "text-red-600" : "text-gray-800"}`}>
												Rs. {r.amount.toFixed(2)}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
												{r.type === 'Sale' ? `S-${r.ref}` : `R-${r.ref}`}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

function StatCard({ label, value, color = 'gray' }) {
	const colors = {
		green: 'from-green-400 to-green-600',
		red: 'from-red-400 to-red-600',
		purple: 'from-purple-400 to-purple-600',
		gray: 'from-gray-400 to-gray-600',
	}
	return (
		<div className={`bg-white rounded-lg shadow p-4 border-l-4 border-${color}-500`}>
			<p className="text-sm font-medium text-gray-500">{label}</p>
			<p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
		</div>
	)
}
