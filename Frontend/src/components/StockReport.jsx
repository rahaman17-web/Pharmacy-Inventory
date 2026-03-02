import { useEffect, useState } from "react";
import api from "../api";

const ALL_CATEGORIES = [
	"Tablet", "Syrup", "Capsule", "Drop", "Cream", "Face Wash",
	"Injection", "Lotion", "Milk", "Ointment", "General", "Surgical",
];

export default function StockReport({ onBack }) {
	const [rows, setRows] = useState([]);
	const [loading, setLoading] = useState(false);
	const [searchTerm, setSearchTerm] = useState("");
	const [activeFilter, setActiveFilter] = useState("all");
	const [categoryFilter, setCategoryFilter] = useState("");

	useEffect(() => {
		async function load() {
			setLoading(true);
			try {
				const { data } = await api.get("/stock");
				setRows(Array.isArray(data) ? data : []);
			} catch (err) {
				console.error(err);
				alert("Failed to load stock");
			} finally {
				setLoading(false);
			}
		}
		load();
	}, []);

	const categories = ALL_CATEGORIES;

	const searchFiltered = rows.filter(r => {
		const matchSearch =
			r.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			r.formula?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			r.batch_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			r.category?.toLowerCase().includes(searchTerm.toLowerCase());
		const matchCategory = !categoryFilter || (r.category || "").trim().toLowerCase() === categoryFilter.toLowerCase();
		return matchSearch && matchCategory;
	});

	// Parse any date string/object to LOCAL midnight (avoids UTC timezone shift issues)
	const toLocalMidnight = (d) => { const x = new Date(d); return new Date(x.getFullYear(), x.getMonth(), x.getDate()); };

	const getExpiryLevel = (expiry) => {
		if (!expiry) return 'none';
		const today = toLocalMidnight(new Date());
		const exp   = toLocalMidnight(expiry);
		const diffMs     = exp - today;
		const diffMonths = diffMs / (1000 * 60 * 60 * 24 * 30.44);
		if (diffMs < 0)        return 'expired';
		if (diffMonths <= 1)   return 'critical';
		if (diffMonths <= 3)   return 'danger';
		if (diffMonths < 8)    return 'warning';   // <8 months → catches items with 7m remaining
		return 'safe';
	};

	const counts = {
		all: searchFiltered.length,
		expired: searchFiltered.filter(r => getExpiryLevel(r.expiry) === 'expired').length,
		critical: searchFiltered.filter(r => getExpiryLevel(r.expiry) === 'critical').length,
		danger: searchFiltered.filter(r => getExpiryLevel(r.expiry) === 'danger').length,
		warning: searchFiltered.filter(r => getExpiryLevel(r.expiry) === 'warning').length,
		testing: searchFiltered.filter(r => r.is_testing).length,
	};
	// Combined short expire: all items not yet expired but ≤7 months remaining
	counts.shortExpire = counts.critical + counts.danger + counts.warning;

	const filteredRows = searchFiltered.filter(r => {
		if (activeFilter === 'all') return true;
		if (activeFilter === 'testing') return !!r.is_testing;
		if (activeFilter === 'shortExpire') return ['critical','danger','warning'].includes(getExpiryLevel(r.expiry));
		return getExpiryLevel(r.expiry) === activeFilter;
	});

	const getExpiryStatus = (expiry) => {
		if (!expiry) return { level: 'none', label: '-', months: null };
		const today = toLocalMidnight(new Date());
		const exp   = toLocalMidnight(expiry);
		const diffMs     = exp - today;
		const diffMonths = diffMs / (1000 * 60 * 60 * 24 * 30.44);
		const fmt = exp.toLocaleDateString('en-PK', { day:'2-digit', month:'short', year:'numeric' });
		if (diffMs < 0)        return { level: 'expired',  label: fmt, tag: 'EXPIRED' };
		if (diffMonths <= 1)   return { level: 'critical', label: fmt, tag: `${Math.ceil(diffMs/(1000*60*60*24))}d left` };
		if (diffMonths <= 3)   return { level: 'danger',   label: fmt, tag: `${Math.floor(diffMonths)}m left` };
		if (diffMonths < 8)    return { level: 'warning',  label: fmt, tag: `${Math.floor(diffMonths)}m left` };
		return { level: 'safe', label: fmt, tag: null };
	};

	const styleTag = `
		@keyframes expiry-pulse {
			0%,100% { opacity:1; transform:scale(1); }
			50% { opacity:0.7; transform:scale(1.07); }
		}
		.expiry-pulse { animation: expiry-pulse 1.4s ease-in-out infinite; display:inline-block; }
	`;

	return (
		<div className="p-2 sm:p-4 lg:p-6 bg-gray-100 min-h-screen">
			<style>{styleTag}</style>
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

					{/* Search + Filter Tabs */}
					<div className="p-4 border-b border-gray-200">
						{/* Search + Category row */}
						<div className="flex flex-col sm:flex-row gap-2 mb-3">
							<div className="relative flex-1">
								<input
									type="text"
									placeholder="Search by product name, category, formula, or batch number..."
									className="w-full px-5 py-3 pl-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
								/>
								<svg className="w-6 h-6 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
								</svg>
							</div>
							{/* Category dropdown */}
							<div className="flex items-center gap-2 shrink-0">
								<span style={{ fontWeight: 700, fontSize: 13, color: '#374151', whiteSpace: 'nowrap' }}>Category:</span>
								<select
									value={categoryFilter}
									onChange={(e) => { setCategoryFilter(e.target.value); setActiveFilter('all'); }}
									className="border border-gray-300 rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500"
									style={{ minWidth: 180, background: categoryFilter ? '#fef3c7' : '#fff', color: '#374151' }}
								>
									<option value="">All Categories</option>
									{categories.map(cat => (
										<option key={cat} value={cat}>{cat}</option>
									))}
								</select>
								{categoryFilter && (
									<button onClick={() => setCategoryFilter("")} style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>✕ Clear</button>
								)}
							</div>
						</div>
						{/* Active category badge */}
						{categoryFilter && (
							<div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
								<span style={{ background: '#fef3c7', border: '2px solid #f59e0b', borderRadius: 8, padding: '3px 12px', fontWeight: 800, fontSize: 13, color: '#92400e' }}>
									{categoryFilter}
								</span>
								<span style={{ fontSize: 12, color: '#6b7280' }}>{searchFiltered.length} item{searchFiltered.length !== 1 ? 's' : ''} found</span>
							</div>
						)}
						<div className="flex flex-wrap gap-2">
							{[
							{ key:'all',         label:'All Stock',     icon:'📦', bg:'#6366f1', alertBg: null,      count: counts.all },
							{ key:'shortExpire',  label:'Short Expire',  icon:'⏳', alertBg:'#ea580c',               count: counts.shortExpire },
							{ key:'expired',      label:'Expired',       icon:'💀', alertBg:'#dc2626',               count: counts.expired },
							{ key:'testing',      label:'Testing Items', icon:'⚗',  alertBg:'#f97316',               count: counts.testing },
							].map(f => {
								const isActive = activeFilter === f.key;
								const isAlert = f.alertBg && f.count > 0;
								const bg = isActive ? f.alertBg || '#6366f1' : isAlert ? f.alertBg : '#f3f4f6';
								const color = isActive || isAlert ? '#fff' : '#374151';
								const border = isActive || isAlert ? (f.alertBg || '#6366f1') : '#d1d5db';
								return (
									<button key={f.key} onClick={()=>setActiveFilter(f.key)}
										className={isAlert && !isActive ? 'expiry-pulse' : ''}
										style={{ background: bg, color, border:`2px solid ${border}`, borderRadius:8, padding:'5px 14px', fontWeight:700, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', gap:5, opacity: f.count===0 ? 0.45 : 1, boxShadow: isAlert && !isActive ? `0 0 0 3px ${f.alertBg}55` : 'none' }}>
										{f.icon} {f.label}
										<span style={{ background: isActive ? 'rgba(255,255,255,0.25)' : isAlert ? 'rgba(0,0,0,0.25)' : '#e5e7eb', color: isActive || isAlert ? '#fff' : '#6b7280', borderRadius:10, padding:'1px 7px', fontSize:11, fontWeight:900, marginLeft:2 }}>{f.count}</span>
									</button>
								);
							})}
						</div>
					</div>
				{/* Stats Cards */}
				<div className="p-4 bg-gray-50">
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
						<StatCard label={activeFilter==='all'?'Products':`Filtered`} value={filteredRows.length} />
						<StatCard label="Total Quantity" value={filteredRows.reduce((s,r)=>s+(Number(r.qty)||0),0)} />
						<StatCard label="Total Cost Value" value={`Rs. ${filteredRows.reduce((s,r)=>{ const c=Number(r.cost); return s+(c>0?(Number(r.qty)||0)*c:0); },0).toFixed(2)}`} />
						<StatCard label="Expected Profit" value={`Rs. ${filteredRows.reduce((s,r)=>{ const c=Number(r.cost); return s+(c>0?(Number(r.qty)||0)*((Number(r.selling_price)||0)-c):0); },0).toFixed(2)}`} />
						</div>
					</div>

					{/* Table */}
					<div className="overflow-x-auto">
						{loading ? (
							<div className="flex items-center justify-center py-20">
								<p className="text-gray-500">Loading stock data...</p>
							</div>
					) : filteredRows.length === 0 && categoryFilter ? (
						<div className="text-center py-20 px-6">
							<div style={{ fontSize: 52 }}>📭</div>
							<p className="text-gray-700 text-xl font-black mt-3">No Stock Available</p>
							<p className="text-gray-500 text-sm mt-2">
								Category <strong style={{ color: '#92400e', background: '#fef3c7', padding: '1px 8px', borderRadius: 4 }}>{categoryFilter}</strong> exists but currently has no stock in inventory.
							</p>
							<button onClick={() => setCategoryFilter('')} className="mt-5 px-5 py-2 bg-orange-500 text-white rounded-lg font-bold text-sm hover:bg-orange-600 transition">
								← Show All Stock
							</button>
						</div>
					) : filteredRows.length === 0 ? (
						<div className="text-center py-20 px-6">
							<p className="text-gray-500 text-lg font-semibold">{activeFilter==='all' ? 'No stock items found.' : `No items match this filter.`}</p>
								{activeFilter !== 'all' && <button onClick={()=>setActiveFilter('all')} className="mt-3 px-4 py-2 bg-indigo-500 text-white rounded font-bold text-sm">Show All Stock</button>}
							</div>
						) : (
							<table className="min-w-full divide-y divide-gray-200">
								<thead className="bg-gray-100">
									<tr>
										<th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Product</th>
									<th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Category</th>
									<th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Supplier</th>
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
										const es = getExpiryStatus(r.expiry);
										const qty = Number(r.qty) || 0;
									const cost = Number(r.cost);
									const hasCost = cost > 0;
										const selling = Number(r.selling_price) || 0;
										const profitTotal = qty * (selling - cost);
									const rowStyle = es.level==='expired'
										? { background:'#fecaca', borderLeft:'5px solid #dc2626' }
										: es.level==='critical'
										? { background:'#fee2e2', borderLeft:'5px solid #ef4444' }
										: es.level==='danger'
										? { background:'#ffedd5', borderLeft:'5px solid #f97316' }
										: es.level==='warning'
										? { background:'#fef9c3', borderLeft:'5px solid #eab308' }
										: { borderLeft:'5px solid transparent' };
									return (
										<tr key={`${r.product_id}-${r.batch_id}`} style={rowStyle} className="hover:brightness-95">
												<td className="px-6 py-4 whitespace-nowrap">
													<div className="flex items-center gap-2">
														<span className="font-medium text-gray-900">{r.product_name}</span>
														{r.is_testing && <span title="Testing item — to be returned" style={{background:"#f97316",color:"#fff",fontSize:10,fontWeight:900,padding:"1px 6px",borderRadius:3,letterSpacing:1}}>⚗ TEST</span>}
													</div>
													<div className="text-sm text-gray-500">{r.formula}</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
												{r.category ? (
													<button
														onClick={() => setCategoryFilter(r.category === categoryFilter ? '' : r.category)}
														title={r.category === categoryFilter ? 'Clear filter' : `Filter by: ${r.category}`}
														style={{ background: r.category === categoryFilter ? '#f59e0b' : '#fef3c7', color: '#92400e', border: `2px solid ${r.category === categoryFilter ? '#d97706' : '#fde68a'}`, borderRadius: 6, padding: '1px 8px', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
													>
														🏷️ {r.category}
													</button>
												) : <span className="text-gray-400 text-xs">—</span>}
									</td>
									<td className="px-6 py-4 whitespace-nowrap">
										{r.supplier_name
											? <span style={{ background: '#ede9fe', color: '#5b21b6', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4, whiteSpace: 'nowrap' }}>🏢 {r.supplier_name}</span>
											: <span className="text-gray-300 text-xs">—</span>}
									</td>
									<td className="px-6 py-4 whitespace-nowrap">
													<span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
														{r.batch_no || "-"}
													</span>
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm">
													{es.level==='none' ? <span className="text-gray-400">—</span> : (
														<div>
															<div className="font-medium text-gray-800">{es.label}</div>
															{es.level==='expired' && (
																<span className="expiry-pulse" style={{display:'inline-block',background:'#dc2626',color:'#fff',fontSize:10,fontWeight:900,padding:'2px 7px',borderRadius:4,letterSpacing:1,marginTop:2}}>💀 EXPIRED</span>
															)}
															{es.level==='critical' && (
																<span className="expiry-pulse" style={{display:'inline-block',background:'#ef4444',color:'#fff',fontSize:10,fontWeight:900,padding:'2px 7px',borderRadius:4,letterSpacing:1,marginTop:2}}>🚨 {es.tag}</span>
															)}
															{es.level==='danger' && (
																<span style={{display:'inline-block',background:'#f97316',color:'#fff',fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:4,letterSpacing:1,marginTop:2}}>⚠️ {es.tag}</span>
															)}
															{es.level==='warning' && (
																<span style={{display:'inline-block',background:'#eab308',color:'#fff',fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:4,letterSpacing:1,marginTop:2}}>⏳ {es.tag}</span>
															)}
														</div>
													)}
												</td>
												<td className={`px-6 py-4 whitespace-nowrap text-right font-semibold ${qty < 10 ? 'text-red-600' : 'text-gray-900'}`}>
													{qty}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">
													{hasCost ? `Rs. ${cost.toFixed(2)}` : <span className="text-gray-400">—</span>}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">
													{selling > 0 ? `Rs. ${selling.toFixed(2)}` : <span className="text-gray-400">—</span>}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-gray-900">
													{hasCost ? `Rs. ${(qty * cost).toFixed(2)}` : <span className="text-gray-400">—</span>}
												</td>
												<td className={`px-6 py-4 whitespace-nowrap text-right font-semibold ${hasCost && profitTotal >= 0 ? 'text-green-700' : hasCost ? 'text-red-700' : 'text-gray-400'}`}>
										{hasCost ? `Rs. ${profitTotal.toFixed(2)}` : '—'}
												</td>
											</tr>
										);
									})}
								</tbody>
								<tfoot>
									<tr style={{ background: '#f0fdf4', borderTop: '2px solid #16a34a' }}>
										<td colSpan={4} style={{ padding: '10px 24px', fontWeight: 900, fontSize: 14, textAlign: 'right', color: '#15803d' }}>
											{categoryFilter ? categoryFilter.toUpperCase() : 'ALL STOCK'} TOTALS
										</td>
										<td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 900, fontSize: 14, color: '#1e40af', whiteSpace: 'nowrap' }}>
											{filteredRows.reduce((s, r) => s + (Number(r.qty) || 0), 0)}
										</td>
										<td colSpan={2} />
										<td style={{ padding: '10px 24px', textAlign: 'right', fontWeight: 900, fontSize: 14, color: '#15803d', whiteSpace: 'nowrap' }}>
											Sale Value: Rs. {filteredRows.reduce((s, r) => s + (Number(r.qty) || 0) * (Number(r.selling_price) || 0), 0).toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
										</td>
										<td style={{ padding: '10px 24px', textAlign: 'right', fontWeight: 900, fontSize: 14, color: '#b45309', whiteSpace: 'nowrap' }}>
											Purchase Value: Rs. {filteredRows.reduce((s, r) => { const c = Number(r.cost); return s + (c > 0 ? (Number(r.qty) || 0) * c : 0); }, 0).toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
										</td>
									</tr>
								</tfoot>
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
