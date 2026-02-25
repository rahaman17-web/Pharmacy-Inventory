import { Routes, Route, useNavigate } from "react-router-dom";
import { useState } from "react";
import { SunIcon, MoonIcon, Squares2X2Icon, Bars3Icon } from '@heroicons/react/24/outline';
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
import Sidebar from "./Sidebar.jsx";

// ─── Card (used in Grid view only) ─────────────────────────────────────────
const COLORS = {
  green:  ['bg-green-50',  'border-green-200',  'text-green-800',  'text-green-500'],
  blue:   ['bg-blue-50',   'border-blue-200',   'text-blue-800',   'text-blue-500'],
  yellow: ['bg-yellow-50', 'border-yellow-200', 'text-yellow-800', 'text-yellow-500'],
  red:    ['bg-red-50',    'border-red-200',    'text-red-800',    'text-red-500'],
  indigo: ['bg-indigo-50', 'border-indigo-200', 'text-indigo-800', 'text-indigo-500'],
  orange: ['bg-orange-50', 'border-orange-200', 'text-orange-800', 'text-orange-500'],
  purple: ['bg-purple-50', 'border-purple-200', 'text-purple-800', 'text-purple-500'],
};

const Card = ({ to, icon, title, description, color }) => {
  const navigate = useNavigate();
  const [bg, border, text, accent] = COLORS[color];
  return (
    <button
      onClick={() => navigate(to)}
      className={`group text-left p-6 ${bg} rounded-xl border ${border} hover:shadow-md hover:border-transparent transition-all duration-200 transform hover:-translate-y-1`}
    >
      <div className="flex items-start justify-between">
        <div className={`p-3 rounded-lg bg-white shadow-sm ${accent}`}>{icon}</div>
        <span className={`text-xl font-bold ${accent} opacity-0 group-hover:opacity-100 transition-opacity`}>→</span>
      </div>
      <h3 className={`text-base font-bold ${text} mt-4`}>{title}</h3>
      <p className="text-sm text-gray-500 mt-1">{description}</p>
    </button>
  );
};

// ─── Sidebar home: full module cards with role filtering ───────────────────
const SidebarWelcome = ({ user }) => {
  const navigate = useNavigate();
  const isAdminOrManager = user.role === 'admin' || user.role === 'manager';
  const isAdmin = user.role === 'admin';

  const cards = [
    { to: '/sale',        color: 'green',  title: 'Sale Invoice',      description: 'Process sales and generate receipts',    icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
    { to: '/purchase',    color: 'blue',   title: 'Purchase Stock',     description: 'Add new inventory from suppliers',        icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg> },
    { to: '/stock',       color: 'yellow', title: 'Stock Report',       description: 'View inventory and expiry dates',         icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
    { to: '/returns',     color: 'red',    title: 'Returns & Refunds',  description: 'Process customer returns',                icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" /></svg> },
    { to: '/reprint',     color: 'indigo', title: 'Reprint Invoice',    description: 'Find and reprint old invoices',           icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg> },
    { to: '/user-sales',  color: 'blue',   title: 'My Sales History',   description: 'View your personal sales history',        icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
    ...(isAdminOrManager ? [
      { to: '/expenses',      color: 'orange', title: 'Expenses',         description: 'Track pharmacy expenses',               icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-10V6m0 12v-2m9-4a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
      { to: '/sales-report',  color: 'purple', title: 'Sales Report',     description: 'View detailed sales reports',           icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /></svg> },
    ] : []),
    ...(isAdmin ? [
      { to: '/admin/users',   color: 'red',    title: 'User Management',  description: 'Manage accounts and roles',             icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
      { to: '/admin/audit',   color: 'indigo', title: 'Audit Logs',       description: 'Track all system activities',           icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg> },
    ] : []),
  ];

  return (
    <div className="p-6 sm:p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">
          Welcome, {user.username || 'User'} 👋
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Select a module to get started</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {cards.map(({ to, color, title, description, icon }) => (
          <Card key={to} to={to} color={color} title={title} description={description} icon={icon} />
        ))}
      </div>
    </div>
  );
};

// ─── Grid home: full cards (shown when sidebar is hidden) ───────────────────
const GridHome = ({ user }) => (
  <div className="p-6 sm:p-8">
    <div className="mb-8">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">Dashboard</h2>
      <p className="text-gray-500 dark:text-gray-400">Select a module to get started</p>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      <Card to="/sale"        color="green"  title="Sale Invoice"      description="Process sales and generate receipts"  icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>} />
      <Card to="/purchase"    color="blue"   title="Purchase Stock"    description="Add new inventory from suppliers"     icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} />
      <Card to="/stock"       color="yellow" title="Stock Report"      description="View inventory and expiry dates"      icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>} />
      <Card to="/returns"     color="red"    title="Returns & Refunds" description="Process customer returns"             icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" /></svg>} />
      <Card to="/reprint"     color="indigo" title="Reprint Invoice"   description="Find and reprint old invoices"        icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>} />
      <Card to="/user-sales"  color="blue"   title="My Sales History"  description="View your personal sales history"     icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
      {(user.role === 'admin' || user.role === 'manager') && <>
        <Card to="/expenses"      color="orange" title="Expenses"       description="Track pharmacy expenses"             icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-10V6m0 12v-2m9-4a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
        <Card to="/sales-report"  color="purple" title="Sales Report"   description="View detailed sales reports"         icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /></svg>} />
      </>}
      {user.role === 'admin' && <>
        <Card to="/admin/users"  color="red"    title="User Management" description="Manage accounts and roles"           icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} />
        <Card to="/admin/audit"  color="indigo" title="Audit Logs"      description="Track all system activities"        icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>} />
      </>}
    </div>
  </div>
);

