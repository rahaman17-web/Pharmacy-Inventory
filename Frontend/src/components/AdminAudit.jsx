import { useEffect, useState } from "react";
import api from "../api";

export default function AdminAudit({ onBack }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { data } = await api.get("/audit?limit=500");
        setRows(data);
      } catch (err) {
        console.error(err);
        alert("Failed to load audit logs");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredRows = rows.filter(r => 
    r.action?.toLowerCase().includes(filter.toLowerCase()) ||
    r.username?.toLowerCase().includes(filter.toLowerCase()) ||
    JSON.stringify(r.details)?.toLowerCase().includes(filter.toLowerCase())
  );

  const getActionColor = (action) => {
    if (action?.includes('login')) return 'bg-blue-100 text-blue-800';
    if (action?.includes('sale')) return 'bg-green-100 text-green-800';
    if (action?.includes('purchase')) return 'bg-purple-100 text-purple-800';
    if (action?.includes('delete')) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getActionIcon = (action) => {
    if (action?.includes('login')) {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
        </svg>
      );
    }
    if (action?.includes('sale')) {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    }
    if (action?.includes('purchase')) {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  };

  return (
		<div className="p-2 sm:p-4 lg:p-6 bg-gray-100 min-h-screen">
			<div>
				<div className="bg-white rounded-lg shadow-lg overflow-hidden">
					{/* Header */}
					<div className="bg-gradient-to-r from-gray-600 to-gray-800 p-6 sm:p-8 text-white">
						<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
							<div>
								<h1 className="text-3xl sm:text-4xl font-black tracking-tight">🛡️ AUDIT LOGS</h1>
								<p className="text-gray-300 text-sm mt-1">System activity tracking</p>
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
								placeholder="Search logs by action, user, or details..."
								className="w-full px-5 py-3 pl-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
								value={filter}
								onChange={(e) => setFilter(e.target.value)}
							/>
							<svg className="w-6 h-6 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
							</svg>
						</div>
					</div>

					{/* Stats Cards */}
					<div className="p-6 bg-gray-50">
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
							<StatCard label="Total Events" value={filteredRows.length} />
							<StatCard label="Sales Events" value={filteredRows.filter(r => r.action?.includes('sale')).length} />
							<StatCard label="Purchase Events" value={filteredRows.filter(r => r.action?.includes('purchase')).length} />
							<StatCard label="Login Events" value={filteredRows.filter(r => r.action?.includes('login')).length} />
						</div>
					</div>

					{/* Table */}
					<div className="overflow-x-auto">
						{loading ? (
							<div className="flex items-center justify-center py-20">
								<p className="text-gray-500">Loading audit logs...</p>
							</div>
						) : filteredRows.length === 0 ? (
							<div className="text-center py-20 px-6">
								<p className="text-gray-500">No audit logs found matching your search.</p>
							</div>
						) : (
							<table className="min-w-full divide-y divide-gray-200">
								<thead className="bg-gray-100">
									<tr>
								<th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">Action</th>
								<th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">User</th>
								<th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">Details</th>
								<th className="px-6 py-4 text-right text-sm font-bold text-gray-700 uppercase tracking-wider">Timestamp</th>
									</tr>
								</thead>
								<tbody className="bg-white divide-y divide-gray-200">
									{filteredRows.map((r) => (
										<tr key={r.id} className="hover:bg-gray-50">
										<td className="px-6 py-5 whitespace-nowrap">
											<span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${getActionColor(r.action)}`}>
												{r.action}
											</span>
										</td>
										<td className="px-6 py-5 whitespace-nowrap text-base font-semibold text-gray-900">
											{r.username || r.user_id || "System"}
										</td>
										<td className="px-6 py-5">
											{r.details && (
												<pre className="text-sm text-gray-700 bg-gray-50 p-3 rounded overflow-x-auto whitespace-pre-wrap break-words max-w-lg">
													{JSON.stringify(r.details, null, 2)}
												</pre>
											)}
										</td>
										<td className="px-6 py-5 whitespace-nowrap text-right text-base text-gray-600">
												{new Date(r.created_at).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })}
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

function StatCard({ label, value }) {
	return (
		<div className="bg-white rounded-lg shadow p-4">
			<p className="text-sm font-medium text-gray-500">{label}</p>
			<p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
		</div>
	);
}
