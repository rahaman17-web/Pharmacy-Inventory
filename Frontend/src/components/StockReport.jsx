import { useEffect, useState } from "react";
import api from "../api";

const ALL_CATEGORIES = [
  "Tablet","Syrup","Capsule","Drop","Cream","Face Wash",
  "Injection","Lotion","Milk","Ointment","General","Surgical",
];

export default function StockReport({ onBack }) {
  const [rows, setRows]               = useState([]);
  const [loading, setLoading]         = useState(false);
  const [searchTerm, setSearchTerm]   = useState("");
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

  const fmtExpiry = (expiry) => {
    if (!expiry) return "—";
    const x = new Date(expiry);
    const d = new Date(x.getFullYear(), x.getMonth(), x.getDate());
    return d.toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" });
  };

  const filtered = rows.filter(r => {
    const q = searchTerm.toLowerCase();
    const matchSearch = !q ||
      (r.product_name  || "").toLowerCase().includes(q) ||
      (r.formula       || "").toLowerCase().includes(q) ||
      (r.batch_no      || "").toLowerCase().includes(q) ||
      (r.category      || "").toLowerCase().includes(q) ||
      (r.supplier_name || "").toLowerCase().includes(q);
    const matchCat = !categoryFilter ||
      (r.category || "").trim().toLowerCase() === categoryFilter.toLowerCase();
    return matchSearch && matchCat;
  });

  const totalQty    = filtered.reduce((s, r) => s + (Number(r.qty) || 0), 0);
  const totalCost   = filtered.reduce((s, r) => { const c = Number(r.cost); return s + (c > 0 ? (Number(r.qty)||0)*c : 0); }, 0);
  const totalSale   = filtered.reduce((s, r) => s + (Number(r.qty)||0)*(Number(r.selling_price)||0), 0);
  const totalProfit = totalSale - totalCost;

  const TH = { padding: "8px 10px", border: "1px solid #555", background: "#1e293b", color: "#fff", fontWeight: 700, fontSize: 12, whiteSpace: "nowrap", textAlign: "center" };
  const TD = (align = "left") => ({ padding: "6px 10px", border: "1px solid #ccc", fontSize: 13, textAlign: align, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" });
  const FT = (align = "right") => ({ padding: "7px 10px", border: "1px solid #555", background: "#1e293b", color: "#fff", fontWeight: 800, fontSize: 13, textAlign: align });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#fff", fontFamily: "'Segoe UI', Tahoma, sans-serif" }}>

      {/* Header */}
      <div style={{ background: "#1e293b", color: "#fff", padding: "10px 20px", display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", borderRadius: 5, padding: "5px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>← Back</button>
        <span style={{ fontWeight: 900, fontSize: 20, letterSpacing: 1 }}>📦 STOCK REPORT</span>
        <span style={{ fontSize: 12, opacity: 0.6 }}>Total: {rows.length} items</span>
      </div>

      {/* Filters */}
      <div style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0", padding: "8px 16px", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", flexShrink: 0 }}>
        <input
          type="text"
          placeholder="Search name, batch, supplier, formula, category..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ flex: 1, minWidth: 220, border: "1px solid #cbd5e1", borderRadius: 5, padding: "6px 12px", fontSize: 13 }}
        />
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          style={{ border: "1px solid #cbd5e1", borderRadius: 5, padding: "6px 10px", fontSize: 13, minWidth: 160 }}
        >
          <option value="">All Categories</option>
          {ALL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {(categoryFilter || searchTerm) && (
          <button onClick={() => { setCategoryFilter(""); setSearchTerm(""); }}
            style={{ border: "none", background: "#ef4444", color: "#fff", borderRadius: 5, padding: "6px 12px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            ✕ Clear
          </button>
        )}
        <span style={{ fontWeight: 700, fontSize: 13, color: "#475569" }}>{filtered.length} item{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Table area */}
      <div style={{ flex: 1, overflow: "auto", padding: "12px 16px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>Loading stock data…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>No items found.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: "4%"  }} />
              <col style={{ width: "20%" }} />
              <col style={{ width: "9%"  }} />
              <col style={{ width: "11%" }} />
              <col style={{ width: "8%"  }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "5%"  }} />
              <col style={{ width: "8%"  }} />
              <col style={{ width: "8%"  }} />
              <col style={{ width: "9%"  }} />
              <col style={{ width: "8%"  }} />
            </colgroup>
            <thead>
              <tr>
                <th style={TH}>#</th>
                <th style={{...TH, textAlign:"left"}}>PRODUCT NAME</th>
                <th style={TH}>CATEGORY</th>
                <th style={{...TH, textAlign:"left"}}>SUPPLIER</th>
                <th style={TH}>BATCH</th>
                <th style={TH}>EXPIRY</th>
                <th style={TH}>QTY</th>
                <th style={TH}>P.PRICE</th>
                <th style={TH}>S.PRICE</th>
                <th style={TH}>STOCK VALUE</th>
                <th style={TH}>PROFIT</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, idx) => {
                const qty     = Number(r.qty) || 0;
                const cost    = Number(r.cost) || 0;
                const selling = Number(r.selling_price) || 0;
                const stockVal = cost > 0 ? qty * cost : null;
                const profit   = cost > 0 ? qty * (selling - cost) : null;
                const rowBg    = idx % 2 === 0 ? "#ffffff" : "#f8fafc";
                return (
                  <tr key={`${r.product_id}-${r.batch_id}-${idx}`} style={{ background: rowBg }}>
                    <td style={TD("center")}>{idx + 1}</td>
                    <td style={{ ...TD("left"), maxWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis" }}>{r.product_name}</div>
                      {r.formula && <div style={{ fontSize: 11, color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis" }}>{r.formula}</div>}
                    </td>
                    <td style={TD("center")}>{r.category || "—"}</td>
                    <td style={{ ...TD("left"), maxWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{r.supplier_name || "—"}</td>
                    <td style={TD("center")}>{r.batch_no || "—"}</td>
                    <td style={TD("center")}>{fmtExpiry(r.expiry)}</td>
                    <td style={{ ...TD("right"), fontWeight: 700 }}>{qty}</td>
                    <td style={TD("right")}>{cost > 0 ? cost.toFixed(2) : "—"}</td>
                    <td style={TD("right")}>{selling > 0 ? selling.toFixed(2) : "—"}</td>
                    <td style={{ ...TD("right"), fontWeight: 600 }}>{stockVal !== null ? stockVal.toFixed(0) : "—"}</td>
                    <td style={{ ...TD("right"), fontWeight: 600 }}>{profit !== null ? profit.toFixed(0) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={6} style={FT("right")}>TOTALS</td>
                <td style={FT("right")}>{totalQty}</td>
                <td colSpan={2} style={{ border: "1px solid #555", background: "#1e293b" }} />
                <td style={FT("right")}>{totalCost.toFixed(0)}</td>
                <td style={FT("right")}>{totalProfit.toFixed(0)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
