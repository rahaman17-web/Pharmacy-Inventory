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
		<div className="p-2 sm:p-4 lg:p-6 bg-gray-100 min-h-screen">
			<div>
				<div className="bg-white rounded-lg shadow-lg overflow-hidden">
					{/* Header */}
					<div className="bg-gradient-to-r from-orange-500 to-amber-500 p-6 sm:p-8 text-white">
						<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
							<div>
								<h1 className="text-3xl sm:text-4xl font-black tracking-tight">💸 EXPENSES</h1>
								<p className="text-orange-100 text-sm mt-1">Track operational costs for accurate net profit</p>
							</div>
							<button
								onClick={onBack}
								className="px-5 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-semibold transition text-sm sm:text-base"
							>
								← Back
							</button>
						</div>
					</div>

					{/* Add Expense Section */}
					<div className="p-6 border-b border-gray-200">
						<h3 className="text-lg font-bold text-gray-800 mb-4">Add New Expense</h3>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
							<div>
								<label className="block text-sm font-semibold text-gray-700 mb-1">Amount</label>
								<input
									type="number"
									value={amount}
									onChange={(e) => setAmount(e.target.value)}
									className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
									placeholder="0.00"
									min="0"
									step="0.01"
								/>
							</div>
							<div className="md:col-span-1">
								<label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
								<input
									type="text"
									value={description}
									onChange={(e) => setDescription(e.target.value)}
									className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
									placeholder="e.g., Rent, Utilities"
								/>
							</div>
							<button
								onClick={addExpense}
								className="w-full md:w-auto px-6 py-2 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition shadow"
							>
								Add Expense
							</button>
						</div>
					</div>

					{/* Filters and Summary */}
					<div className="p-6 bg-gray-50">
						<div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
							<div>
								<label className="block text-sm font-semibold text-gray-700 mb-1">From</label>
								<input
									type="date"
									value={from}
									onChange={(e) => setFrom(e.target.value)}
									className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
								/>
							</div>
							<div>
								<label className="block text-sm font-semibold text-gray-700 mb-1">To</label>
								<input
									type="date"
									value={to}
									onChange={(e) => setTo(e.target.value)}
									className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
								/>
							</div>
							<button
								onClick={load}
								className="w-full md:w-auto px-6 py-2 bg-amber-500 text-white rounded-lg font-semibold hover:bg-amber-600 transition shadow"
								disabled={loading}
							>
								{loading ? "Loading..." : "Load Report"}
							</button>
							<div className="bg-amber-100 border border-amber-200 rounded-lg p-3 text-center">
								<p className="text-xs text-gray-600 uppercase font-bold">Total Expenses</p>
								<p className="text-xl font-bold text-gray-900">Rs. {total.toFixed(2)}</p>
							</div>
						</div>
					</div>

					{/* Expenses Table */}
					<div className="overflow-x-auto">
						{loading ? (
							<div className="flex items-center justify-center py-20">
								<p className="text-gray-500">Loading expenses...</p>
							</div>
						) : rows.length === 0 ? (
							<div className="text-center py-20 px-6">
								<p className="text-gray-500">No expenses found for the selected date range.</p>
							</div>
						) : (
							<table className="min-w-full divide-y divide-gray-200">
								<thead className="bg-gray-50">
									<tr>
										<th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Date</th>
										<th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">User</th>
										<th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Description</th>
										<th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Amount</th>
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
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
