import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import SaleInvoice from "./SaleInvoice.jsx";
import Purchase from "./Purchase.jsx";
import AdminAudit from "./AdminAudit.jsx";
import StockReport from "./StockReport.jsx";
import Returns from "./Returns.jsx";
import SalesReport from "./SalesReport.jsx";
import UserSalesHistory from "./UserSalesHistory.jsx";
import Expenses from "./Expenses.jsx";
import ReprintInvoice from "./ReprintInvoice.jsx";
import AdminUsers from "./AdminUsers.jsx";
import ProductsManagement from "./ProductsManagement.jsx";
import SupplierReturn from "./SupplierReturn.jsx";

/* card data */
const CARDS = [
  { to: "/sale",            title: "Sale Invoice",       desc: "Process sales and generate receipts",  icon: "\uD83D\uDED2" },
  { to: "/purchase",        title: "Purchase Stock",     desc: "Add new inventory from suppliers",     icon: "\uD83D\uDCE6" },
  { to: "/stock",           title: "Stock Report",       desc: "View inventory and expiry dates",      icon: "\uD83D\uDCCA" },
  { to: "/returns",         title: "Returns & Refunds",  desc: "Process customer returns",             icon: "\u21A9\uFE0F" },
  { to: "/supplier-return", title: "Return to Supplier", desc: "Return expired items to company",      icon: "\uD83D\uDD19" },
  { to: "/reprint",         title: "Reprint Invoice",    desc: "Find and reprint old invoices",        icon: "\uD83D\uDDA8\uFE0F" },
  { to: "/user-sales",      title: "User Sales Report",  desc: "View your personal sales history",     icon: "\uD83D\uDCDC" },
];
const MGMT = [
  { to: "/expenses",      title: "Expenses",     desc: "Track pharmacy expenses",       icon: "\uD83D\uDCB0" },
  { to: "/sales-report",  title: "Sales Report", desc: "View detailed sales reports",   icon: "\uD83D\uDCC8" },
  { to: "/products",      title: "Products",     desc: "Add, edit or remove products",  icon: "\uD83D\uDCCB" },
];
const ADMIN = [
  { to: "/admin/users", title: "User Management", desc: "Manage accounts and roles",  icon: "\uD83D\uDC65" },
  { to: "/admin/audit", title: "Audit Logs",      desc: "Track all system activities", icon: "\uD83D\uDEE1\uFE0F" },
];

/* ── Home card grid ──────────────────────────────────────────────── */
function Home({ user, onLogout }) {
  const navigate = useNavigate();
  const isAM = user.role === "admin" || user.role === "manager";
  const isA  = user.role === "admin";
  const cards = [...CARDS, ...(isAM ? MGMT : []), ...(isA ? ADMIN : [])];

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", fontFamily: "'Segoe UI',Tahoma,sans-serif" }}>
      {/* top bar */}
      <div style={{ background: "#1e293b", color: "#fff", padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: 0.5 }}>Zam Zam Pharmacy</span>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 13, color: "#94a3b8" }}>{user.username || "User"} &middot; {user.role}</span>
          <button onClick={onLogout}
            style={{ background: "#dc2626", color: "#fff", border: "none", borderRadius: 6, padding: "6px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
            Logout
          </button>
        </div>
      </div>
      {/* cards */}
      <div style={{ padding: "30px 24px", maxWidth: 1100, margin: "0 auto" }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "#1e293b", margin: "0 0 4px" }}>Welcome, {user.username || "User"}</h2>
        <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 24px" }}>Select a module to get started</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 16 }}>
          {cards.map(c => (
            <button key={c.to} onClick={() => navigate(c.to)}
              style={{ textAlign: "left", padding: 20, background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", cursor: "pointer", display: "flex", flexDirection: "column", gap: 8, transition: "box-shadow .2s,transform .15s" }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,.10)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none"; }}>
              <span style={{ fontSize: 28 }}>{c.icon}</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#1e293b" }}>{c.title}</span>
              <span style={{ fontSize: 13, color: "#64748b" }}>{c.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Routes ──────────────────────────────────────────────────────── */
function AppRoutes({ user, onLogout }) {
  const navigate = useNavigate();
  const goHome = () => navigate("/");
  return (
    <Routes>
      <Route path="/" element={<Home user={user} onLogout={onLogout} />} />
      <Route path="/sale" element={<SaleInvoice user={user} onBack={goHome} />} />
      <Route path="/purchase" element={<Purchase user={user} onBack={goHome} />} />
      <Route path="/stock" element={<StockReport onBack={goHome} />} />
      <Route path="/returns" element={<Returns user={user} onBack={goHome} />} />
      <Route path="/supplier-return" element={<SupplierReturn user={user} onBack={goHome} />} />
      <Route path="/reprint" element={<ReprintInvoice onBack={goHome} />} />
      <Route path="/expenses" element={<Expenses user={user} onBack={goHome} />} />
      <Route path="/sales-report" element={(user.role === "admin" || user.role === "manager") ? <SalesReport onBack={goHome} /> : <Navigate to="/" replace />} />
      <Route path="/user-sales" element={<UserSalesHistory user={user} onBack={goHome} />} />
      <Route path="/user-sales/:userId" element={<UserSalesHistory user={user} onBack={goHome} />} />
      <Route path="/products" element={(user.role === "admin" || user.role === "manager") ? <ProductsManagement user={user} onBack={goHome} /> : <Navigate to="/" replace />} />
      <Route path="/admin/users" element={<AdminUsers onBack={goHome} />} />
      <Route path="/admin/audit" element={<AdminAudit onBack={goHome} />} />
    </Routes>
  );
}

/* ── Main Dashboard ──────────────────────────────────────────────── */
export default function Dashboard({ user, onLogout }) {
  useEffect(() => { document.documentElement.classList.remove("dark"); }, []);
  return <AppRoutes user={user} onLogout={onLogout} />;
}
