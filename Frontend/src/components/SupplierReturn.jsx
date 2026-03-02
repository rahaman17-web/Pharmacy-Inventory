import { useEffect, useState } from "react";
import api from "../api";

const REASONS = ["Short Expire", "Expired", "Availability", "Damaged"];

const toLocalMidnight = (d) => {
  const x = new Date(d);
  return new Date(x.getFullYear(), x.getMonth(), x.getDate());
};

function ExpiryBadge({ expiry }) {
  if (!expiry) return <span className="text-gray-400 text-xs">No expiry</span>;
  const today = toLocalMidnight(new Date());
  const exp = toLocalMidnight(expiry);
  const diffMs = exp - today;
  const diffMonths = diffMs / (1000 * 60 * 60 * 24 * 30.44);
  const fmt = exp.toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  if (diffMs < 0)
    return (
      <span
        style={{
          background: "#dc2626",
          color: "#fff",
          fontSize: 10,
          fontWeight: 900,
          padding: "2px 7px",
          borderRadius: 4,
        }}
      >
        EXPIRED {fmt}
      </span>
    );
  if (diffMonths <= 1)
    return (
      <span
        style={{
          background: "#ef4444",
          color: "#fff",
          fontSize: 10,
          fontWeight: 900,
          padding: "2px 7px",
          borderRadius: 4,
        }}
      >
        {Math.ceil(diffMs / 86400000)}d left {fmt}
      </span>
    );
  if (diffMonths <= 3)
    return (
      <span
        style={{
          background: "#f97316",
          color: "#fff",
          fontSize: 10,
          fontWeight: 700,
          padding: "2px 7px",
          borderRadius: 4,
        }}
      >
        {Math.floor(diffMonths)}m left {fmt}
      </span>
    );
  return (
    <span
      style={{
        background: "#eab308",
        color: "#fff",
        fontSize: 10,
        fontWeight: 700,
        padding: "2px 7px",
        borderRadius: 4,
      }}
    >
      {Math.floor(diffMonths)}m left {fmt}
    </span>
  );
}

