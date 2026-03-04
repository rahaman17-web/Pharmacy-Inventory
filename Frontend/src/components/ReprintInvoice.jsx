import { useState } from "react";
import Receipt from "./Receipt.jsx";

export default function ReprintInvoice({ onBack }) {
  const [invoiceNo, setInvoiceNo] = useState("");
  const [saleId, setSaleId] = useState(null);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!invoiceNo.trim()) {
      setError("Please enter an invoice number");
      setNotFound(false);
      return;
    }

    setLoading(true);
    setError("");
    setNotFound(false);
    setSaleId(null);

    try {
      const api = (await import("../api")).default;
      const { data } = await api.get(`/sales/${invoiceNo}`);
      
      if (!data || !data.sale) {
        setNotFound(true);
        return;
      }

      setSaleId(data.sale.id);
    } catch (err) {
      if (err.response?.status === 404) {
        setNotFound(true);
      } else {
        console.error("Search error:", err);
        setError(err.response?.data?.error || "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSaleId(null);
    setInvoiceNo("");
    setError("");
    setNotFound(false);
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 bg-gray-100">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl overflow-hidden">
          {/* Header */}
          <div style={{ background: "#1e293b", color: "#fff", padding: "12px 20px", display: "flex", alignItems: "center", gap: 14 }}>
            <button onClick={onBack} style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", borderRadius: 6, padding: "6px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>← Back</button>
            <span style={{ fontSize: 18, fontWeight: 800 }}>REPRINT INVOICE</span>
          </div>

          {/* Search Section */}
          <div className="px-4 sm:px-10 py-6 sm:py-8">
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Invoice Number
              </label>
              <div className="flex flex-col sm:flex-row gap-4">
                <input
                  type="text"
                  value={invoiceNo}
                  onChange={(e) => setInvoiceNo(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Enter invoice number (e.g., 15)"
                  className="flex-1 px-4 py-3 border-2 border-indigo-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 font-semibold text-lg"
                  disabled={loading}
                  autoFocus
                />
                <button
                  onClick={handleSearch}
                  disabled={loading}
                  className="px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Searching..." : "🔍 Search"}
                </button>
              </div>
            </div>

            {notFound && (
              <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 rounded">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">🔍</span>
                  <div>
                    <p className="font-bold">No Record Found</p>
                    <p>Invoice <strong>#{invoiceNo}</strong> does not exist in the system.</p>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 border-l-4 border-red-600 text-red-800 rounded">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">⚠️</span>
                  <div>
                    <p className="font-bold">Error</p>
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="mt-8 p-6 bg-blue-50 border-2 border-blue-200 rounded-lg">
              <h3 className="text-lg font-bold text-gray-800 mb-3">📋 How to Use</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start">
                  <span className="text-blue-600 font-bold mr-2">1.</span>
                  <span>Enter the invoice number (shown on the original receipt)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 font-bold mr-2">2.</span>
                  <span>Click Search or press Enter</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 font-bold mr-2">3.</span>
                  <span>The invoice will appear - you can print a duplicate copy</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Receipt Modal */}
      {saleId && (
        <Receipt
          saleId={saleId}
          autoPrint={false}
          onClose={handleClose}
        />
      )}
    </div>
  );
}
