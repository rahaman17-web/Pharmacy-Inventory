import { useState, useRef, useEffect } from "react";
import AutoComplete from "./Autocomplete.jsx";
import Receipt from "./Receipt.jsx";

const SALE_DRAFT_KEY = "sale_invoice_draft";

export default function SaleInvoice({ onBack }) {
  const [items, setItems] = useState([{ product_id: null, item: "", qty: 1, price: 0, pack_price: 0, pack_size: 1, available_stock: 0 }]);
  const [discount, setDiscount] = useState("");
  const [lastSaleId, setLastSaleId] = useState(null);
  const [receiptAutoPrint, setReceiptAutoPrint] = useState(false);
  const [invoiceNo, setInvoiceNo] = useState("");
  const [availableMedicines, setAvailableMedicines] = useState([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [stockData, setStockData] = useState({});

  const hasHydratedDraftRef = useRef(false);

  const itemRefs = useRef([]);
  const qtyRefs = useRef([]);
  const priceRefs = useRef([]);
  const discountRef = useRef(null);
  const completeSaleRef = useRef(null);
  const clearFormRef = useRef(null);
  const backRef = useRef(null);
  const modalSaveRef = useRef(null);
  const modalPrintRef = useRef(null);
  const modalCancelRef = useRef(null);
  
  const [focusedButton, setFocusedButton] = useState(null); // 0=complete, 1=clear, 2=back
  const [modalFocus, setModalFocus] = useState(0); // 0=save, 1=print, 2=cancel

  // Restore unsaved draft on refresh/back
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SALE_DRAFT_KEY);
      if (!raw) {
        hasHydratedDraftRef.current = true;
        return;
      }
      const draft = JSON.parse(raw);
      if (draft && Array.isArray(draft.items) && draft.items.length) {
        setItems(draft.items);
      }
      if (draft && typeof draft.discount === "string") {
        setDiscount(draft.discount);
      }
    } catch (e) {
      // ignore draft errors
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
          SALE_DRAFT_KEY,
          JSON.stringify({
            items,
            discount,
          })
        );
      } catch (e) {}
    }, 500);
    return () => clearTimeout(t);
  }, [items, discount]);

  const addRowIfReady = (index, rows) => {
    const list = rows || items;
    const row = list[index];
    const complete = row && row.product_id && Number(row.qty) > 0 && Number(row.price) > 0;
    if (complete && index === list.length - 1) {
      addRow();
    }
  };

  function updateItem(index, field, value) {
    const updated = [...items];
    if (field === "product") {
      const prod = value || {};
      if (
        prod.id &&
        items.some((it, idx) => idx !== index && it.product_id === prod.id)
      ) {
        alert("This item is already in the list. If you need a different price, create a new product name/tag for that variant.");
        // Clear the duplicate selection
        updated[index].product_id = null;
        updated[index].item = "";
        updated[index].price = 0;
        updated[index].pack_price = 0;
        updated[index].pack_size = 1;
        updated[index].available_stock = 0;
        setItems(updated);
        // Refocus the autocomplete field
        setTimeout(() => itemRefs.current[index]?.focus(), 100);
        return;
      }
      
      // Check stock availability
      const availableStock = stockData[prod.id] || 0;
      if (prod.id && availableStock <= 0) {
        alert(`⚠️ ${prod.name} is OUT OF STOCK! Available quantity: 0\n\nPlease select a different item or restock this product first.`);
        return;
      }
      
      updated[index].product_id = prod.id || null;
      updated[index].item = prod.name || (typeof value === "string" ? value : updated[index].item);
      updated[index].available_stock = availableStock;
      // Treat product selling_price as PER-UNIT selling price (works for tablets + surgical items)
      const unitPrice = Number(prod.selling_price ?? prod.mrp ?? 0) || 0;
      const packSize = Number(prod.pack_size) || 1;
      updated[index].pack_price = unitPrice;
      updated[index].pack_size = packSize;
      updated[index].price = Math.round(unitPrice * 100) / 100;
      addRowIfReady(index, updated);
    } else if (field === "qty") {
      const row = updated[index];
      const requestedQty = Number(value);
      
      // Check if quantity exceeds available stock
      if (row.product_id && requestedQty > row.available_stock) {
        alert(`⚠️ Insufficient stock for ${row.item}!\n\nRequested: ${requestedQty}\nAvailable: ${row.available_stock}\n\nPlease enter a quantity less than or equal to ${row.available_stock}.`);
        return;
      }
      
      updated[index][field] = value;
      addRowIfReady(index, updated);
    } else {
      updated[index][field] = value;
      if (field === "price") {
        addRowIfReady(index, updated);
      }
    }
    setItems(updated);
  }

  function addRow() {
    setItems([...items, { product_id: null, item: "", qty: 1, price: 0, pack_price: 0, pack_size: 1, available_stock: 0 }]);
  }

  // Remove a row by index (keeps medicine items behavior intact)
  function removeRow(index) {
    setItems(items.filter((_, i) => i !== index));
  }

  useEffect(() => {
    const loadMedicines = async () => {
      try {
        const api = (await import("../api")).default;
        // Next sequential invoice number (sale.id)
        try {
          const r = await api.get("/sales/next-invoice");
          setInvoiceNo(r.data?.invoice_no || "1");
        } catch (e) {
          setInvoiceNo("1");
        }

        const { data } = await api.get("/products");
        setAvailableMedicines(data || []);
        
        // Load stock data
        const { data: stockBatches } = await api.get("/stock");
        const stockMap = {};
        stockBatches.forEach(batch => {
          if (!stockMap[batch.product_id]) {
            stockMap[batch.product_id] = 0;
          }
          stockMap[batch.product_id] += batch.qty;
        });
        setStockData(stockMap);
      } catch (err) {
        console.error("Failed to load medicines:", err);
      }
    };
    loadMedicines();
  }, []);

  const refreshInvoiceNo = async () => {
    try {
      const api = (await import("../api")).default;
      const r = await api.get("/sales/next-invoice");
      setInvoiceNo(r.data?.invoice_no || "1");
    } catch (e) {
      // keep current
    }
  };

  useEffect(() => {
    if (items.length > 1) itemRefs.current[items.length - 1]?.focus();
  }, [items.length]);

  const handleKeyDownGlobal = (e) => {
    if (e.key === "F3") {
      e.preventDefault();
      discountRef.current?.focus();
      discountRef.current?.select();
    } else if (e.key === "F4") {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "F6") {
      e.preventDefault();
      setItems([{ product_id: null, item: "", qty: 1, price: 0, pack_price: 0, pack_size: 1, available_stock: 0 }]);
      setDiscount("");
      try {
        localStorage.removeItem(SALE_DRAFT_KEY);
      } catch (e) {}
      setTimeout(() => itemRefs.current[0]?.focus(), 0);
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDownGlobal);
    return () => window.removeEventListener("keydown", handleKeyDownGlobal);
  }, [items, discount, availableMedicines]);

  // Auto-focus first item input on mount
  useEffect(() => {
    itemRefs.current[0]?.focus();
  }, []);

  const totalAmount = items.reduce((sum, row) => sum + Number(row.qty) * Number(row.price || 0), 0);

  // Discount limit (cap) based on role and GST presence. Users may choose any percent up to this cap.
  const storedUser = (() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch (e) { return null; }
  })();
  const role = storedUser?.role || 'user';
  const hasGstItemsForDisplay = items.some(item => {
    if (!item.product_id) return false;
    const product = availableMedicines.find(p => p.id === item.product_id);
    return product && product.gst_percentage > 0;
  });
  const capPercent = role === 'admin' ? (hasGstItemsForDisplay ? 7 : 12) : (hasGstItemsForDisplay ? 5 : 10);
  const currentDiscountPercent = Number(discount || 0);
  const discountAmount = Number(((totalAmount * currentDiscountPercent) / 100).toFixed(2));
  const netTotal = Number((totalAmount - discountAmount).toFixed(2));

  // If the cap changes (items added/removed or role changed), clamp current discount to cap
  useEffect(() => {
    try {
      const num = Number(discount || 0);
      if (num > capPercent) {
        setDiscount(String(capPercent));
      }
    } catch (e) {}
  }, [capPercent]);

  const handleSubmit = async () => {
    const discountPercent = Number(discount || 0);
    
    // Check if any item has GST
    const hasGstItems = items.some(item => {
      if (!item.product_id) return false;
      const product = availableMedicines.find(p => p.id === item.product_id);
      return product && product.gst_percentage > 0;
    });
    
    // Validate discount percentage against cap
    const maxDiscount = role === 'admin' ? (hasGstItems ? 7 : 12) : (hasGstItems ? 5 : 10);
    if (discountPercent > maxDiscount) {
      alert(`❌ Maximum discount allowed is ${maxDiscount}%${hasGstItems ? ' (GST items detected)' : ''}\n\nPlease reduce the discount to ${maxDiscount}% or less.`);
      return;
    }

    const payload = {
      items: items
        .filter((it) => it.product_id && it.qty > 0)
        .map((it) => ({ product_id: it.product_id, qty: Number(it.qty), unit_price: Number(it.price) })),
      discountPercent: discountPercent,
    };

    if (payload.items.length === 0) {
      alert("Please add at least one item");
      return;
    }

    // Show confirmation modal
    setShowConfirmation(true);
    setModalFocus(0);
    setTimeout(() => modalSaveRef.current?.focus(), 100);
  };

  const saveSale = async (shouldPrint) => {
    if (isSaving) return;
    setIsSaving(true);

    // Important: if user chose "Save Only", ensure receipt modal is never shown.
    if (shouldPrint !== true) {
      setReceiptAutoPrint(false);
      setLastSaleId(null);
    }

    try {
      const payload = {
        items: items
          .filter((it) => it.product_id && it.qty > 0)
          .map((it) => ({ product_id: it.product_id, qty: Number(it.qty), unit_price: Number(it.price) })),
        discountPercent: Number(discount || 0),
      };

      const api = (await import("../api")).default;
      const { data } = await api.post("/sales", payload);
      alert("Sale recorded successfully!");

      try {
        localStorage.removeItem(SALE_DRAFT_KEY);
      } catch (e) {}

      if (shouldPrint === true) {
        setReceiptAutoPrint(true);
        setLastSaleId(data.sale_id);
      } else {
        setReceiptAutoPrint(false);
        setLastSaleId(null);
      }
      setItems([{ product_id: null, item: "", qty: 1, price: 0, pack_price: 0, pack_size: 1, available_stock: 0 }]);
      setDiscount("");
      setShowConfirmation(false);
      refreshInvoiceNo();
      
      // Refresh stock data after sale
      try {
        const apiModule = (await import("../api")).default;
        const { data: stockBatches } = await apiModule.get("/stock");
        const stockMap = {};
        stockBatches.forEach(batch => {
          if (!stockMap[batch.product_id]) {
            stockMap[batch.product_id] = 0;
          }
          stockMap[batch.product_id] += batch.qty;
        });
        setStockData(stockMap);
      } catch (err) {
        console.error("Failed to refresh stock data:", err);
      }
      
      // Printing is handled by the Receipt modal when user chose Print.
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || err.message || "Sale failed");
      setShowConfirmation(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen p-4 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        {/* Simple Invoice Form */}
        <div className="bg-white rounded shadow-md overflow-hidden border border-gray-300">
          {/* Simple Header */}
          <div className="bg-gray-800 px-6 py-4 text-white">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold">Zam Zam Pharmacy</h1>
                <p className="text-sm text-gray-300 mt-1">Near Bacha Khan Medical Complex Shamansoor</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-xs text-gray-400 uppercase">Invoice</div>
                  <div className="text-xl font-bold">#{invoiceNo || "-"}</div>
                  <div className="text-xs text-gray-400 mt-1">{new Date().toLocaleDateString()}</div>
                </div>
                <button
                  ref={backRef}
                  onClick={onBack}
                  onFocus={() => setFocusedButton(2)}
                  onBlur={() => setFocusedButton(null)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      onBack();
                    } else if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      completeSaleRef.current?.focus();
                    }
                  }}
                  className={`px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-semibold transition ${focusedButton === 2 ? 'ring-4 ring-gray-400' : ''}`}
                >
                  ← Back
                </button>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="p-6">
            <div className="mb-6">
              <div className="overflow-x-auto border-2 border-gray-300">
                <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 text-left py-2 px-3 font-semibold text-gray-700 text-sm">#</th>
                      <th className="border border-gray-300 text-left py-2 px-3 font-semibold text-gray-700 text-sm">Item Description</th>
                      <th className="border border-gray-300 text-center py-2 px-3 font-semibold text-gray-700 text-sm">Pack Size</th>
                      <th className="border border-gray-300 text-center py-2 px-3 font-semibold text-gray-700 text-sm">Stock</th>
                      <th className="border border-gray-300 text-center py-2 px-3 font-semibold text-gray-700 text-sm">Qty</th>
                      <th className="border border-gray-300 text-right py-2 px-3 font-semibold text-gray-700 text-sm">Unit Price (Rs)</th>
                      <th className="border border-gray-300 text-right py-2 px-3 font-semibold text-gray-700 text-sm">Total (Rs)</th>
                      <th className="border border-gray-300 text-center py-2 px-3 font-semibold text-gray-700 text-sm">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((row, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="border border-gray-300 py-2 px-3 text-gray-700">{i + 1}</td>
                        <td className="border border-gray-300 py-2 px-3">
                          <AutoComplete
                            value={{ id: row.product_id, name: row.item }}
                            ref={(el) => (itemRefs.current[i] = el)}
                            onSelect={(val) => updateItem(i, "product", val)}
                            onEnter={() => qtyRefs.current[i]?.focus()}
                            allItems={availableMedicines}
                            allowCreate={false}
                            fullScreenList
                            placeholder="Search item..."
                          />
                        </td>
                        <td className="border border-gray-300 py-2 px-3 text-center text-gray-600">{row.pack_size}</td>
                        <td className="border border-gray-300 py-2 px-3 text-center">
                          {row.product_id ? (
                            <span className={`font-semibold ${row.available_stock === 0 ? 'text-red-600' : row.available_stock < 10 ? 'text-orange-600' : 'text-green-600'}`}>
                              {row.available_stock}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="border border-gray-300 py-2 px-3 text-center">
                          <input
                            ref={(el) => (qtyRefs.current[i] = el)}
                            type="number"
                            min={1}
                            className="w-20 px-2 py-1 text-center border border-gray-400 rounded focus:outline-none focus:border-gray-600"
                            value={row.qty}
                            onChange={(e) => updateItem(i, "qty", e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                // Only move/add row if both item and qty are filled
                                if (row.product_id && row.qty > 0) {
                                  if (i + 1 < items.length) {
                                    itemRefs.current[i + 1]?.focus();
                                  } else {
                                    addRow();
                                    setTimeout(() => itemRefs.current[items.length]?.focus(), 50);
                                  }
                                }
                              }
                            }}
                            placeholder="0"
                          />
                        </td>
                        <td className="border border-gray-300 py-2 px-3 text-right text-gray-700">{Number(row.price).toFixed(2)}</td>
                        <td className="border border-gray-300 py-2 px-3 text-right text-gray-900 font-semibold">
                          {row.product_id && Number(row.qty) > 0 ? (Number(row.qty) * Number(row.price)).toFixed(2) : '—'}
                        </td>
                        <td className="border border-gray-300 py-2 px-3 text-center">
                          {items.length > 1 && (
                            <button
                              onClick={() => removeRow(i)}
                              className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                              title="Remove item"
                            >
                              ✕
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summary Section */}
            <div className="border-2 border-gray-300 mt-4">
              <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                <tbody>
                  {/* Subtotal */}
                  <tr className="bg-gray-50">
                    <td className="border border-gray-300 py-2 px-4 text-left font-semibold text-gray-700">Subtotal</td>
                    <td className="border border-gray-300 py-2 px-4 text-right font-semibold text-gray-900">Rs. {totalAmount.toFixed(2)}</td>
                  </tr>

                  {/* Discount */}
                  <tr className="bg-white">
                    <td className="border border-gray-300 py-2 px-4 text-left">
                      <div className="flex items-center gap-2">
                        <label className="font-semibold text-gray-700">Discount (%)</label>
                        <span className="text-xs bg-blue-100 text-white-1000 px-2 py-0.5 rounded font-mono">F3</span>
                        <input
                          ref={discountRef}
                          type="number"
                          min={0}
                          max={capPercent}
                          step="0.1"
                          value={discount}
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (raw === '') {
                              setDiscount('');
                              return;
                            }
                            const num = Number(raw);
                            if (Number.isNaN(num)) return;
                            if (num > capPercent) {
                              alert(`Maximum allowed discount is ${capPercent}%. It has been set to ${capPercent}%.`);
                              setDiscount(String(capPercent));
                              return;
                            }
                            if (num < 0) {
                              setDiscount('0');
                              return;
                            }
                            setDiscount(String(num));
                          }}
                          className="w-20 px-2 py-1 border border-gray-400 rounded text-center focus:outline-none"
                        />
                        
                      </div>
                    </td>
                    <td className="border border-gray-300 py-2 px-4 text-right font-semibold text-red-600">- Rs. {discountAmount.toFixed(2)}</td>
                  </tr>

                  {/* Net Total */}
                  <tr className="bg-gray-800 text-white">
                    <td className="border border-gray-300 py-3 px-4 text-left font-bold text-lg">NET TOTAL</td>
                    <td className="border border-gray-300 py-3 px-4 text-right font-bold text-2xl">Rs. {netTotal.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 px-6 py-4 bg-gray-50 border-t border-gray-300">
            <button
              ref={completeSaleRef}
              onClick={handleSubmit}
              onFocus={() => setFocusedButton(0)}
              onBlur={() => setFocusedButton(null)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSubmit();
                } else if (e.key === 'ArrowRight') {
                  e.preventDefault();
                  clearFormRef.current?.focus();
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  backRef.current?.focus();
                }
              }}
              className={`px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-semibold transition ${focusedButton === 0 ? 'ring-4 ring-green-300' : ''}`}
            >
              ✓ Complete Sale <span className="text-xs opacity-80">(F4)</span>
            </button>
            <button
              ref={clearFormRef}
              onClick={() => {
                setItems([{ product_id: null, item: "", qty: 1, price: 0, pack_price: 0, pack_size: 1, available_stock: 0 }]);
                setDiscount("");
                try {
                  localStorage.removeItem(SALE_DRAFT_KEY);
                } catch (e) {}
              }}
              onFocus={() => setFocusedButton(1)}
              onBlur={() => setFocusedButton(null)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  setItems([{ product_id: null, item: "", qty: 1, price: 0, pack_price: 0, pack_size: 1, available_stock: 0 }]);
                  setDiscount("");
                  try {
                    localStorage.removeItem(SALE_DRAFT_KEY);
                  } catch (e) {}
                  itemRefs.current[0]?.focus();
                } else if (e.key === 'ArrowLeft') {
                  e.preventDefault();
                  completeSaleRef.current?.focus();
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  backRef.current?.focus();
                }
              }}
              className={`px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-semibold transition ${focusedButton === 1 ? 'ring-4 ring-red-300' : ''}`}
            >
              Clear Form <span className="text-xs opacity-80">(F6)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              setShowConfirmation(false);
              const lastFilledIndex = items.findIndex(item => item.product_id) >= 0 
                ? items.map((item, idx) => item.product_id ? idx : -1).filter(idx => idx >= 0).pop()
                : 0;
              setTimeout(() => itemRefs.current[lastFilledIndex !== undefined ? lastFilledIndex : 0]?.focus(), 100);
            } else if (e.key === 'ArrowDown' || e.key === 'Tab') {
              e.preventDefault();
              const newFocus = modalFocus < 2 ? modalFocus + 1 : 0;
              setModalFocus(newFocus);
              const refs = [modalSaveRef, modalPrintRef, modalCancelRef];
              refs[newFocus]?.current?.focus();
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              const newFocus = modalFocus > 0 ? modalFocus - 1 : 2;
              setModalFocus(newFocus);
              const refs = [modalSaveRef, modalPrintRef, modalCancelRef];
              refs[newFocus]?.current?.focus();
            }
          }}
        >
          <div className="bg-white rounded shadow-lg p-6 max-w-sm w-full mx-4">
            <div className="text-center mb-4">
              <h2 className="text-xl font-bold text-gray-800 mb-2">Save Invoice?</h2>
              <p className="text-gray-600 text-sm">Choose how you want to proceed (↑↓ Tab Enter Esc)</p>
            </div>
            
            <div className="space-y-2">
              <button
                ref={modalSaveRef}
                type="button"
                onClick={() => saveSale(false)}
                onFocus={() => setModalFocus(0)}
                onKeyDown={(e) => e.key === 'Enter' && saveSale(false)}
                disabled={isSaving}
                className={`w-full px-4 py-3 bg-green-600 text-white rounded hover:bg-green-700 font-semibold transition ${modalFocus === 0 ? 'ring-4 ring-green-300' : ''}`}
              >
                ✓ Save Only
              </button>
              
              <button
                ref={modalPrintRef}
                type="button"
                onClick={() => saveSale(true)}
                onFocus={() => setModalFocus(1)}
                onKeyDown={(e) => e.key === 'Enter' && saveSale(true)}
                disabled={isSaving}
                className={`w-full px-4 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold transition ${modalFocus === 1 ? 'ring-4 ring-blue-300' : ''}`}
              >
                🖨️ Print Invoice
              </button>
              
              <button
                ref={modalCancelRef}
                type="button"
                onClick={() => {
                  setShowConfirmation(false);
                  // Focus on the last filled item
                  const lastFilledIndex = items.findIndex(item => item.product_id) >= 0 
                    ? items.map((item, idx) => item.product_id ? idx : -1).filter(idx => idx >= 0).pop()
                    : 0;
                  setTimeout(() => itemRefs.current[lastFilledIndex !== undefined ? lastFilledIndex : 0]?.focus(), 100);
                }}
                onFocus={() => setModalFocus(2)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    setShowConfirmation(false);
                    const lastFilledIndex = items.findIndex(item => item.product_id) >= 0 
                      ? items.map((item, idx) => item.product_id ? idx : -1).filter(idx => idx >= 0).pop()
                      : 0;
                    setTimeout(() => itemRefs.current[lastFilledIndex !== undefined ? lastFilledIndex : 0]?.focus(), 100);
                  }
                }}
                disabled={isSaving}
                className={`w-full px-4 py-3 bg-gray-600 text-white rounded hover:bg-gray-700 font-semibold transition ${modalFocus === 2 ? 'ring-4 ring-gray-300' : ''}`}
              >
                ✕ Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {lastSaleId && (
        <Receipt
          saleId={lastSaleId}
          autoPrint={receiptAutoPrint}
          onClose={() => {
            setLastSaleId(null);
            setReceiptAutoPrint(false);
          }}
        />
      )}
    </div>
  );
}