export default function SupplierReturn({ onBack }) {
  const [tab, setTab] = useState("new");

  // All returnable items (across all suppliers)
  const [allItems, setAllItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [search, setSearch] = useState("");
  const [filterSupplier, setFilterSupplier] = useState("");

  // Selection: { batchId: { qty, reason, unit_cost, supplier_id, supplier_name, ...item } }
  const [selected, setSelected] = useState({});
  const [returnDate, setReturnDate] = useState(
    new Date().toISOString().slice(0, 10),
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successList, setSuccessList] = useState([]);

  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (tab === "new") loadAll();
  }, [tab]);

  useEffect(() => {
    if (tab === "history") {
      api
        .get("/supplier-returns")
        .then((r) => setHistory(r.data || []))
        .catch(() => {});
    }
  }, [tab]);

  const loadAll = () => {
    setLoadingItems(true);
    api
      .get("/supplier-returns/all-returnable")
      .then((r) => setAllItems(r.data || []))
      .catch(() => setError("Failed to load returnable items."))
      .finally(() => setLoadingItems(false));
  };

  // All unique suppliers that appear in the list
  const supplierOptions = [
    ...new Map(allItems.map((i) => [i.supplier_id, i.supplier_name])).entries(),
  ]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const filteredItems = allItems.filter((item) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      item.product_name?.toLowerCase().includes(q) ||
      item.batch_no?.toLowerCase().includes(q) ||
      item.supplier_name?.toLowerCase().includes(q) ||
      item.formula?.toLowerCase().includes(q);
    const matchSupplier =
      !filterSupplier || String(item.supplier_id) === String(filterSupplier);
    return matchSearch && matchSupplier;
  });

  const toggleItem = (item) => {
    const key = String(item.batch_id);
    setSelected((prev) => {
      if (prev[key]) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const exp = item.expiry ? new Date(item.expiry) : null;
      let autoReason = "Short Expire";
      if (item.is_testing) autoReason = "Availability";
      else if (exp && exp < today) autoReason = "Expired";
      else if (!item.expiry) autoReason = "Damaged";
      return {
        ...prev,
        [key]: {
          ...item,
          qty: Number(item.qty) || 1,
          reason: autoReason,
          unit_cost: Number(item.cost) || 0,
        },
      };
    });
  };

  const updateSelected = (key, field, value) =>
    setSelected((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));

  const selectedItems = Object.values(selected);

  // Group selected items by supplier
  const bySupplier = selectedItems.reduce((acc, item) => {
    const sid = String(item.supplier_id);
    if (!acc[sid])
      acc[sid] = {
        supplier_id: item.supplier_id,
        supplier_name: item.supplier_name,
        items: [],
      };
    acc[sid].items.push(item);
    return acc;
  }, {});

  const totalAmount = selectedItems.reduce(
    (s, it) => s + Number(it.qty) * Number(it.unit_cost),
    0,
  );

  const handleSubmit = async () => {
    setError("");
    if (selectedItems.length === 0)
      return setError("Select at least one item to return.");
    for (const it of selectedItems) {
      if (!it.qty || Number(it.qty) <= 0)
        return setError(`Enter valid qty for ${it.product_name}`);
      if (Number(it.qty) > Number(it.qty_available ?? it.qty))
        return setError(`Return qty exceeds stock for ${it.product_name}`);
      if (!it.reason) return setError(`Select reason for ${it.product_name}`);
    }
    setSubmitting(true);
    const results = [];
    try {
      for (const grp of Object.values(bySupplier)) {
        const reasons = [...new Set(grp.items.map((i) => i.reason))].join(", ");
        const { data } = await api.post("/supplier-returns", {
          supplier_id: grp.supplier_id,
          reason: reasons,
          return_date: returnDate,
          items: grp.items.map((it) => ({
            product_id: it.product_id,
            batch_id: it.batch_id,
            qty: Number(it.qty),
            unit_cost: Number(it.unit_cost),
            reason: it.reason,
          })),
        });
        results.push({
          id: data.id,
          supplier: grp.supplier_name,
          total: data.total_amount,
        });
      }
      setSuccessList(results);
      setSelected({});
      loadAll();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save return.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 bg-gray-100 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-500 to-orange-500 rounded-xl p-6 text-white mb-5 shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-extrabold">Return to Supplier</h1>
            <p className="text-red-100 text-sm mt-1">
              Browse short-expire, expired and testing items — supplier shown on
              every row. Select items to return and confirm.
            </p>
          </div>
          <button
            onClick={onBack}
            className="bg-white/20 hover:bg-white/30 text-white font-bold px-4 py-2 rounded-lg text-sm transition"
          >
            Back
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {[
          ["new", "+ New Return", "#ef4444"],
          ["history", "Return History", "#6366f1"],
        ].map(([key, label, col]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              background: tab === key ? col : "#fff",
              color: tab === key ? "#fff" : "#374151",
              border: `2px solid ${tab === key ? col : "#d1d5db"}`,
              borderRadius: 8,
              padding: "6px 20px",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "new" && (
        <div className="space-y-4">
          {successList.length > 0 && (
            <div
              style={{
                background: "#dcfce7",
                border: "2px solid #16a34a",
                borderRadius: 10,
                padding: "14px 20px",
              }}
            >
              {successList.map((s, i) => (
                <p key={i} className="font-bold text-green-800">
                  Return #{s.id} saved — Rs. {Number(s.total).toFixed(2)}{" "}
                  deducted from {s.supplier}
                </p>
              ))}
              <button
                onClick={() => setSuccessList([])}
                className="text-green-700 underline text-sm mt-1"
              >
                Dismiss
              </button>
            </div>
          )}
          {error && (
            <div
              style={{
                background: "#fee2e2",
                border: "2px solid #dc2626",
                borderRadius: 10,
                padding: "12px 18px",
              }}
            >
              <p className="font-bold text-red-700">{error}</p>
            </div>
          )}

          {/* Controls row */}
          <div className="bg-white rounded-xl shadow p-4 flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                Search product / batch / supplier
              </label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="e.g. Panadol, ABC Pharma, batch 101..."
                className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-orange-400 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                Filter by supplier
              </label>
              <select
                value={filterSupplier}
                onChange={(e) => setFilterSupplier(e.target.value)}
                className="border-2 border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold focus:border-orange-400 outline-none"
              >
                <option value="">All Suppliers</option>
                {supplierOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                Return date
              </label>
              <input
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                className="border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-orange-400 outline-none"
              />
            </div>
          </div>

          {/* Items table */}
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3">
              <span className="font-black text-gray-700">Returnable Items</span>
              <span className="text-xs text-gray-400 ml-1">
                Short-expire, expired &amp; testing — with supplier shown
              </span>
              {selectedItems.length > 0 && (
                <span
                  style={{
                    marginLeft: "auto",
                    background: "#ef4444",
                    color: "#fff",
                    borderRadius: 7,
                    padding: "2px 12px",
                    fontWeight: 800,
                    fontSize: 12,
                  }}
                >
                  {selectedItems.length} selected
                </span>
              )}
            </div>

            {loadingItems ? (
              <div className="py-16 text-center text-gray-400">
                Loading returnable items...
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="py-16 text-center">
                <div style={{ fontSize: 44 }}>📭</div>
                <p className="mt-3 font-bold text-gray-500">
                  {allItems.length === 0
                    ? "No returnable items found in stock."
                    : "No items match your search."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-3 py-3 w-10"></th>
                      <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                        Product
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                        Supplier
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                        Invoice
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                        Batch / Expiry
                      </th>
                      <th className="px-3 py-3 text-right text-xs font-bold text-gray-500 uppercase">
                        Qty
                      </th>
                      <th className="px-3 py-3 text-right text-xs font-bold text-gray-500 uppercase">
                        Cost
                      </th>
                      <th className="px-3 py-3 text-center text-xs font-bold text-gray-500 uppercase">
                        Reason
                      </th>
                      <th className="px-3 py-3 text-right text-xs font-bold text-gray-500 uppercase">
                        Return Qty
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredItems.map((item) => {
                      const key = String(item.batch_id);
                      const sel = selected[key];
                      const isChecked = !!sel;
                      return (
                        <tr
                          key={key}
                          style={{
                            background: isChecked ? "#fff7ed" : undefined,
                          }}
                          className="hover:bg-orange-50 transition-colors"
                        >
                          <td className="px-3 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleItem(item)}
                              className="w-4 h-4 accent-red-500 cursor-pointer"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <div className="font-semibold text-gray-800">
                              {item.product_name}
                            </div>
                            {item.formula && (
                              <div className="text-xs text-gray-400">
                                {item.formula}
                              </div>
                            )}
                            {item.is_testing && (
                              <span
                                style={{
                                  background: "#f97316",
                                  color: "#fff",
                                  fontSize: 10,
                                  fontWeight: 900,
                                  padding: "1px 6px",
                                  borderRadius: 3,
                                }}
                              >
                                TEST
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <span
                              style={{
                                background: "#ede9fe",
                                color: "#5b21b6",
                                fontSize: 11,
                                fontWeight: 700,
                                padding: "2px 8px",
                                borderRadius: 4,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {item.supplier_name}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            {item.purchase_invoice ? (
                              <span
                                style={{
                                  background: "#dbeafe",
                                  color: "#1e40af",
                                  fontSize: 11,
                                  fontWeight: 700,
                                  padding: "2px 7px",
                                  borderRadius: 4,
                                }}
                              >
                                #{item.purchase_invoice}
                              </span>
                            ) : (
                              <span className="text-gray-300 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            {item.batch_no && (
                              <div className="text-xs font-semibold text-blue-700 mb-1">
                                {item.batch_no}
                              </div>
                            )}
                            <ExpiryBadge expiry={item.expiry} />
                          </td>
                          <td className="px-3 py-3 text-right font-bold text-gray-700">
                            {item.qty}
                          </td>
                          <td className="px-3 py-3 text-right text-gray-600">
                            {isChecked ? (
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={sel.unit_cost}
                                onChange={(e) =>
                                  updateSelected(
                                    key,
                                    "unit_cost",
                                    e.target.value,
                                  )
                                }
                                className="w-20 border-2 border-gray-200 rounded px-2 py-1 text-right text-sm font-bold focus:border-orange-400 outline-none"
                              />
                            ) : (
                              `Rs.${Number(item.cost).toFixed(2)}`
                            )}
                          </td>
                          <td className="px-3 py-3 text-center">
                            {isChecked ? (
                              <select
                                value={sel.reason}
                                onChange={(e) =>
                                  updateSelected(key, "reason", e.target.value)
                                }
                                className="border-2 border-gray-200 rounded px-2 py-1 text-xs font-semibold focus:border-orange-400 outline-none"
                              >
                                {REASONS.map((r) => (
                                  <option key={r} value={r}>
                                    {r}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-gray-300 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-right">
                            {isChecked ? (
                              <input
                                type="number"
                                min="1"
                                max={item.qty}
                                value={sel.qty}
                                onChange={(e) =>
                                  updateSelected(key, "qty", e.target.value)
                                }
                                className="w-14 border-2 border-gray-200 rounded px-2 py-1 text-center text-sm font-bold focus:border-orange-400 outline-none"
                              />
                            ) : (
                              <span className="text-gray-300 text-xs">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Confirm summary */}
          {selectedItems.length > 0 && (
            <div className="bg-white rounded-xl shadow p-5">
              <h3 className="font-black text-gray-700 mb-4 text-base">
                Confirm Return Summary
              </h3>
              {Object.values(bySupplier).map((grp) => {
                const grpTotal = grp.items.reduce(
                  (s, it) => s + Number(it.qty) * Number(it.unit_cost),
                  0,
                );
                return (
                  <div key={grp.supplier_id} className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        style={{
                          background: "#ede9fe",
                          color: "#5b21b6",
                          fontWeight: 800,
                          fontSize: 13,
                          padding: "3px 12px",
                          borderRadius: 6,
                        }}
                      >
                        {grp.supplier_name}
                      </span>
                      <span className="text-xs text-gray-400">
                        {grp.items.length} item(s)
                      </span>
                    </div>
                    <table className="w-full text-sm border border-orange-100 rounded-lg overflow-hidden mb-1">
                      <thead>
                        <tr className="bg-orange-50">
                          <th className="px-3 py-2 text-left text-xs font-bold text-orange-700">
                            Product
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-bold text-orange-700">
                            Reason
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-bold text-orange-700">
                            Qty
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-bold text-orange-700">
                            Unit Cost
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-bold text-orange-700">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-orange-50">
                        {grp.items.map((it) => (
                          <tr key={it.batch_id}>
                            <td className="px-3 py-2 font-semibold text-gray-800">
                              {it.product_name}
                            </td>
                            <td className="px-3 py-2">
                              <span
                                style={{
                                  background: "#fef3c7",
                                  color: "#92400e",
                                  borderRadius: 4,
                                  padding: "1px 7px",
                                  fontSize: 11,
                                  fontWeight: 700,
                                }}
                              >
                                {it.reason}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right">{it.qty}</td>
                            <td className="px-3 py-2 text-right">
                              Rs.{Number(it.unit_cost).toFixed(2)}
                            </td>
                            <td className="px-3 py-2 text-right font-bold">
                              Rs.
                              {(Number(it.qty) * Number(it.unit_cost)).toFixed(
                                2,
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: "#fef3c7" }}>
                          <td
                            colSpan={4}
                            className="px-3 py-2 text-right font-black text-orange-800 text-xs"
                          >
                            Deducted from {grp.supplier_name}:
                          </td>
                          <td className="px-3 py-2 text-right font-black text-orange-800">
                            Rs.{grpTotal.toFixed(2)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                );
              })}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                <span className="font-black text-gray-700">
                  Grand Total: Rs.{totalAmount.toFixed(2)} across{" "}
                  {Object.keys(bySupplier).length} supplier(s)
                </span>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  style={{
                    background: submitting ? "#d1d5db" : "#dc2626",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    padding: "11px 28px",
                    fontWeight: 900,
                    fontSize: 14,
                    cursor: submitting ? "default" : "pointer",
                  }}
                >
                  {submitting ? "Saving..." : `Confirm Return`}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "history" && (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {history.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <div style={{ fontSize: 48 }}>📭</div>
              <p className="mt-3 font-semibold">No supplier returns yet.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                    Supplier
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">
                    Reason
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">
                    Amount Deducted
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {history.map((h) => (
                  <tr key={h.id} className="hover:bg-red-50">
                    <td className="px-4 py-3 text-gray-400 font-mono">
                      {h.id}
                    </td>
                    <td className="px-4 py-3">
                      {new Date(h.return_date).toLocaleDateString("en-PK", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-800">
                      {h.supplier_name}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {h.reason || "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-red-600">
                      Rs.{Number(h.total_amount).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
