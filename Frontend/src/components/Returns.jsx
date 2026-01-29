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
    <div className="min-h-screen p-6 bg-gray-100">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-600 to-red-800 px-10 py-8 text-white">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-4xl font-black tracking-tight">🔄 SALES RETURNS</h1>
                <p className="text-red-100 text-sm mt-2">Process customer returns and refunds</p>
              </div>
              <button
                onClick={onBack}
                className="px-6 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-semibold transition"
              >
                ← Back
              </button>
            </div>
          </div>

          {/* Search Section */}
          <div className="px-10 py-6 bg-gray-50 border-b-2 border-gray-200">
            <div className="flex gap-4 items-start">
              <div className="flex-1">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Invoice / Sale ID
                </label>
                <input
                  ref={saleIdRef}
                  type="text"
                  value={saleId}
                  onChange={(e) => setSaleId(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearchSale()}
                  placeholder="Enter invoice number..."
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 font-semibold text-lg"
                  disabled={loading}
                />
              </div>
              <div className="pt-7">
                <button
                  onClick={handleSearchSale}
                  disabled={loading}
                  className="px-8 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Searching..." : "🔍 Search"}
                </button>
              </div>
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-50 border-l-4 border-red-600 text-red-800 rounded">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">⚠️</span>
                  <div>
                    <p className="font-bold">Error</p>
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sale Details */}
          {saleData && (
            <div className="px-10 py-6">
              {/* Sale Info */}
              <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <div>
                  <div className="text-xs text-gray-500 uppercase font-bold">Sale Date</div>
                  <div className="text-lg font-semibold text-gray-800">
                    {new Date(saleData.sale.created_at).toLocaleDateString()}
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
              
              {/* Discount Notice */}
              {Number(saleData.sale.discount || 0) > 0 && (
                <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-600 text-yellow-800 rounded">
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">ℹ️</span>
                    <div>
                      <p className="font-bold">Discount Applied</p>
                      <p>This sale had a discount of Rs. {Number(saleData.sale.discount || 0).toFixed(2)}. Refund will be calculated based on the discounted price paid by customer.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Items Table */}
              <h2 className="text-lg font-bold text-gray-800 mb-4 uppercase tracking-wide">
                Select Items to Return
              </h2>
              <div className="overflow-x-auto mb-6">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-800">
                      <th className="text-center py-3 px-2 font-bold text-gray-800 text-sm w-16">
                        <input
                          type="checkbox"
                          checked={selectedItems.every((item) => item.selected)}
                          onChange={(e) => {
                            const allSelected = e.target.checked;
                            setSelectedItems(
                              selectedItems.map((item) => ({ ...item, selected: allSelected }))
                            );
                          }}
                          className="w-5 h-5 cursor-pointer"
                        />
                      </th>
                      <th className="text-left py-3 px-2 font-bold text-gray-800 text-sm">PRODUCT NAME</th>
                      <th className="text-center py-3 px-2 font-bold text-gray-800 text-sm w-32">BATCH NO</th>
                      <th className="text-center py-3 px-2 font-bold text-gray-800 text-sm w-32">SOLD</th>
                      <th className="text-center py-3 px-2 font-bold text-gray-800 text-sm w-32">RETURNED</th>
                      <th className="text-center py-3 px-2 font-bold text-gray-800 text-sm w-32">REMAIN</th>
                      <th className="text-center py-3 px-2 font-bold text-gray-800 text-sm w-32">RETURN QTY</th>
                      <th className="text-right py-3 px-2 font-bold text-gray-800 text-sm w-32">UNIT PRICE</th>
                      <th className="text-center py-3 px-2 font-bold text-gray-800 text-sm w-28">DISCOUNT %</th>
                      <th className="text-right py-3 px-2 font-bold text-gray-800 text-sm w-32">REFUND</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedItems.map((item, index) => (
                      <tr
                        key={index}
                        className={`border-b border-gray-200 ${
                          item.selected ? "bg-red-50" : "bg-white"
                        }`}
                      >
                        <td className="py-4 px-2 text-center">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={() => handleToggleItem(index)}
                            className="w-5 h-5 cursor-pointer"
                          />
                        </td>
                        <td className="py-4 px-2 text-gray-800 font-semibold">
                          {item.product_name}
                        </td>
                        <td className="py-4 px-2 text-center text-gray-600">
                          {item.batch_no || "N/A"}
                        </td>
                        <td className="py-4 px-2 text-center text-gray-700 font-medium">
                          {item.sold_qty}
                        </td>
                        <td className="py-4 px-2 text-center text-gray-700 font-medium">
                          {item.returned_qty}
                        </td>
                        <td className="py-4 px-2 text-center text-gray-700 font-medium">
                          {item.remaining_qty}
                        </td>
                        <td className="py-4 px-2 text-center">
                          <input
                            type="number"
                            min="1"
                            max={item.remaining_qty}
                            value={item.return_qty}
                            onChange={(e) => handleQtyChange(index, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSubmitReturn();
                              }
                            }}
                            disabled={!item.selected}
                            className="w-20 px-3 py-2 text-center border-2 border-red-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 font-semibold disabled:opacity-50 disabled:bg-gray-100"
                          />
                        </td>
                        <td className="py-4 px-2 text-right text-gray-800 font-medium">
                          Rs. {item.original_unit_price.toFixed(2)}
                        </td>
                        <td className="py-4 px-2 text-center">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={item.discount_percent}
                            onChange={(e) => handleDiscountChange(index, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSubmitReturn();
                              }
                            }}
                            disabled={!item.selected}
                            className="w-20 px-2 py-2 text-center border-2 border-orange-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-600 font-semibold disabled:opacity-50 disabled:bg-gray-100"
                          />
                        </td>
                        <td className="py-4 px-2 text-right text-gray-900 font-bold">
                          {item.selected
                            ? `Rs. ${(item.return_qty * item.original_unit_price * (1 - Number(item.discount_percent || 0) / 100)).toFixed(2)}`
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

                {/* Confirmation Modal for Returns */}
                {showConfirmReturn && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        e.preventDefault();
                        setShowConfirmReturn(false);
                        setTimeout(() => saleIdRef.current?.focus(), 100);
                      } else if (e.key === 'ArrowDown' || e.key === 'Tab') {
                        e.preventDefault();
                        const next = modalReturnFocus < 2 ? modalReturnFocus + 1 : 0;
                        setModalReturnFocus(next);
                        const refs = [modalReturnRef, modalClearRef, modalCancelRef];
                        refs[next]?.current?.focus();
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        const prev = modalReturnFocus > 0 ? modalReturnFocus - 1 : 2;
                        setModalReturnFocus(prev);
                        const refs = [modalReturnRef, modalClearRef, modalCancelRef];
                        refs[prev]?.current?.focus();
                      }
                    }}
                  >
                    <div className="bg-white rounded shadow-lg p-6 max-w-sm w-full mx-4">
                      <div className="text-center mb-4">
                        <h2 className="text-xl font-bold text-gray-800 mb-2">Process Return?</h2>
                        <p className="text-gray-600 text-sm">Items: {confirmItems.length} — Refund: Rs. {Number(confirmRefundAmount || 0).toFixed(2)}</p>
                      </div>
                      <div className="space-y-2">
                        <button
                          ref={modalReturnRef}
                          onClick={() => doProcessReturn()}
                          onFocus={() => setModalReturnFocus(0)}
                          onKeyDown={(e) => e.key === 'Enter' && doProcessReturn()}
                          className={`w-full px-4 py-3 bg-green-600 text-white rounded hover:bg-green-700 font-semibold transition ${modalReturnFocus === 0 ? 'ring-4 ring-green-300' : ''}`}
                        >
                          ✓ Proceed Return (Enter)
                        </button>

                        <button
                          ref={modalClearRef}
                          onClick={() => {
                            // clear and start new
                            setShowConfirmReturn(false);
                            setSaleId("");
                            setSaleData(null);
                            setSelectedItems([]);
                            setReason("");
                            try { localStorage.removeItem(RETURNS_DRAFT_KEY); } catch (e) {}
                            setTimeout(() => saleIdRef.current?.focus(), 100);
                          }}
                          onFocus={() => setModalReturnFocus(1)}
                          onKeyDown={(e) => e.key === 'Enter' && (setShowConfirmReturn(false), setSaleId(""), setSaleData(null), setSelectedItems([]), setReason(""))}
                          className={`w-full px-4 py-3 bg-yellow-600 text-white rounded hover:bg-yellow-700 font-semibold transition ${modalReturnFocus === 1 ? 'ring-4 ring-yellow-300' : ''}`}
                        >
                          Clear & Start New
                        </button>

                        <button
                          ref={modalCancelRef}
                          onClick={() => { setShowConfirmReturn(false); setTimeout(() => saleIdRef.current?.focus(), 100); }}
                          onFocus={() => setModalReturnFocus(2)}
                          onKeyDown={(e) => e.key === 'Enter' && (setShowConfirmReturn(false), setTimeout(() => saleIdRef.current?.focus(), 100))}
                          className={`w-full px-4 py-3 bg-gray-600 text-white rounded hover:bg-gray-700 font-semibold transition ${modalReturnFocus === 2 ? 'ring-4 ring-gray-300' : ''}`}
                        >
                          ✕ Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

              {/* Reason */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Return Reason (Optional)
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g., Damaged product, Wrong item, Customer changed mind..."
                  rows="3"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              {/* Total Refund */}
              <div className="flex justify-end mb-6">
                <div className="w-96 bg-gradient-to-r from-green-600 to-green-700 px-6 py-5 text-white rounded-lg shadow-lg border-2 border-green-800">
                  <div className="text-center mb-2">
                    <div className="text-sm font-semibold uppercase tracking-wide">💰 Amount to Return to Customer</div>
                  </div>
                  <div className="flex justify-center items-center">
                    <span className="text-5xl font-black">Rs. {calculateTotal().toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
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
