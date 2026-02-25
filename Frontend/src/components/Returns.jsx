import { useEffect, useState, useRef } from "react";

const RETURNS_DRAFT_KEY = "returns_draft";

export default function Returns({ onBack }) {
  const [saleId, setSaleId] = useState("");
  const [saleData, setSaleData] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showConfirmReturn, setShowConfirmReturn] = useState(false);
  const [confirmRefundAmount, setConfirmRefundAmount] = useState(0);
  const [confirmItems, setConfirmItems] = useState([]);
  const [modalReturnFocus, setModalReturnFocus] = useState(0); // 0=proceed,1=clear,2=cancel
  const modalReturnRef = useRef(null);
  const modalClearRef = useRef(null);
  const modalCancelRef = useRef(null);

  const hasHydratedDraftRef = useRef(false);

  const saleIdRef = useRef(null);

  // Restore draft on refresh/back
  useEffect(() => {
    try {
      const raw = localStorage.getItem(RETURNS_DRAFT_KEY);
      if (!raw) {
        hasHydratedDraftRef.current = true;
        return;
      }
      const draft = JSON.parse(raw);
      if (draft && typeof draft.saleId === "string") setSaleId(draft.saleId);
      if (draft && typeof draft.reason === "string") setReason(draft.reason);
      if (draft && draft.saleData) setSaleData(draft.saleData);
      if (draft && Array.isArray(draft.selectedItems)) setSelectedItems(draft.selectedItems);
    } catch (e) {
      // ignore
    } finally {
      hasHydratedDraftRef.current = true;
    }
  }, []);

  // Save draft (debounced)
  useEffect(() => {
    if (!hasHydratedDraftRef.current) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(
          RETURNS_DRAFT_KEY,
          JSON.stringify({
            saleId,
            saleData,
            selectedItems,
            reason,
          })
        );
      } catch (e) {}
    }, 500);
    return () => clearTimeout(t);
  }, [saleId, saleData, selectedItems, reason]);

  const handleSearchSale = async () => {
    if (!saleId || saleId.trim() === "") {
      setError("Please enter a sale/invoice ID");
      return;
    }

    setLoading(true);
    setError("");
    setSaleData(null);
    setSelectedItems([]);

    try {
      localStorage.removeItem(RETURNS_DRAFT_KEY);
    } catch (e) {}

    try {
      const api = (await import("../api")).default;
      const { data } = await api.get(`/returns/sale/${saleId}`);
      
      if (!data.items || data.items.length === 0) {
        setError("No items found for this sale");
        return;
      }

      setSaleData(data);
      // Initialize all items as selected with full quantity
      setSelectedItems(
        data.items.map((item) => ({
          sale_item_id: item.sale_item_id,
          product_id: item.product_id,
          product_name: item.product_name,
          batch_id: item.batch_id,
          batch_no: item.batch_no,
          sold_qty: Number(item.sold_qty || 0),
          returned_qty: Number(item.returned_qty || 0),
          remaining_qty: Number(item.remaining_qty || 0),
          return_qty: Number(item.remaining_qty || 0),
          original_unit_price: Number(item.unit_price || 0),
          // store as string so input editing isn't interrupted by number parsing
          discount_percent: String(Number(item.discount_percent || 0)),
          selected: true,
        }))
      );
    } catch (err) {
      console.error("Error fetching sale:", err);
      setError(err.response?.data?.error || "Sale not found. Please check the invoice number.");
      setSaleData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleItem = (index) => {
    const updated = [...selectedItems];
    updated[index].selected = !updated[index].selected;
    setSelectedItems(updated);
  };

  const handleQtyChange = (index, value) => {
    const updated = [...selectedItems];
    const qty = Number(value);
    if (qty > 0 && qty <= updated[index].remaining_qty) {
      updated[index].return_qty = qty;
      setSelectedItems(updated);
    }
  };

  const handleDiscountChange = (index, value) => {
    const updated = [...selectedItems];
    // allow empty string while typing
    if (value === "") {
      updated[index].discount_percent = "";
      setSelectedItems(updated);
      return;
    }
    const num = Number(value);
    if (Number.isNaN(num)) return;
    // clamp between 0 and 100
    const clamped = num < 0 ? 0 : num > 100 ? 100 : num;
    updated[index].discount_percent = String(clamped);
    setSelectedItems(updated);
  };

  const handleSubmitReturn = async () => {
    const itemsToReturn = selectedItems.filter((item) => item.selected && item.return_qty > 0);

    if (itemsToReturn.length === 0) {
      alert("Please select at least one item to return");
      return;
    }

    const refundAmount = calculateTotal();
    // show custom confirmation modal so Enter opens modal and Enter confirms
    setConfirmItems(itemsToReturn);
    setConfirmRefundAmount(refundAmount);
    setShowConfirmReturn(true);
    setModalReturnFocus(0);
    setTimeout(() => modalReturnRef.current?.focus(), 100);
  };

  const doProcessReturn = async () => {
    setShowConfirmReturn(false);
    setLoading(true);
    setError("");
    try {
      const api = (await import("../api")).default;
      const payload = {
        sale_id: Number(saleId),
        items: confirmItems.map((item) => ({
          sale_item_id: item.sale_item_id,
          product_id: item.product_id,
          batch_id: item.batch_id,
          qty: item.return_qty,
          unit_price: item.original_unit_price,
          discount_percent: Number(item.discount_percent || 0),
        })),
        reason: reason.trim(),
      };

      const { data } = await api.post("/returns", payload);
      alert(`✓ Return processed successfully!\n\nReturn ID: ${data.return_id}\n\n💰 PLEASE RETURN TO CUSTOMER:\nRs. ${Number(data.total || 0).toFixed(2)}\n\nStock has been restored to inventory.`);

      try {
        localStorage.removeItem(RETURNS_DRAFT_KEY);
      } catch (e) {}

      // Reset form
      setSaleId("");
      setSaleData(null);
      setSelectedItems([]);
      setReason("");
      saleIdRef.current?.focus();
    } catch (err) {
      console.error("Return error:", err);
      setError(err.response?.data?.error || err.message || "Failed to process return");
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    return selectedItems
      .filter((item) => item.selected)
      .reduce((sum, item) => {
        const discountPct = Number(item.discount_percent || 0);
        const effectivePrice = item.original_unit_price * (1 - discountPct / 100);
        return sum + item.return_qty * effectivePrice;
      }, 0);
  };

  return (
    <div className="p-2 sm:p-4 lg:p-6 bg-gray-100 min-h-screen">
      <div>
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-600 to-red-800 p-6 sm:p-8 text-white">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight">🔄 SALES RETURNS</h1>
                <p className="text-red-100 text-sm mt-1">Process customer returns and refunds</p>
              </div>
              <button
                onClick={onBack}
                className="px-5 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-semibold transition text-sm sm:text-base"
              >
                ← Back
              </button>
            </div>
          </div>

          {/* Search Section */}
          <div className="p-6 bg-gray-50 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <div className="flex-1 w-full">
                <label htmlFor="invoice-search" className="block text-sm font-bold text-gray-700 mb-1">
                  Invoice / Sale ID
                </label>
                <input
                  id="invoice-search"
                  ref={saleIdRef}
                  type="text"
                  value={saleId}
                  onChange={(e) => setSaleId(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearchSale()}
                  placeholder="Enter invoice number..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-base"
                  disabled={loading}
                />
              </div>
              <div className="pt-0 sm:pt-7 w-full sm:w-auto">
                <button
                  onClick={handleSearchSale}
                  disabled={loading}
                  className="w-full sm:w-auto px-8 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Searching..." : "🔍 Search"}
                </button>
              </div>
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-50 border-l-4 border-red-600 text-red-800 rounded-md">
                <div className="flex items-center">
                  <span className="text-xl mr-3">⚠️</span>
                  <div>
                    <p className="font-bold">Error</p>
                    <p className="text-sm">{error}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sale Details */}
          {saleData && (
            <div className="p-6">
              {/* Sale Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="sm:col-span-1">
                  <div className="text-xs text-gray-500 uppercase font-bold">Sale Date</div>
                  <div className="text-lg font-semibold text-gray-800">
                    {new Date(saleData.sale.created_at).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase font-bold">Original Total</div>
                    <div className="text-lg font-semibold text-gray-800">
                      Rs. {Number(saleData.sale.total || 0).toFixed(2)}
                    </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase font-bold">Discount</div>
                  <div className="text-lg font-semibold text-red-600">
                    Rs. {Number(saleData.sale.discount || 0).toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase font-bold">Net Amount</div>
                  <div className="text-lg font-semibold text-green-600">
                    Rs. {Number(saleData.sale.net_total || 0).toFixed(2)}
                  </div>
                </div>
              </div>
              
              {Number(saleData.sale.discount || 0) > 0 && (
                <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-500 text-yellow-800 rounded-md">
                  <div className="flex items-start">
                    <span className="text-xl mr-3">ℹ️</span>
                    <div>
                      <p className="font-bold">Discount Applied</p>
                      <p className="text-sm">This sale had a discount. Refunds are calculated based on the actual price paid by the customer.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Items Table */}
              <h2 className="text-base font-bold text-gray-800 mb-4 uppercase tracking-wider">
                Select Items to Return
              </h2>
              <div className="overflow-x-auto mb-6 border border-gray-200 rounded-lg">
                <table className="w-full min-w-[1200px]">
                  <thead className="bg-gray-50">
                    <tr className="border-b-2 border-gray-300">
                      <th className="text-center py-3 px-2 font-bold text-gray-600 text-xs uppercase w-16">
                        <input
                          type="checkbox"
                          checked={selectedItems.every((item) => item.selected)}
                          onChange={(e) => {
                            const allSelected = e.target.checked;
                            setSelectedItems(
                              selectedItems.map((item) => ({ ...item, selected: allSelected }))
                            );
                          }}
                          className="w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-red-500 cursor-pointer"
                        />
                      </th>
                      <th className="text-left py-3 px-2 font-bold text-gray-600 text-xs uppercase">Product</th>
                      <th className="text-center py-3 px-2 font-bold text-gray-600 text-xs uppercase w-28">Batch No</th>
                      <th className="text-center py-3 px-2 font-bold text-gray-600 text-xs uppercase w-24">Sold</th>
                      <th className="text-center py-3 px-2 font-bold text-gray-600 text-xs uppercase w-24">Returned</th>
                      <th className="text-center py-3 px-2 font-bold text-gray-600 text-xs uppercase w-24">Remain</th>
                      <th className="text-center py-3 px-2 font-bold text-gray-600 text-xs uppercase w-28">Return Qty</th>
                      <th className="text-right py-3 px-2 font-bold text-gray-600 text-xs uppercase w-32">Unit Price</th>
                      <th className="text-center py-3 px-2 font-bold text-gray-600 text-xs uppercase w-28">Disc %</th>
                      <th className="text-right py-3 px-2 font-bold text-gray-600 text-xs uppercase w-32">Refund</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selectedItems.map((item, index) => (
                      <tr
                        key={index}
                        className={`${
                          item.selected ? "bg-red-50" : "bg-white"
                        } hover:bg-gray-50`}
                      >
                        <td className="py-3 px-2 text-center">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={() => handleToggleItem(index)}
                            className="w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-red-500 cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-2 text-gray-800 font-semibold text-sm">
                          {item.product_name}
                        </td>
                        <td className="py-3 px-2 text-center text-gray-600 text-sm">
                          {item.batch_no || "N/A"}
                        </td>
                        <td className="py-3 px-2 text-center text-gray-700 font-medium text-sm">
                          {item.sold_qty}
                        </td>
                        <td className="py-3 px-2 text-center text-gray-700 font-medium text-sm">
                          {item.returned_qty}
                        </td>
                        <td className="py-3 px-2 text-center text-gray-700 font-medium text-sm">
                          {item.remaining_qty}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <input
                            type="number"
                            min="1"
                            max={item.remaining_qty}
                            value={item.return_qty}
                            onChange={(e) => handleQtyChange(index, e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSubmitReturn()}
                            disabled={!item.selected}
                            className="w-20 px-2 py-1 text-center border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 font-semibold disabled:opacity-50 disabled:bg-gray-100"
                          />
                        </td>
                        <td className="py-3 px-2 text-right text-gray-800 font-medium text-sm">
                          Rs. {item.original_unit_price.toFixed(2)}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={item.discount_percent}
                            onChange={(e) => handleDiscountChange(index, e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSubmitReturn()}
                            disabled={!item.selected}
                            className="w-20 px-2 py-1 text-center border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 font-semibold disabled:opacity-50 disabled:bg-gray-100"
                          />
                        </td>
                        <td className="py-3 px-2 text-right text-gray-900 font-bold text-sm">
                          {item.selected
                            ? `Rs. ${(item.return_qty * item.original_unit_price * (1 - Number(item.discount_percent || 0) / 100)).toFixed(2)}`
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Confirmation Modal */}
              {showConfirmReturn && (
                  <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        e.preventDefault();
                        setShowConfirmReturn(false);
                        setTimeout(() => saleIdRef.current?.focus(), 100);
                      }
                    }}
                  >
                    <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full">
                      <div className="text-center mb-4">
                        <h2 className="text-xl font-bold text-gray-800 mb-2">Process Return?</h2>
                        <p className="text-gray-600">Items: {confirmItems.length} — Refund: Rs. {Number(confirmRefundAmount || 0).toFixed(2)}</p>
                      </div>
                      <div className="space-y-3">
                        <button
                          ref={modalReturnRef}
                          onClick={() => doProcessReturn()}
                          className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition focus:outline-none focus:ring-4 focus:ring-green-300"
                        >
                          ✓ Proceed Return
                        </button>
                        <button
                          ref={modalClearRef}
                          onClick={() => {
                            setShowConfirmReturn(false);
                            setSaleId("");
                            setSaleData(null);
                            setSelectedItems([]);
                            setReason("");
                            try { localStorage.removeItem(RETURNS_DRAFT_KEY); } catch (e) {}
                            setTimeout(() => saleIdRef.current?.focus(), 100);
                          }}
                          className="w-full px-4 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 font-semibold transition focus:outline-none focus:ring-4 focus:ring-yellow-300"
                        >
                          Clear & Start New
                        </button>
                        <button
                          ref={modalCancelRef}
                          onClick={() => { setShowConfirmReturn(false); setTimeout(() => saleIdRef.current?.focus(), 100); }}
                          className="w-full px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-semibold transition focus:outline-none focus:ring-4 focus:ring-gray-300"
                        >
                          ✕ Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

              {/* Reason & Total */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 items-start">
                <div>
                  <label htmlFor="return-reason" className="block text-sm font-bold text-gray-700 mb-1">
                    Return Reason (Optional)
                  </label>
                  <textarea
                    id="return-reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g., Damaged product, Wrong item..."
                    rows="4"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div className="w-full bg-gradient-to-r from-green-600 to-green-700 p-5 text-white rounded-lg shadow-lg">
                  <div className="text-center mb-2">
                    <div className="text-sm font-semibold uppercase tracking-wide">💰 Amount to Refund</div>
                  </div>
                  <div className="flex justify-center items-center">
                    <span className="text-4xl sm:text-5xl font-black">Rs. {calculateTotal().toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleSubmitReturn}
                  disabled={loading || selectedItems.filter((item) => item.selected).length === 0}
                  className="flex-1 px-6 py-4 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold text-lg shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Processing..." : "✓ Process Return & Refund"}
                </button>
                <button
                  onClick={() => {
                    setSaleId("");
                    setSaleData(null);
                    setSelectedItems([]);
                    setReason("");
                    setError("");
                    saleIdRef.current?.focus();
                  }}
                  className="flex-1 px-6 py-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-bold text-lg shadow-lg transition"
                >
                  🗑️ Clear & Start New
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
