import { useState, useEffect } from "react";
import api from "../api";

const emptyForm = { name: "", formula: "", category: "", pack_size: 1, selling_price: "", mrp: "", gst_percentage: "", supplier_id: "" };

export default function ProductsManagement({ onBack, user }) {
  const [products, setProducts]     = useState([]);
  const [loading, setLoading]       = useState(false);
  const [search, setSearch]         = useState("");
  const [showForm, setShowForm]     = useState(false);
  const [editProduct, setEditProduct] = useState(null); // null = add new
  const [form, setForm]             = useState(emptyForm);
  const [saving, setSaving]         = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // id to delete
  const [suppliers, setSuppliers]   = useState([]);
  const [filterSupplier, setFilterSupplier] = useState("");

  const isAdmin = user?.role === "admin";
  const isAdminOrManager = user?.role === "admin" || user?.role === "manager";

  const load = async () => {
    setLoading(true);
    try {
      const [prodRes, suppRes] = await Promise.all([
        api.get("/products?q="),
        api.get("/suppliers?q="),
      ]);
      setProducts(prodRes.data || []);
      setSuppliers(Array.isArray(suppRes.data) ? suppRes.data : []);
    } catch (err) {
      alert("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = products.filter(p => {
    const matchSearch =
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.formula?.toLowerCase().includes(search.toLowerCase()) ||
      p.category?.toLowerCase().includes(search.toLowerCase());
    const matchSupplier = filterSupplier ? String(p.supplier_id) === filterSupplier : true;
    return matchSearch && matchSupplier;
  });

  const openAdd = () => {
    setForm(emptyForm);
    setEditProduct(null);
    setShowForm(true);
  };

  const openEdit = (p) => {
    setForm({
      name: p.name || "",
      formula: p.formula || "",
      category: p.category || "",
      pack_size: p.pack_size || 1,
      selling_price: p.selling_price || "",
      mrp: p.mrp || "",
      gst_percentage: p.gst_percentage || "",
      supplier_id: p.supplier_id ? String(p.supplier_id) : "",
    });
    setEditProduct(p);
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditProduct(null); setForm(emptyForm); };

  const handleSave = async () => {
    if (!form.name.trim()) { alert("Product name is required"); return; }
    setSaving(true);
    try {
      if (editProduct) {
        await api.put(`/products/${editProduct.id}`, form);
      } else {
        await api.post("/products", form);
      }
      closeForm();
      load();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to save product");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/products/${id}`);
      setDeleteConfirm(null);
      load();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to delete product");
    }
  };

  return (
    <div className="p-2 sm:p-4 lg:p-6 bg-gray-100 min-h-screen">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 sm:p-8 text-white">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight">PRODUCTS</h1>
              <p className="text-blue-100 text-sm mt-1">Manage your product catalogue</p>
            </div>
            <div className="flex gap-3">
              {isAdminOrManager && (
                <button
                  onClick={openAdd}
                  className="px-5 py-2 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition text-sm"
                >
                  + Add Product
                </button>
              )}
              <button
                onClick={onBack}
                className="px-5 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-semibold transition text-sm"
              >
                Back
              </button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by name, formula, category..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              value={filterSupplier}
              onChange={e => setFilterSupplier(e.target.value)}
            >
              <option value="">All Companies</option>
              {suppliers.map(s => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
            </select>
          </div>
          <p className="text-sm text-gray-500 mt-2">{filtered.length} product{filtered.length !== 1 ? "s" : ""} found</p>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <p className="text-gray-500">Loading products...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-400 text-lg">No products found</p>
              {isAdminOrManager && <button onClick={openAdd} className="mt-4 px-5 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">Add First Product</button>}
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">#</th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Company / Supplier</th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Formula / SKU</th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Category</th>
                  <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">Pack Size</th>
                  <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">Sale Price</th>
                  <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">MRP</th>
                  <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">GST %</th>
                  {isAdminOrManager && <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">Actions</th>}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filtered.map((p, i) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-500">{i + 1}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{p.name}</td>
                    <td className="px-4 py-3 text-sm text-blue-700 font-medium">{p.supplier_name || <span className="text-gray-300">-</span>}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{p.formula || <span className="text-gray-300">-</span>}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{p.category || <span className="text-gray-300">-</span>}</td>
                    <td className="px-4 py-3 text-sm text-center text-gray-700">{p.pack_size || 1}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-green-700">Rs. {Number(p.selling_price || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-600">Rs. {Number(p.mrp || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-center text-gray-600">{p.gst_percentage ?? "-"}</td>
                    {isAdminOrManager && (
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEdit(p)}
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition"
                          >
                            Edit
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => setDeleteConfirm(p.id)}
                              className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800">{editProduct ? "Edit Product" : "Add New Product"}</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Company / Supplier</label>
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  value={form.supplier_id}
                  onChange={e => setForm(f => ({ ...f, supplier_id: e.target.value }))}
                >
                  <option value="">-- Select company --</option>
                  {suppliers.map(s => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Product Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Panadol"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Formula / SKU</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.formula}
                    onChange={e => setForm(f => ({ ...f, formula: e.target.value }))}
                    placeholder="e.g. Paracetamol 500mg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    placeholder="e.g. Tablet"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Pack Size</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.pack_size}
                    onChange={e => setForm(f => ({ ...f, pack_size: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Sale Price</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.selling_price}
                    onChange={e => setForm(f => ({ ...f, selling_price: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">MRP</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.mrp}
                    onChange={e => setForm(f => ({ ...f, mrp: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">GST %</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.gst_percentage}
                  onChange={e => setForm(f => ({ ...f, gst_percentage: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={closeForm} className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium">Cancel</button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {saving ? "Saving..." : (editProduct ? "Save Changes" : "Add Product")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="text-5xl mb-4">Warning</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Delete Product?</h2>
            <p className="text-gray-500 text-sm mb-6">This action cannot be undone. The product will be permanently removed.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setDeleteConfirm(null)} className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="px-5 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
