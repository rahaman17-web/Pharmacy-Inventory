import { useEffect, useState } from "react";
import api from "../api";

export default function AdminAudit({ onBack }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { data } = await api.get("/audit?limit=500");
        setRows(data);
      } catch (err) {
        console.error(err);
        alert("Failed to load audit logs");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredRows = rows.filter(r => 
    r.action?.toLowerCase().includes(filter.toLowerCase()) ||
    r.username?.toLowerCase().includes(filter.toLowerCase()) ||
    JSON.stringify(r.details)?.toLowerCase().includes(filter.toLowerCase())
  );

  const getActionColor = (action) => {
    if (action?.includes('login')) return 'bg-blue-100 text-blue-800';
    if (action?.includes('sale')) return 'bg-green-100 text-green-800';
    if (action?.includes('purchase')) return 'bg-purple-100 text-purple-800';
    if (action?.includes('delete')) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getActionIcon = (action) => {
    if (action?.includes('login')) {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
        </svg>
      );
    }
    if (action?.includes('sale')) {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    }
    if (action?.includes('purchase')) {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white shadow-md border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-gradient-to-r from-gray-600 to-gray-800 rounded-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Audit Logs</h2>
              <p className="text-sm text-gray-500">System activity tracking</p>
            </div>
          </div>
          <button
            onClick={onBack}
            className="px-6 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all shadow-md hover:shadow-lg"
          >
            ← Back
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-blue-500">
            <p className="text-gray-500 text-sm font-medium">Total Events</p>
            <p className="text-3xl font-bold text-gray-800 mt-1">{filteredRows.length}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-green-500">
            <p className="text-gray-500 text-sm font-medium">Sales Events</p>
            <p className="text-3xl font-bold text-gray-800 mt-1">
              {filteredRows.filter(r => r.action?.includes('sale')).length}
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-purple-500">
            <p className="text-gray-500 text-sm font-medium">Purchase Events</p>
            <p className="text-3xl font-bold text-gray-800 mt-1">
              {filteredRows.filter(r => r.action?.includes('purchase')).length}
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-orange-500">
            <p className="text-gray-500 text-sm font-medium">Login Events</p>
            <p className="text-3xl font-bold text-gray-800 mt-1">
              {filteredRows.filter(r => r.action?.includes('login')).length}
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Search logs by action, user, or details..."
              className="w-full px-5 py-3 pl-12 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent transition"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            <svg className="w-6 h-6 text-gray-400 absolute left-4 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Logs Timeline */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <svg className="animate-spin h-12 w-12 text-gray-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-gray-500">Loading audit logs...</p>
              </div>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="text-center py-20">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-500">No audit logs found</p>
            </div>
          ) : (
            <div className="max-h-[600px] overflow-y-auto">
              <div className="p-6 space-y-4">
                {filteredRows.map((r, idx) => (
                  <div key={r.id} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition">
                    {/* Timeline dot */}
                    <div className="flex-shrink-0 mt-1">
                      <div className={`p-2 rounded-lg ${getActionColor(r.action)}`}>
                        {getActionIcon(r.action)}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getActionColor(r.action)}`}>
                            {r.action}
                          </span>
                          <span className="text-sm font-semibold text-gray-800">{r.username || r.user_id || "System"}</span>
                        </div>
                        <span className="text-xs text-gray-500">{new Date(r.created_at).toLocaleString()}</span>
                      </div>
                      {r.details && (
                        <div className="mt-2 p-3 bg-white rounded-lg border border-gray-200">
                          <pre className="text-xs text-gray-600 overflow-x-auto whitespace-pre-wrap break-words">
                            {JSON.stringify(r.details, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
