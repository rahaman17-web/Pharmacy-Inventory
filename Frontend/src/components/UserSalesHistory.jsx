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
		<div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50">
			<div className="bg-white shadow-md border-b">
				<div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
					<div>
						<h2 className="text-2xl font-bold text-gray-800">User Sales & Returns</h2>
						<p className="text-sm text-gray-500">History for investigation (admin/manager)</p>
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
				<div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
					<div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
						<div>
							<label className="block text-sm font-semibold text-gray-700 mb-2">User</label>
							<select
								value={userId}
								onChange={(e) => {
									const v = e.target.value;
									setUserId(v ? Number(v) : "");
									if (v) navigate(`/user-sales/${v}`);
								}}
								className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
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
								className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
							/>
						</div>
						<div>
							<label className="block text-sm font-semibold text-gray-700 mb-2">To</label>
							<input
								type="date"
								value={to}
								onChange={(e) => setTo(e.target.value)}
								className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
							/>
						</div>
						<button
							onClick={load}
							disabled={loading}
							className="px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl font-semibold hover:from-purple-600 hover:to-indigo-600 transition-all shadow-md"
						>
							{loading ? "Loading..." : "Load"}
						</button>
					</div>

					{selectedUser && (
						<div className="mt-4 text-sm text-gray-600">Showing: <span className="font-semibold">{selectedUser.username}</span></div>
					)}
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
					<div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-green-500">
						<p className="text-gray-500 text-sm font-medium">Sales (Items Total)</p>
						<p className="text-3xl font-bold text-gray-800 mt-1">Rs. {totals.salesAmount.toFixed(2)}</p>
					</div>
					<div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-red-500">
						<p className="text-gray-500 text-sm font-medium">Returns (Items Total)</p>
						<p className="text-3xl font-bold text-gray-800 mt-1">Rs. {totals.returnsAmount.toFixed(2)}</p>
					</div>
					<div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-purple-500">
						<p className="text-gray-500 text-sm font-medium">Net (Sales − Returns)</p>
						<p className="text-3xl font-bold text-gray-800 mt-1">Rs. {totals.net.toFixed(2)}</p>
						<p className="text-xs text-gray-500 mt-1">Rows: {activityRows.length}</p>
					</div>
				</div>

				<div className="bg-white rounded-2xl shadow-lg overflow-hidden">
					<div className="px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold">
						Sales & Returns (One Table)
					</div>
					{activityRows.length === 0 ? (
						<div className="text-center py-10 text-gray-500">No activity in this range</div>
					) : (
						<div className="overflow-x-auto">
							<table className="min-w-full divide-y divide-gray-200">
								<thead className="bg-gray-50">
									<tr>
										<th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Type</th>
										<th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Ref</th>
										<th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Invoice</th>
										<th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Date</th>
										<th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Item</th>
										<th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Batch</th>
										<th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase">Qty</th>
										<th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase">Price</th>
										<th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase">Amount</th>
									</tr>
								</thead>
								<tbody className="bg-white divide-y divide-gray-200">
									{activityRows.map((r) => (
										<tr key={r.key} className="hover:bg-gray-50">
											<td className={`px-6 py-4 whitespace-nowrap font-semibold ${r.type === "Return" ? "text-red-600" : "text-green-700"}`}>
												{r.type}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{r.ref}</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{r.invoice}</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{String(r.created_at || "").slice(0, 19).replace("T", " ")}</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.item}</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{r.batch_no || "-"}</td>
											<td className={`px-6 py-4 whitespace-nowrap text-right text-sm ${r.qty < 0 ? "text-red-600" : "text-gray-700"}`}>{r.qty}</td>
											<td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-700">Rs. {Number(r.unit_price || 0).toFixed(2)}</td>
											<td className={`px-6 py-4 whitespace-nowrap text-right font-semibold ${r.amount < 0 ? "text-red-600" : "text-gray-900"}`}>
												Rs. {Number(r.amount || 0).toFixed(2)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
