import { useEffect, useState, useRef, useCallback } from "react";

const RETURNS_DRAFT_KEY = "returns_draft";
const MANUAL_REASONS = ["Wrong Item", "Damaged", "Expired", "Overstocked", "Customer Changed Mind", "Other"];

// ── Refund Notice Modal ────────────────────────────────────────────
function RefundModal({ amount, returnId, onClose }) {
  const btnRef = useRef(null);
  useEffect(() => { btnRef.current?.focus(); }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onKeyDown={(e) => e.key === "Escape" && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-6 text-center">
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-white font-bold text-lg">Return Processed!</p>
          <p className="text-emerald-100 text-xs mt-0.5">Ref #{returnId} &middot; Stock Restored</p>
        </div>
        <div className="px-6 pt-6 pb-4 text-center">
          <p className="text-gray-400 text-xs uppercase tracking-widest font-semibold mb-2">Refund to Customer</p>
          <p className="text-5xl font-black text-emerald-600 my-2">Rs. {Number(amount).toFixed(2)}</p>
          <p className="text-gray-500 text-sm mt-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
            💵 Please return this amount to the customer.
          </p>
        </div>
        <div className="px-6 pb-6 pt-2">
          <button ref={btnRef} onClick={onClose}
            className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl font-bold text-sm transition shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-400">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Returns({ onBack }) {
  const [mode, setMode] = useState("invoice");

  // ── Invoice return state ───────────────────────────────────────
  const [saleId, setSaleId] = useState("");
  const [saleData, setSaleData] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmItems, setConfirmItems] = useState([]);
  const [confirmAmount, setConfirmAmount] = useState(0);
  const [refundNotice, setRefundNotice] = useState(null); // { amount, returnId }
  const hasHydratedDraftRef = useRef(false);
  const saleIdRef = useRef(null);
  const proceedBtnRef = useRef(null);

  // ── Manual return state ────────────────────────────────────────
  const [manualItems, setManualItems] = useState([]);
  const [manualReason, setManualReason] = useState("");
  const [manualReturnDate, setManualReturnDate] = useState(new Date().toISOString().slice(0, 10));
  const [productSearch, setProductSearch] = useState("");
  const [productResults, setProductResults] = useState([]);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [manualLoading, setManualLoading] = useState(false);
  const [manualError, setManualError] = useState("");
  const [manualRefundNotice, setManualRefundNotice] = useState(null);
  const searchDebounceRef = useRef(null);
  const productSearchRef = useRef(null);

  // ── Draft save/restore ─────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(RETURNS_DRAFT_KEY);
      if (!raw) { hasHydratedDraftRef.current = true; return; }
      const d = JSON.parse(raw);
      if (d?.saleId) setSaleId(d.saleId);
      if (d?.reason) setReason(d.reason);
      if (d?.saleData) setSaleData(d.saleData);
      if (Array.isArray(d?.selectedItems)) setSelectedItems(d.selectedItems);
    } catch (e) {} finally { hasHydratedDraftRef.current = true; }
  }, []);
  useEffect(() => {
    if (!hasHydratedDraftRef.current) return;
    const t = setTimeout(() => {
      try { localStorage.setItem(RETURNS_DRAFT_KEY, JSON.stringify({ saleId, saleData, selectedItems, reason })); } catch (e) {}
    }, 500);
    return () => clearTimeout(t);
  }, [saleId, saleData, selectedItems, reason]);

  // ── Invoice return logic ───────────────────────────────────────
  const handleSearchSale = async () => {
    if (!saleId.trim()) { setError("Please enter a sale/invoice ID"); return; }
    setLoading(true); setError(""); setSaleData(null); setSelectedItems([]);
    try { localStorage.removeItem(RETURNS_DRAFT_KEY); } catch (e) {}
    try {
      const api = (await import("../api")).default;
      const { data } = await api.get(`/returns/sale/${saleId}`);
      if (!data.items?.length) { setError("No returnable items found for this sale."); return; }
      setSaleData(data);
      setSelectedItems(data.items.map(item => ({
        sale_item_id: item.sale_item_id, product_id: item.product_id,
        product_name: item.product_name, batch_id: item.batch_id, batch_no: item.batch_no,
        sold_qty: Number(item.sold_qty || 0), returned_qty: Number(item.returned_qty || 0),
        remaining_qty: Number(item.remaining_qty || 0), return_qty: Number(item.remaining_qty || 0),
        original_unit_price: Number(item.unit_price || 0),
        discount_percent: String(Number(item.discount_percent || 0)), selected: true,
      })));
    } catch (err) {
      setError(err.response?.data?.error || "Sale not found. Please check the invoice number.");
    } finally { setLoading(false); }
  };

  const handleToggleItem = (index) => {
    const u = [...selectedItems]; u[index].selected = !u[index].selected; setSelectedItems(u);
  };
  const handleQtyChange = (index, value) => {
    const u = [...selectedItems]; const qty = Number(value);
    if (qty > 0 && qty <= u[index].remaining_qty) { u[index].return_qty = qty; setSelectedItems(u); }
  };
  const handleDiscountChange = (index, value) => {
    const u = [...selectedItems];
    if (value === "") { u[index].discount_percent = ""; setSelectedItems(u); return; }
    const n = Number(value); if (Number.isNaN(n)) return;
    u[index].discount_percent = String(n < 0 ? 0 : n > 100 ? 100 : n); setSelectedItems(u);
  };
  const calculateTotal = () => selectedItems.filter(i => i.selected).reduce((s, i) =>
    s + i.return_qty * i.original_unit_price * (1 - Number(i.discount_percent || 0) / 100), 0);

  const handleSubmitReturn = () => {
    const items = selectedItems.filter(i => i.selected && i.return_qty > 0);
    if (!items.length) { setError("Select at least one item to return."); return; }
    setConfirmItems(items); setConfirmAmount(calculateTotal()); setShowConfirm(true);
    setTimeout(() => proceedBtnRef.current?.focus(), 80);
  };

  const doProcessReturn = async () => {
    setShowConfirm(false); setLoading(true); setError("");
    try {
      const api = (await import("../api")).default;
      const { data } = await api.post("/returns", {
        sale_id: Number(saleId),
        items: confirmItems.map(item => ({
          sale_item_id: item.sale_item_id, product_id: item.product_id, batch_id: item.batch_id,
          qty: item.return_qty, unit_price: item.original_unit_price,
          discount_percent: Number(item.discount_percent || 0),
        })),
        reason: reason.trim(),
      });
      setRefundNotice({ amount: data.total, returnId: data.return_id });
      try { localStorage.removeItem(RETURNS_DRAFT_KEY); } catch (e) {}
      setSaleId(""); setSaleData(null); setSelectedItems([]); setReason("");
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to process return.");
    } finally { setLoading(false); }
  };

  // ── Manual return logic ────────────────────────────────────────
  const searchProducts = useCallback(async (q) => {
    if (!q.trim()) { setProductResults([]); return; }
    setSearchingProducts(true);
    try {
      const api = (await import("../api")).default;
      const { data } = await api.get(`/returns/search-products?q=${encodeURIComponent(q)}`);
      setProductResults(data || []);
    } catch (e) { setProductResults([]); } finally { setSearchingProducts(false); }
  }, []);

  useEffect(() => {
    clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => searchProducts(productSearch), 350);
    return () => clearTimeout(searchDebounceRef.current);
  }, [productSearch, searchProducts]);

  const addManualItem = (row) => {
    if (manualItems.some(i => i.batch_id === row.batch_id)) return;
    setManualItems(prev => [...prev, {
      key: `${row.id}-${row.batch_id ?? "nb"}-${Date.now()}`,
      product_id: row.id, product_name: row.name, formula: row.formula,
      batch_id: row.batch_id, batch_no: row.batch_no, stock_qty: Number(row.stock_qty || 0),
      qty: 1, unit_price: Number(row.selling_price || row.cost || 0), discount_percent: 0, reason: "Wrong Item",
    }]);
    setProductSearch(""); setProductResults([]); productSearchRef.current?.focus();
  };

  const updateManualItem = (key, field, value) =>
    setManualItems(prev => prev.map(i => i.key === key ? { ...i, [field]: value } : i));
  const removeManualItem = (key) => setManualItems(prev => prev.filter(i => i.key !== key));
  const manualTotal = manualItems.reduce((s, i) =>
    s + Number(i.qty) * Number(i.unit_price) * (1 - Number(i.discount_percent || 0) / 100), 0);

  const handleManualSubmit = async () => {
    setManualError("");
    if (!manualItems.length) return setManualError("Add at least one item.");
    for (const it of manualItems) {
      if (!it.qty || Number(it.qty) < 1) return setManualError(`Invalid qty for ${it.product_name}`);
      if (Number(it.unit_price) < 0) return setManualError(`Invalid price for ${it.product_name}`);
    }
    setManualLoading(true);
    try {
      const api = (await import("../api")).default;
      const { data } = await api.post("/returns/manual", {
        reason: manualReason.trim(), return_date: manualReturnDate,
        items: manualItems.map(it => ({
          product_id: it.product_id, batch_id: it.batch_id || null, qty: Number(it.qty),
          unit_price: Number(it.unit_price) * (1 - Number(it.discount_percent || 0) / 100),
          reason: it.reason,
        })),
      });
      setManualRefundNotice({ amount: data.total, returnId: data.return_id });
      setManualItems([]); setManualReason("");
    } catch (err) {
      setManualError(err.response?.data?.error || "Failed to process manual return.");
    } finally { setManualLoading(false); }
  };

  // ── Shared input class ─────────────────────────────────────────
  const inp = "border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400 transition";

  return (
    <div className="p-4 lg:p-6 bg-gray-100 min-h-screen">
      {/* Refund notice modals */}
      {refundNotice && <RefundModal amount={refundNotice.amount} returnId={refundNotice.returnId}
        onClose={() => { setRefundNotice(null); setTimeout(() => saleIdRef.current?.focus(), 80); }} />}
      {manualRefundNotice && <RefundModal amount={manualRefundNotice.amount} returnId={manualRefundNotice.returnId}
        onClose={() => { setManualRefundNotice(null); setTimeout(() => productSearchRef.current?.focus(), 80); }} />}

      <div className="max-w-6xl mx-auto">
        {/* Page header */}
        <div className="bg-gradient-to-r from-red-600 via-red-500 to-rose-500 rounded-2xl px-6 py-5 flex items-center justify-between mb-6 shadow-lg shadow-red-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shadow-inner">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Sales Returns</h1>
              <p className="text-red-100 text-sm mt-0.5">Process customer refunds &amp; restore stock</p>
            </div>
          </div>
          <button onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white border border-white/30 rounded-xl hover:bg-white/15 transition backdrop-blur-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        </div>

        {/* Tab bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 mb-5 p-1.5 flex gap-1">
          {[
            ["invoice", "📄 Invoice Return", "Return items from a known invoice"],
            ["manual", "✏️ Manual Return", "No invoice — direct product return"],
          ].map(([key, label, desc]) => (
            <button key={key} onClick={() => setMode(key)}
              className={`flex-1 px-4 py-3 rounded-xl text-sm font-semibold transition text-left ${
                mode === key
                  ? "bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-md shadow-red-200"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
              }`}>
              <div>{label}</div>
              <div className={`text-xs mt-0.5 font-normal ${mode === key ? "text-red-100" : "text-gray-400"}`}>{desc}</div>
            </button>
          ))}
        </div>

        {/* ── INVOICE RETURN ── */}
        {mode === "invoice" && (
          <div className="space-y-4">
            {/* Search row */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Invoice / Sale ID</label>
                  <input ref={saleIdRef} type="text" value={saleId}
                    onChange={(e) => setSaleId(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearchSale()}
                    placeholder="Enter invoice number and press Enter..."
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400 transition"
                    disabled={loading} />
                </div>
                <button onClick={handleSearchSale} disabled={loading}
                  className="px-6 py-2.5 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white text-sm font-bold rounded-xl shadow-md shadow-red-200 disabled:opacity-40 transition">
                  {loading ? "Searching..." : "🔍 Search"}
                </button>
                {saleData && (
                  <button onClick={() => { setSaleId(""); setSaleData(null); setSelectedItems([]); setReason(""); setError(""); saleIdRef.current?.focus(); }}
                    className="px-4 py-2.5 text-sm font-semibold text-gray-500 border border-gray-300 rounded-xl hover:bg-gray-50 transition">
                    Clear
                  </button>
                )}
              </div>
              {error && (
                <div className="mt-3 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-sm font-medium">
                  <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              )}
            </div>

            {/* Sale info + items */}
            {saleData && (
              <>
                {/* Sale summary strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                    <p className="text-xs font-bold text-blue-400 uppercase tracking-wider">Sale Date</p>
                    <p className="text-sm font-black text-blue-700 mt-0.5">{new Date(saleData.sale.created_at).toLocaleString("en-PK",{day:"2-digit",month:"short",year:"numeric"})}</p>
                  </div>
                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
                    <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Sale Total</p>
                    <p className="text-sm font-black text-indigo-700 mt-0.5">Rs. {Number(saleData.sale.total||0).toFixed(2)}</p>
                  </div>
                  <div className="bg-orange-50 border border-orange-100 rounded-xl px-4 py-3">
                    <p className="text-xs font-bold text-orange-400 uppercase tracking-wider">Discount</p>
                    <p className="text-sm font-black text-orange-700 mt-0.5">Rs. {Number(saleData.sale.discount||0).toFixed(2)}</p>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
                    <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Net Total</p>
                    <p className="text-sm font-black text-emerald-700 mt-0.5">Rs. {Number(saleData.sale.net_total||0).toFixed(2)}</p>
                  </div>
                </div>

                {/* Items table */}
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                    <span className="text-sm font-bold text-gray-700">Select items to return</span>
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-500 font-semibold">
                      <input type="checkbox" checked={selectedItems.every(i=>i.selected)}
                        onChange={(e) => setSelectedItems(selectedItems.map(i=>({...i,selected:e.target.checked})))}
                        className="w-4 h-4 accent-red-500 cursor-pointer" />
                      Select All
                    </label>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gradient-to-r from-red-50 to-rose-50 border-b border-red-100">
                          <th className="w-10 px-3 py-2.5"></th>
                          <th className="px-3 py-2.5 text-left text-xs font-bold text-red-500 uppercase tracking-wider">Product</th>
                          <th className="px-3 py-2.5 text-center text-xs font-bold text-red-500 uppercase tracking-wider">Batch</th>
                          <th className="px-3 py-2.5 text-center text-xs font-bold text-red-500 uppercase tracking-wider">Sold</th>
                          <th className="px-3 py-2.5 text-center text-xs font-bold text-red-500 uppercase tracking-wider">Returned</th>
                          <th className="px-3 py-2.5 text-center text-xs font-bold text-red-500 uppercase tracking-wider">Remaining</th>
                          <th className="px-3 py-2.5 text-center text-xs font-bold text-red-500 uppercase tracking-wider">Qty</th>
                          <th className="px-3 py-2.5 text-right text-xs font-bold text-red-500 uppercase tracking-wider">Unit Price</th>
                          <th className="px-3 py-2.5 text-center text-xs font-bold text-red-500 uppercase tracking-wider">Disc %</th>
                          <th className="px-3 py-2.5 text-right text-xs font-bold text-red-500 uppercase tracking-wider">Refund</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {selectedItems.map((item, index) => (
                          <tr key={index}
                            className={item.selected
                              ? "bg-red-50/40 hover:bg-red-50/70 transition"
                              : "bg-white opacity-50 hover:opacity-70 transition"}>
                            <td className="px-3 py-2.5 text-center">
                              <input type="checkbox" checked={item.selected} onChange={() => handleToggleItem(index)}
                                className="w-4 h-4 accent-red-500 cursor-pointer" />
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="font-semibold text-gray-800">{item.product_name}</span>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              {item.batch_no
                                ? <span className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">{item.batch_no}</span>
                                : <span className="text-gray-400">—</span>}
                            </td>
                            <td className="px-3 py-2.5 text-center text-gray-600 font-medium">{item.sold_qty}</td>
                            <td className="px-3 py-2.5 text-center">
                              {item.returned_qty > 0
                                ? <span className="inline-block bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">{item.returned_qty}</span>
                                : <span className="text-gray-400">0</span>}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <span className="inline-block bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full">{item.remaining_qty}</span>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <input type="number" min="1" max={item.remaining_qty} value={item.return_qty}
                                onChange={(e) => handleQtyChange(index, e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSubmitReturn()}
                                disabled={!item.selected} className={`${inp} w-16 text-center disabled:bg-gray-100 disabled:cursor-not-allowed`} />
                            </td>
                            <td className="px-3 py-2.5 text-right text-gray-700 font-medium">Rs. {item.original_unit_price.toFixed(2)}</td>
                            <td className="px-3 py-2.5 text-center">
                              <input type="number" min="0" max="100" step="0.01" value={item.discount_percent}
                                onChange={(e) => handleDiscountChange(index, e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSubmitReturn()}
                                disabled={!item.selected} className={`${inp} w-16 text-center disabled:bg-gray-100 disabled:cursor-not-allowed`} />
                            </td>
                            <td className="px-3 py-2.5 text-right font-bold text-emerald-600">
                              {item.selected
                                ? `Rs. ${(item.return_qty * item.original_unit_price * (1 - Number(item.discount_percent||0)/100)).toFixed(2)}`
                                : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-red-200 bg-gradient-to-r from-red-50 to-rose-50">
                          <td colSpan={9} className="px-4 py-3 text-right text-sm font-bold text-red-600 uppercase tracking-wider">Refund Total</td>
                          <td className="px-4 py-3 text-right text-xl font-black text-emerald-600">Rs. {calculateTotal().toFixed(2)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Reason + actions */}
                <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row gap-4 items-start">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Reason (Optional)</label>
                    <input type="text" value={reason} onChange={(e) => setReason(e.target.value)}
                      placeholder="e.g. Wrong item, Damaged, Customer request"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400 transition" />
                  </div>
                  <div className="flex gap-2 sm:pt-6">
                    <button onClick={handleSubmitReturn}
                      disabled={loading || !selectedItems.some(i => i.selected)}
                      className="px-6 py-2.5 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white text-sm font-bold rounded-xl shadow-md shadow-red-200 disabled:opacity-40 transition">
                      {loading ? "Processing..." : "Process Return"}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Confirm dialog */}
            {showConfirm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                onKeyDown={(e) => e.key === "Escape" && setShowConfirm(false)}>
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
                  <div className="bg-gradient-to-r from-red-500 to-rose-500 px-6 py-4">
                    <p className="text-white font-bold text-base">Confirm Return</p>
                    <p className="text-red-100 text-xs mt-0.5">Review before processing</p>
                  </div>
                  <div className="px-6 py-5 space-y-3">
                    <div className="flex justify-between items-center bg-gray-50 rounded-xl px-4 py-2.5">
                      <span className="text-sm font-semibold text-gray-500">Items</span>
                      <span className="text-sm font-bold text-gray-800">{confirmItems.length}</span>
                    </div>
                    <div className="flex justify-between items-center bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5">
                      <span className="text-sm font-semibold text-emerald-600">Refund Amount</span>
                      <span className="text-lg font-black text-emerald-600">Rs. {Number(confirmAmount).toFixed(2)}</span>
                    </div>
                    {reason && (
                      <div className="flex justify-between items-center bg-gray-50 rounded-xl px-4 py-2.5">
                        <span className="text-sm font-semibold text-gray-500">Reason</span>
                        <span className="text-sm font-medium text-gray-700">{reason}</span>
                      </div>
                    )}
                  </div>
                  <div className="px-6 pb-6 flex gap-3">
                    <button ref={proceedBtnRef} onClick={doProcessReturn}
                      className="flex-1 py-2.5 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white text-sm font-bold rounded-xl shadow-md transition focus:outline-none focus:ring-2 focus:ring-red-400">
                      Confirm
                    </button>
                    <button onClick={() => setShowConfirm(false)}
                      className="flex-1 py-2.5 border border-gray-300 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── MANUAL RETURN ── */}
        {mode === "manual" && (
          <div className="space-y-4">
            {manualError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2.5 text-sm font-medium">
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {manualError}
              </div>
            )}

            {/* Controls row */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Search Product</label>
                  <input ref={productSearchRef} type="text" value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Type product name or formula..."
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400 transition" />
                  {(productResults.length > 0 || searchingProducts) && productSearch.trim() && (
                    <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-64 overflow-y-auto">
                      {searchingProducts && (
                        <div className="px-4 py-3 text-xs text-gray-400 flex items-center gap-2">
                          <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                          </svg>
                          Searching...
                        </div>
                      )}
                      {productResults.map((row) => {
                        const added = manualItems.some(i => i.batch_id === row.batch_id);
                        return (
                          <button key={`${row.id}-${row.batch_id}`} disabled={added}
                            onClick={() => addManualItem(row)}
                            className={`w-full text-left px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-red-50 transition ${added ? "opacity-40 cursor-not-allowed" : ""}`}>
                            <div className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                              {row.name}
                              {added && <span className="text-xs bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full font-normal">added</span>}
                            </div>
                            <div className="text-xs flex flex-wrap gap-1.5 mt-1">
                              {row.formula && <span className="bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded">{row.formula}</span>}
                              {row.batch_no && <span className="bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">Batch: {row.batch_no}</span>}
                              {row.expiry && <span className="bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded">Exp: {new Date(row.expiry).toLocaleDateString("en-PK",{month:"short",year:"2-digit"})}</span>}
                              <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">Qty: {row.stock_qty}</span>
                              <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">Rs.{Number(row.selling_price||0).toFixed(0)}</span>
                            </div>
                          </button>
                        );
                      })}
                      {!searchingProducts && !productResults.length && (
                        <div className="px-4 py-3 text-xs text-gray-400 text-center">No products found.</div>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Return Date</label>
                  <input type="date" value={manualReturnDate} onChange={(e) => setManualReturnDate(e.target.value)}
                    className="border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400 transition" />
                </div>
              </div>

            </div>

            {/* Empty state */}
            {!manualItems.length && (
              <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl py-14 text-center">
                <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <p className="text-gray-500 font-semibold text-sm">No items added yet</p>
                <p className="text-gray-400 text-xs mt-1">Search for a product above to add items to this return.</p>
              </div>
            )}

            {/* Items table */}
            {manualItems.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-5 py-3.5 bg-gradient-to-r from-red-50 to-rose-50 border-b border-red-100 flex items-center justify-between">
                  <span className="text-sm font-bold text-red-700">Return Items — {manualItems.length} product{manualItems.length > 1 ? "s" : ""}</span>
                  <span className="text-sm font-black text-emerald-600">Total: Rs. {manualTotal.toFixed(2)}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gradient-to-r from-red-50 to-rose-50 border-b border-red-100">
                        <th className="px-3 py-2.5 text-left text-xs font-bold text-red-500 uppercase tracking-wider">Product</th>
                        <th className="px-3 py-2.5 text-center text-xs font-bold text-red-500 uppercase tracking-wider">Batch</th>
                        <th className="px-3 py-2.5 text-center text-xs font-bold text-red-500 uppercase tracking-wider">Stock</th>
                        <th className="px-3 py-2.5 text-center text-xs font-bold text-red-500 uppercase tracking-wider w-20">Qty</th>
                        <th className="px-3 py-2.5 text-right text-xs font-bold text-red-500 uppercase tracking-wider w-28">Unit Price</th>
                        <th className="px-3 py-2.5 text-center text-xs font-bold text-red-500 uppercase tracking-wider w-20">Disc %</th>
                        <th className="px-3 py-2.5 text-center text-xs font-bold text-red-500 uppercase tracking-wider">Reason</th>
                        <th className="px-3 py-2.5 text-right text-xs font-bold text-red-500 uppercase tracking-wider w-28">Refund</th>
                        <th className="w-8 px-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {manualItems.map((it) => (
                        <tr key={it.key} className="hover:bg-red-50/30 transition">
                          <td className="px-3 py-2.5">
                            <div className="font-semibold text-gray-800">{it.product_name}</div>
                            {it.formula && <div className="text-xs text-purple-500 font-medium">{it.formula}</div>}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {it.batch_no
                              ? <span className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">{it.batch_no}</span>
                              : <span className="text-gray-400">—</span>}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className="inline-block bg-gray-100 text-gray-600 text-xs font-semibold px-2 py-0.5 rounded-full">{it.stock_qty}</span>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <input type="number" min="1" value={it.qty}
                              onChange={(e) => updateManualItem(it.key, "qty", Number(e.target.value))}
                              className={`${inp} w-16 text-center`} />
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <input type="number" min="0" step="0.01" value={it.unit_price}
                              onChange={(e) => updateManualItem(it.key, "unit_price", e.target.value)}
                              className={`${inp} w-24 text-right`} />
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <input type="number" min="0" max="100" step="0.5" value={it.discount_percent}
                              onChange={(e) => updateManualItem(it.key, "discount_percent", Math.min(100, Math.max(0, Number(e.target.value)||0)))}
                              className={`${inp} w-14 text-center`} />
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <select value={it.reason} onChange={(e) => updateManualItem(it.key, "reason", e.target.value)}
                              className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400 bg-white">
                              {MANUAL_REASONS.map(r => <option key={r}>{r}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <div className="font-bold text-emerald-600">Rs. {(Number(it.qty) * Number(it.unit_price) * (1 - Number(it.discount_percent||0)/100)).toFixed(2)}</div>
                            {Number(it.discount_percent) > 0 && (
                              <div className="text-xs text-orange-500 font-medium">{it.discount_percent}% off</div>
                            )}
                          </td>
                          <td className="px-2 py-2.5 text-center">
                            <button onClick={() => removeManualItem(it.key)}
                              className="w-6 h-6 rounded-full bg-red-100 hover:bg-red-200 text-red-500 hover:text-red-700 text-sm leading-none font-bold transition flex items-center justify-center mx-auto">
                              ×
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-red-200 bg-gradient-to-r from-red-50 to-rose-50">
                        <td colSpan={7} className="px-4 py-3 text-right text-sm font-bold text-red-600 uppercase tracking-wider">Refund Total</td>
                        <td className="px-4 py-3 text-right text-xl font-black text-emerald-600">Rs. {manualTotal.toFixed(2)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {manualItems.length > 0 && (
              <div className="flex gap-3 justify-end">
                <button onClick={() => { setManualItems([]); setManualReason(""); setManualError(""); }}
                  className="px-5 py-2.5 text-sm font-semibold text-gray-500 border border-gray-300 rounded-xl hover:bg-gray-50 transition">
                  Clear All
                </button>
                <button onClick={handleManualSubmit} disabled={manualLoading}
                  className="px-6 py-2.5 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white text-sm font-bold rounded-xl shadow-md shadow-red-200 disabled:opacity-40 transition">
                  {manualLoading ? "Processing..." : `Process Return — Rs. ${manualTotal.toFixed(2)}`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
