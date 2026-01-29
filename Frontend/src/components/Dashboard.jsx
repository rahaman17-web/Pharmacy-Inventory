import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import api from "../api.js";
import SaleInvoice from "./SaleInvoice.jsx";
import Purchase from "./Purchase.jsx";
import AdminAudit from "./AdminAudit.jsx";
import StockReport from "./StockReport.jsx";
import UserSaleReport from "./UserSaleReport.jsx";
import Returns from "./Returns.jsx";
import SalesReport from "./SalesReport.jsx";
import UserSalesHistory from "./UserSalesHistory.jsx";
import Expenses from "./Expenses.jsx";
import ReprintInvoice from "./ReprintInvoice.jsx";
import AdminUsers from "./AdminUsers.jsx";

export default function Dashboard({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isDark, setIsDark] = useState(false);
  
  const isHomePage = location.pathname === '/' || location.pathname === '';

  const toggleDark = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  const DashboardHome = () => (
          <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 shadow-md border-b border-gray-200 dark:border-gray-700">
              <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Zam Zam Pharmacy</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Welcome, {user.id}</p>
                  </div>
                </div>
                <div className="flex items-center space-4">
                  <button
                    onClick={toggleDark}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
                  >
                    {isDark ? 'Light' : 'Dark'} Mode
                  </button>
                  <button
                    onClick={onLogout}
                    className="px-6 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-6 py-8">
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Dashboard</h2>
                <p className="text-gray-600 dark:text-gray-400">Select an option to get started</p>
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Sale Invoice Card */}
                <button
                  onClick={() => navigate('/sale')}
                  className="group relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden transform hover:-translate-y-2 border border-gray-200 dark:border-gray-700"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-400 to-green-600 opacity-10 rounded-full -mr-16 -mt-16"></div>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-gradient-to-br from-green-400 to-green-600 rounded-xl group-hover:scale-110 transition-transform">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-green-600">→</div>
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Sale Invoice</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">Process sales and generate receipts</p>
                  </div>
                </button>

                {/* Purchase Stock Card */}
                <button
                  onClick={() => navigate('/purchase')}
                  className="group relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden transform hover:-translate-y-2 border border-gray-200 dark:border-gray-700"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400 to-blue-600 opacity-10 rounded-full -mr-16 -mt-16"></div>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl group-hover:scale-110 transition-transform">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-blue-600">→</div>
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Purchase Stock</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">Add new inventory from suppliers</p>
                  </div>
                </button>

                {/* Stock Report Card */}
                <button
                  onClick={() => navigate('/stock')}
                  className="group relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden transform hover:-translate-y-2 border border-gray-200 dark:border-gray-700"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-yellow-400 to-orange-500 opacity-10 rounded-full -mr-16 -mt-16"></div>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl group-hover:scale-110 transition-transform">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-orange-600">→</div>
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Stock Report</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">View inventory and expiry dates</p>
                  </div>
                </button>

                {/* Returns Card */}
                <button
                  onClick={() => navigate('/returns')}
                  className="group relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden transform hover:-translate-y-2 border border-gray-200 dark:border-gray-700"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-400 to-red-600 opacity-10 rounded-full -mr-16 -mt-16"></div>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-gradient-to-br from-red-400 to-red-600 rounded-xl group-hover:scale-110 transition-transform">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
                        </svg>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-red-600">→</div>
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Returns & Refunds</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">Process customer returns</p>
                  </div>
                </button>

                {/* Reprint Invoice Card */}
                <button
                  onClick={() => navigate('/reprint')}
                  className="group relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden transform hover:-translate-y-2 border border-gray-200 dark:border-gray-700"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-400 to-indigo-600 opacity-10 rounded-full -mr-16 -mt-16"></div>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-xl group-hover:scale-110 transition-transform">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-indigo-600">→</div>
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Reprint Invoice</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">Find and reprint old invoices</p>
                  </div>
                </button>

                    {/* Expenses Card (Admin/Manager) */}
                {(user.role === "admin" || user.role === "manager") && (
                  <button
                    onClick={() => navigate('/expenses')}
                    className="group relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden transform hover:-translate-y-2 border border-gray-200 dark:border-gray-700"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-400 to-amber-600 opacity-10 rounded-full -mr-16 -mt-16"></div>
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-gradient-to-br from-orange-400 to-amber-600 rounded-xl group-hover:scale-110 transition-transform">
                          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-10V6m0 12v-2m9-4a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold text-amber-600">→</div>
                        </div>
                      </div>
                      <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Expenses</h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">Add expenses for net profit</p>
                    </div>
                  </button>
                )}



                {/* User Sales Card (Admin/Manager) */}
                {(user.role === "admin" || user.role === "manager") && (
                  <button
                    onClick={() => navigate('/user-sales')}
                    className="group relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden transform hover:-translate-y-2 border border-gray-200 dark:border-gray-700"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-400 to-purple-600 opacity-10 rounded-full -mr-16 -mt-16"></div>
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl group-hover:scale-110 transition-transform">
                          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold text-purple-600">→</div>
                        </div>
                      </div>
                      <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">User Sales</h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">View sales by users</p>
                    </div>
                  </button>
                )}

                {user.role === "admin" && (
                  <button
                    onClick={() => navigate('/admin/users')}
                    className="group relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden transform hover:-translate-y-2 border border-gray-200 dark:border-gray-700"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-pink-400 to-pink-600 opacity-10 rounded-full -mr-16 -mt-16"></div>
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-gradient-to-br from-pink-400 to-pink-600 rounded-xl group-hover:scale-110 transition-transform">
                          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0-3.866-3.582-7-8-7v14c4.418 0 8-3.134 8-7zM12 11c0 3.866 3.582 7 8 7V4c-4.418 0-8 3.134-8 7z" />
                          </svg>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold text-pink-600">→</div>
                        </div>
                      </div>
                      <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Manage Users</h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">Add or remove staff accounts (admin only)</p>
                    </div>
                  </button>
                )}

                {/* Sales Report Card (Admin/Manager) */}
                {(user.role === "admin" || user.role === "manager") && (
                  <button
                    onClick={() => navigate('/sales-report')}
                    className="group relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden transform hover:-translate-y-2 border border-gray-200 dark:border-gray-700"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-400 to-teal-600 opacity-10 rounded-full -mr-16 -mt-16"></div>
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-xl group-hover:scale-110 transition-transform">
                          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold text-teal-600">→</div>
                        </div>
                      </div>
                      <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Sales Report</h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">View sales from date to date</p>
                    </div>
                  </button>
                )}

            

                {/* Audit Logs Card (Admin Only) */}
                {user.role === "admin" && (
                  <button
                    onClick={() => navigate('/audit')}
                    className="group relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden transform hover:-translate-y-2 border border-gray-200 dark:border-gray-700"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-gray-600 to-gray-800 opacity-10 rounded-full -mr-16 -mt-16"></div>
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-gradient-to-br from-gray-600 to-gray-800 rounded-xl group-hover:scale-110 transition-transform">
                          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                          </svg>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold text-gray-700 dark:text-gray-300">→</div>
                        </div>
                      </div>
                      <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Audit Logs</h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">Track system activities</p>
                    </div>
                  </button>
                )}
              </div>
            </div>
          </div>
      );

  return (
    <Routes>
      <Route path="/" element={<DashboardHome />} />
      <Route path="/sale" element={<SaleInvoice onBack={() => navigate('/')} />} />
      <Route path="/purchase" element={<Purchase onBack={() => navigate('/')} />} />
      <Route path="/stock" element={<StockReport onBack={() => navigate('/')} />} />
      <Route path="/returns" element={<Returns onBack={() => navigate('/')} />} />
      <Route path="/reprint" element={<ReprintInvoice onBack={() => navigate('/')} />} />
      <Route path="/user-sales" element={<UserSaleReport onBack={() => navigate('/')} />} />
      <Route path="/user-sales/:userId" element={<UserSalesHistory onBack={() => navigate('/user-sales')} />} />
      <Route path="/sales-report" element={<SalesReport onBack={() => navigate('/')} />} />
      <Route path="/expenses" element={<Expenses onBack={() => navigate('/')} />} />
      <Route path="/audit" element={<AdminAudit onBack={() => navigate('/')} />} />
      <Route path="/admin/users" element={<AdminUsers onBack={() => navigate('/')} />} />
    </Routes>
  );
}