// ─── Back-arrow page wrapper ────────────────────────────────────────────────
// ─── Shared route list ──────────────────────────────────────────────────────
const AppRoutes = ({ user, homeElement }) => {
  const navigate = useNavigate();
  const goHome = () => navigate('/');
  return (
    <Routes>
      <Route path="/"             element={homeElement} />
      <Route path="/sale"         element={<SaleInvoice user={user} onBack={goHome} />} />
      <Route path="/purchase"     element={<Purchase user={user} onBack={goHome} />} />
      <Route path="/stock"        element={<StockReport onBack={goHome} />} />
      <Route path="/returns"      element={<Returns user={user} onBack={goHome} />} />
      <Route path="/reprint"      element={<ReprintInvoice onBack={goHome} />} />
      <Route path="/expenses"     element={<Expenses user={user} onBack={goHome} />} />
      <Route path="/sales-report" element={<SalesReport onBack={goHome} />} />
      <Route path="/user-sales"   element={<UserSalesHistory user={user} onBack={goHome} />} />
      <Route path="/user-sales/:userId" element={<UserSalesHistory user={user} onBack={goHome} />} />
      <Route path="/admin/users"  element={<AdminUsers onBack={goHome} />} />
      <Route path="/admin/audit"  element={<AdminAudit onBack={goHome} />} />
    </Routes>
  );
};

// ─── Main Dashboard ─────────────────────────────────────────────────────────
export default function Dashboard({ user, onLogout }) {
  const [isDark,      setIsDark]      = useState(document.documentElement.classList.contains('dark'));
  const [viewMode,    setViewMode]    = useState(localStorage.getItem('viewMode') || 'sidebar');
  const [sidebarOpen, setSidebarOpen] = useState(true); // collapse/expand sidebar (desktop)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false); // mobile sidebar overlay

  const toggleDark = () => {
    setIsDark(d => !d);
    document.documentElement.classList.toggle('dark');
  };

  const switchView = (mode) => {
    setViewMode(mode);
    localStorage.setItem('viewMode', mode);
    if (mode === 'sidebar') setSidebarOpen(true);
  };

  // ── GRID / CARD VIEW (no sidebar) ─────────────────────────────────────
  if (viewMode === 'grid') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="w-full px-4 sm:px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <div>
                <p className="text-xl font-extrabold text-gray-800 dark:text-white leading-none">Zam Zam Pharmacy</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Welcome, {user.username || 'User'}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <button onClick={() => switchView('sidebar')} title="Switch to Sidebar"
                className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <Bars3Icon className="w-5 h-5" /> <span className="hidden sm:inline">Sidebar</span>
              </button>
              <button onClick={toggleDark} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                {isDark ? <SunIcon className="w-5 h-5 text-yellow-400" /> : <MoonIcon className="w-5 h-5 text-gray-600" />}
              </button>
              <button onClick={onLogout} className="px-3 sm:px-4 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors">
                Logout
              </button>
            </div>
          </div>
        </header>
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <AppRoutes user={user} homeElement={<GridHome user={user} />} />
        </div>
      </div>
    );
  }

  // ── SIDEBAR VIEW ────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">

      {/* Mobile sidebar overlay backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile sidebar (overlay, always expanded) */}
      <div className={`fixed inset-y-0 left-0 z-50 lg:hidden transform transition-transform duration-300 ease-in-out ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar
          user={user}
          onLogout={onLogout}
          collapsed={false}
          onToggle={() => setMobileMenuOpen(false)}
        />
      </div>

      {/* Desktop sidebar (static, collapsible) */}
      <div className="hidden lg:block flex-shrink-0">
        <Sidebar
          user={user}
          onLogout={onLogout}
          collapsed={!sidebarOpen}
          onToggle={() => setSidebarOpen(o => !o)}
        />
      </div>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden w-0">
        {/* Top bar */}
        <header className="flex-shrink-0 h-20 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Bars3Icon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Switch to card/grid view */}
            <button onClick={() => switchView('grid')} title="Switch to Card view"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <Squares2X2Icon className="w-5 h-5" /> Cards
            </button>
            <button onClick={toggleDark} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              {isDark ? <SunIcon className="w-5 h-5 text-yellow-400" /> : <MoonIcon className="w-5 h-5 text-gray-600" />}
            </button>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <AppRoutes user={user} homeElement={<SidebarWelcome user={user} />} />
        </div>
      </main>
    </div>
  );
}

