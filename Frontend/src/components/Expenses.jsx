import { useEffect, useMemo, useState } from "react";
import api from "../api";

function toIsoDateString(d) {
	const pad = (n) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function Expenses({ onBack }) {
	const [rows, setRows] = useState([]);
	const [loading, setLoading] = useState(false);
	const [from, setFrom] = useState(() => {
		const now = new Date();
		const d = new Date(now);
		d.setDate(d.getDate() - 30);
		return toIsoDateString(d);
	});
	const [to, setTo] = useState(() => toIsoDateString(new Date()));

	const [amount, setAmount] = useState("");
	const [description, setDescription] = useState("");

	async function load() {
		setLoading(true);
		try {
			const { data } = await api.get("/expenses", { params: { from, to } });
			setRows(data?.rows || []);
		} catch (err) {
			console.error(err);
			alert("Failed to load expenses");
		} finally {
			setLoading(false);
		}
	}

	async function addExpense() {
		const v = Number(amount);
		if (!Number.isFinite(v) || v <= 0) {
			alert("Enter a valid amount");
			return;
		}
		try {
			await api.post("/expenses", { amount: v, description });
			setAmount("");
			setDescription("");
			await load();
		} catch (err) {
			console.error(err);
			alert(err.response?.data?.error || "Failed to add expense");
		}
	}

	useEffect(() => {
		load();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const total = useMemo(() => {
		return rows.reduce((s, r) => s + Number(r.amount || 0), 0);
	}, [rows]);

	return (
		<div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
			<div className="bg-white shadow-md border-b">
				<div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
					<div>
						<h2 className="text-2xl font-bold text-gray-800">Expenses</h2>
						<p className="text-sm text-gray-500">Track operational costs for accurate net profit</p>
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
							<label className="block text-sm font-semibold text-gray-700 mb-2">From</label>
							<input
								type="date"
								value={from}
								onChange={(e) => setFrom(e.target.value)}
								className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
							/>
						</div>
						<div>
							<label className="block text-sm font-semibold text-gray-700 mb-2">To</label>
							<input
								type="date"
								value={to}
								onChange={(e) => setTo(e.target.value)}
								className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
							/>
						</div>
						<button
							onClick={load}
							className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-amber-600 transition-all shadow-md"
							disabled={loading}
						>
							{loading ? "Loading..." : "Load"}
						</button>
						<div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
							<p className="text-xs text-gray-600">Total Expenses</p>
							<p className="text-xl font-bold text-gray-900">Rs. {total.toFixed(2)}</p>
						</div>
					</div>
				</div>

				<div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
					<h3 className="text-lg font-bold text-gray-800 mb-4">Add Expense</h3>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
						<div>
							<label className="block text-sm font-semibold text-gray-700 mb-2">Amount</label>
							<input
								type="number"
								value={amount}
								onChange={(e) => setAmount(e.target.value)}
								className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
								placeholder="0"
								min="0"
								step="0.01"
							/>
						</div>
						<div>
							<label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
							<input
								type="text"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
								placeholder="Electricity, Rent, Delivery, etc."
							/>
						</div>
						<button
							onClick={addExpense}
							className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-amber-600 transition-all shadow-md"
						>
							Add
						</button>
					</div>
				</div>

				<div className="bg-white rounded-2xl shadow-lg overflow-hidden">
					<div className="px-6 py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold">Expenses List</div>
					{loading ? (
						<div className="flex items-center justify-center py-20">
							<p className="text-gray-500">Loading expenses...</p>
						</div>
					) : rows.length === 0 ? (
						<div className="text-center py-20">
							<p className="text-gray-500">No expenses found for this range</p>
						</div>
					) : (
						<div className="overflow-x-auto">
							<table className="min-w-full divide-y divide-gray-200">
								<thead className="bg-gray-50">
									<tr>
										<th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Date</th>
										<th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">User</th>
										<th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Description</th>
										<th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase">Amount</th>
									</tr>
								</thead>
								<tbody className="bg-white divide-y divide-gray-200">
									{rows.map((r) => (
										<tr key={r.id} className="hover:bg-gray-50">
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{String(r.created_at || "").slice(0, 19).replace("T", " ")}</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{r.username || r.user_id || "-"}</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.description || "-"}</td>
											<td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-gray-900">Rs. {Number(r.amount || 0).toFixed(2)}</td>
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
