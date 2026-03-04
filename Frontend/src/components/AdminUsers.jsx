import { useState, useEffect, useMemo } from "react";
import api from "../api";

const fmt = (v) => Number(v || 0).toLocaleString("en-PK");

export default function AdminUsers({ onBack }) {
  const [step, setStep] = useState("verify");
  const [adminPass, setAdminPass] = useState("");
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState("");
  const [msgType, setMsgType] = useState("ok");

  const [userForm, setUserForm] = useState({
    emp_id: "",
    name: "",
    cnic: "",
    address: "",
    contact_no: "",
    father_contact_no: "",
    password: "",
    role: "user",
  });

  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editUserForm, setEditUserForm] = useState({
    name: "", cnic: "", emp_id: "", address: "", contact_no: "", father_contact_no: "", password: "", role: "user",
  });
  const [pinModal, setPinModal] = useState(false);
  const [pinForm, setPinForm] = useState({ current_password: "", new_pin: "", confirm_pin: "" });

  const [supplierForm, setSupplierForm] = useState({
    name: "",
    phone: "",
    address: "",
    opening_balance: "",
  });
  const [suppliers, setSuppliers] = useState([]);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [openCards, setOpenCards] = useState({ user: false, supplier: false });
  const toggleCard = (key) =>
    setOpenCards((prev) => ({ ...prev, [key]: !prev[key] }));

  const flash = (msg, type = "ok") => {
    setMessage(msg);
    setMsgType(type);
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data } = await api.get("/admin/users");
      setUsers(data || []);
    } catch {
      /* */
    } finally {
      setLoadingUsers(false);
    }
  };

  const deleteUser = async (u) => {
    if (!window.confirm(`Delete user "${u.username}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/users/${u.id}`);
      flash(`"${u.username}" deleted.`);
      loadUsers();
    } catch (e) {
      flash(e.response?.data?.error || "Delete failed", "err");
    }
  };

  const startEditUser = (u) => {
    setEditingUser(u);
    setEditUserForm({
      name: u.username || "",
      cnic: u.cnic || "",
      emp_id: u.emp_id || "",
      address: u.address || "",
      contact_no: u.contact_no || "",
      father_contact_no: u.father_contact_no || "",
      password: "",
      role: u.role || "user",
    });
  };

  const cancelEditUser = () => { setEditingUser(null); setMessage(""); };

  const submitSetPin = async () => {
    if (!pinForm.current_password.trim()) { flash("Current login password is required", "err"); return; }
    if (pinForm.new_pin.length < 4) { flash("PIN must be at least 4 characters", "err"); return; }
    if (pinForm.new_pin !== pinForm.confirm_pin) { flash("PINs do not match", "err"); return; }
    try {
      await api.post("/admin/set-pin", { current_password: pinForm.current_password, new_pin: pinForm.new_pin });
      flash("Panel PIN updated! Use it next time you unlock User Management.");
      setPinModal(false);
      setPinForm({ current_password: "", new_pin: "", confirm_pin: "" });
    } catch (e) {
      flash(e.response?.data?.error || "Failed to set PIN", "err");
    }
  };

  const submitEditUser = async () => {
    try {
      await api.patch(`/admin/users/${editingUser.id}`, {
        name: editUserForm.name,
        cnic: editUserForm.cnic,
        emp_id: editUserForm.emp_id,
        address: editUserForm.address,
        contact_no: editUserForm.contact_no,
        father_contact_no: editUserForm.father_contact_no,
        role: editUserForm.role,
        ...(editUserForm.password.trim() ? { password: editUserForm.password } : {}),
      });
      flash(`"${editUserForm.name}" updated.`);
      setEditingUser(null);
      loadUsers();
    } catch (e) {
      flash(e.response?.data?.error || "Update failed", "err");
    }
  };

  const loadSuppliers = async () => {
    setLoadingSuppliers(true);
    try {
      const { data } = await api.get("/suppliers?q=");
      setSuppliers(data || []);
    } catch {
      /* */
    } finally {
      setLoadingSuppliers(false);
    }
  };
  useEffect(() => {
    if (step === "main") { loadSuppliers(); loadUsers(); }
  }, [step]);

  const totals = useMemo(
    () =>
      suppliers.reduce(
        (a, s) => ({
          purchased: a.purchased + Number(s.total_billed || 0),
          returned: a.returned + Number(s.total_returned || 0),
          due: a.due + Number(s.final_balance || 0),
        }),
        { purchased: 0, returned: 0, due: 0 },
      ),
    [suppliers],
  );

  const verify = async () => {
    setChecking(true);
    try {
      await api.post("/admin/verify-password", { password: adminPass });
      setStep("main");
      setMessage("");
    } catch (e) {
      flash(e.response?.data?.error || "Verify failed", "err");
    } finally {
      setChecking(false);
    }
  };

  const submitUser = async () => {
    if (!userForm.emp_id.trim()) { flash("User ID is required", "err"); return; }
    if (!userForm.name.trim()) { flash("Name is required", "err"); return; }
    if (!userForm.cnic.trim()) { flash("CNIC is required", "err"); return; }
    if (!userForm.password.trim()) { flash("Password is required", "err"); return; }
    try {
      const { data } = await api.post("/admin/users", userForm);
      flash("User created: " + (data.username || ""));
      loadUsers();
      setUserForm({
        emp_id: "",
        name: "",
        cnic: "",
        address: "",
        contact_no: "",
        father_contact_no: "",
        password: "",
        role: "user",
      });
    } catch (e) {
      const d = e.response?.data;
      const msg = d?.error || (Array.isArray(d?.errors) ? d.errors.map(x => x.msg).join(", ") : null) || "Create failed";
      flash(msg, "err");
    }
  };

  const submitSupplier = async () => {
    if (!supplierForm.name.trim()) {
      flash("Company name is required", "err");
      return;
    }
    try {
      if (editingSupplier) {
        await api.put(`/suppliers/${editingSupplier.id}`, supplierForm);
        flash("Supplier updated!");
      } else {
        await api.post("/suppliers", supplierForm);
        flash("Supplier saved!");
      }
      setSupplierForm({
        name: "",
        phone: "",
        address: "",
        opening_balance: "",
      });
      setEditingSupplier(null);
      loadSuppliers();
    } catch (e) {
      flash(e.response?.data?.error || "Failed", "err");
    }
  };

  const editSupplier = (s) => {
    setEditingSupplier(s);
    setSupplierForm({
      name: s.name,
      phone: s.phone || "",
      address: s.address || "",
      opening_balance: s.opening_balance || "",
    });
    setMessage("");
  };
  const cancelEdit = () => {
    setEditingSupplier(null);
    setSupplierForm({ name: "", phone: "", address: "", opening_balance: "" });
    setMessage("");
  };

  const deleteSupplier = async (s) => {
    if (!window.confirm(`Delete supplier "${s.name}"?`)) return;
    try {
      await api.delete(`/suppliers/${s.id}`);
      if (editingSupplier?.id === s.id) cancelEdit();
      flash(`"${s.name}" deleted.`);
      loadSuppliers();
    } catch (e) {
      flash(e.response?.data?.error || "Delete failed", "err");
    }
  };

  /* ══ VERIFY SCREEN ══ */
  if (step === "verify") {
    return (
      <div style={{ minHeight: "100vh", background: "#f1f5f9", fontFamily: "'Segoe UI',Tahoma,sans-serif" }}>
        <div style={{ background: "#1e293b", color: "#fff", padding: "12px 20px", display: "flex", alignItems: "center", gap: 14 }}>
          <button onClick={onBack} style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", borderRadius: 6, padding: "6px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>← Back</button>
          <span style={{ fontSize: 18, fontWeight: 800 }}>USER MANAGEMENT</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
          <div style={{ width: 360, background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 32, textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: 12, background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 24 }}>🔒</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1e293b", marginBottom: 4 }}>Admin Access</h2>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>Enter your Panel PIN (or login password if no PIN is set)</p>
            <input type="password" value={adminPass} onChange={e => setAdminPass(e.target.value)} onKeyDown={e => e.key === "Enter" && verify()} autoFocus placeholder="Panel PIN"
              style={{ width: "100%", padding: "10px 14px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 14, marginBottom: 12, boxSizing: "border-box" }} />
            {message && <p style={{ color: "#dc2626", fontSize: 13, marginBottom: 12 }}>{message}</p>}
            <button onClick={verify} disabled={checking}
              style={{ width: "100%", padding: "10px 0", background: "#1e293b", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: "pointer", opacity: checking ? 0.5 : 1 }}>
              {checking ? "Verifying..." : "Unlock"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ══ MAIN SCREEN — TWO CARDS ══ */
  return (
    <div className="fixed inset-0 bg-slate-100 flex flex-col z-50">
      {/* ── Top Bar ── */}
      <div style={{ background: "#1e293b", color: "#fff", padding: "10px 20px", display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", borderRadius: 6, padding: "6px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>← Back</button>
        <span style={{ fontSize: 18, fontWeight: 800 }}>USER MANAGEMENT</span>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => { setPinModal(true); setMessage(""); }}
          style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", borderRadius: 6, padding: "6px 14px", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
          Change PIN
        </button>
        <button
          onClick={loadSuppliers}
          disabled={loadingSuppliers}
          style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", borderRadius: 6, padding: "6px 14px", fontWeight: 600, fontSize: 12, cursor: "pointer", opacity: loadingSuppliers ? 0.5 : 1 }}>
          Refresh
        </button>
      </div>

      {/* ── Change PIN Modal ── */}
      {pinModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800">Change Panel PIN</h3>
              <button onClick={() => { setPinModal(false); setPinForm({ current_password: "", new_pin: "", confirm_pin: "" }); }} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 text-xl">&times;</button>
            </div>
            <div className="p-6 space-y-3">
              <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
                Your <strong>Panel PIN</strong> is used to unlock User Management. It is separate from your login password.
              </p>
              <Field label="Current Login Password" type="password" placeholder="Your login password" value={pinForm.current_password} onChange={(e) => setPinForm({ ...pinForm, current_password: e.target.value })} />
              <Field label="New PIN (min 4 chars)" type="password" placeholder="e.g. 1234" value={pinForm.new_pin} onChange={(e) => setPinForm({ ...pinForm, new_pin: e.target.value })} />
              <Field label="Confirm New PIN" type="password" placeholder="Repeat PIN" value={pinForm.confirm_pin} onChange={(e) => setPinForm({ ...pinForm, confirm_pin: e.target.value })} />
            </div>
            <div className="px-6 pb-5 flex gap-3">
              <button onClick={() => { setPinModal(false); setPinForm({ current_password: "", new_pin: "", confirm_pin: "" }); }} className="flex-1 py-2.5 border border-slate-300 text-slate-600 rounded-lg font-semibold text-sm hover:bg-slate-50 transition">Cancel</button>
              <button onClick={submitSetPin} className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg font-semibold text-sm hover:from-indigo-700 hover:to-blue-700 transition shadow-sm">Save PIN</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {message && (
        <div
          className={`mx-4 sm:mx-6 mt-3 px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm ${
            msgType === "err"
              ? "bg-red-50 text-red-700 border border-red-200"
              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
          }`}
        >
          <span
            className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white font-bold ${msgType === "err" ? "bg-red-500" : "bg-emerald-500"}`}
          >
            {msgType === "err" ? "!" : "✓"}
          </span>
          {message}
          <button
            onClick={() => setMessage("")}
            className="ml-auto text-current opacity-40 hover:opacity-70"
          >
            &times;
          </button>
        </div>
      )}

      {/* ── Body: Two Cards ── */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-[1400px] mx-auto grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-5">
          {/* ╔══════════════════════════════════════╗
             ║       CARD 1 — USER MANAGEMENT       ║
             ╚══════════════════════════════════════╝ */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden self-start">
            {/* Card Header */}
            <button
              onClick={() => toggleCard("user")}
              className="w-full text-left px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-600 to-indigo-600 focus:outline-none"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h2 className="text-white font-bold text-sm">
                    User Management
                  </h2>
                  <p className="text-blue-200 text-xs">Create staff accounts</p>
                </div>
                <svg
                  className={`w-5 h-5 text-white/70 transition-transform duration-200 ${openCards.user ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </button>

            {/* User Form */}
            {openCards.user && (
              <div className="p-5 space-y-3">
                <Field
                  label="User ID *"
                  placeholder="EMP-001"
                  value={userForm.emp_id}
                  onChange={(e) =>
                    setUserForm({ ...userForm, emp_id: e.target.value })
                  }
                />
                <Field
                  label="Name *"
                  placeholder="Muhammad Ahmed"
                  value={userForm.name}
                  onChange={(e) =>
                    setUserForm({ ...userForm, name: e.target.value })
                  }
                />
                <Field
                  label="CNIC *"
                  placeholder="12345-1234567-1"
                  value={userForm.cnic}
                  onChange={(e) =>
                    setUserForm({ ...userForm, cnic: e.target.value })
                  }
                />
                <Field
                  label="Address"
                  placeholder="Street, City"
                  value={userForm.address}
                  onChange={(e) =>
                    setUserForm({ ...userForm, address: e.target.value })
                  }
                />
                <Field
                  label="Contact No."
                  placeholder="0300-1234567"
                  value={userForm.contact_no}
                  onChange={(e) =>
                    setUserForm({ ...userForm, contact_no: e.target.value })
                  }
                />
                <Field
                  label="Father Contact No."
                  placeholder="0300-7654321"
                  value={userForm.father_contact_no}
                  onChange={(e) =>
                    setUserForm({ ...userForm, father_contact_no: e.target.value })
                  }
                />
                <Field
                  label="Password *"
                  type="password"
                  placeholder="Enter password"
                  value={userForm.password}
                  onChange={(e) =>
                    setUserForm({ ...userForm, password: e.target.value })
                  }
                />
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Role
                  </label>
                  <select
                    value={userForm.role}
                    onChange={(e) =>
                      setUserForm({ ...userForm, role: e.target.value })
                    }
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition"
                  >
                    <option value="user">User</option>
                    <option value="cashier">Cashier</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>
                <button
                  onClick={submitUser}
                  className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold text-sm hover:from-blue-700 hover:to-indigo-700 transition shadow-sm active:scale-[0.99]"
                >
                  Create User
                </button>
              </div>
            )}

            {/* ── User List ── */}
            <div className="border-t border-slate-100">
              <div className="px-5 py-3 bg-slate-50 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {users.length} Staff Member{users.length !== 1 ? "s" : ""}
                </span>
                <button
                  onClick={loadUsers}
                  disabled={loadingUsers}
                  className="text-xs text-slate-400 hover:text-slate-600 transition disabled:opacity-40"
                >
                  {loadingUsers ? "Loading…" : "↺ Refresh"}
                </button>
              </div>
              {loadingUsers ? (
                <div className="py-8 text-center">
                  <div className="inline-block w-4 h-4 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
                </div>
              ) : users.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">No users yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-100 border-b border-slate-200">
                        <th className="pl-5 pr-2 py-2.5">ID</th>
                        <th className="px-2 py-2.5">Name</th>
                        <th className="px-2 py-2.5">Emp ID</th>
                        <th className="px-2 py-2.5">Role</th>
                        <th className="px-2 pr-5 py-2.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {users.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50 transition group">
                          <td className="pl-5 pr-2 py-2.5 text-slate-400 font-mono text-xs">{u.id}</td>
                          <td className="px-2 py-2.5">
                            <span className="font-semibold text-slate-800">{u.username}</span>
                            {u.cnic && (
                              <span className="block text-xs text-slate-400">{u.cnic}</span>
                            )}
                          </td>
                          <td className="px-2 py-2.5 text-slate-600 text-xs">{u.emp_id || "—"}</td>
                          <td className="px-2 py-2.5">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              u.role === "admin" ? "bg-purple-100 text-purple-700" :
                              u.role === "manager" ? "bg-blue-100 text-blue-700" :
                              u.role === "cashier" ? "bg-amber-100 text-amber-700" :
                              "bg-slate-100 text-slate-600"
                            }`}>{u.role}</span>
                          </td>
                          <td className="px-2 pr-5 py-2.5 text-right">
                            <div className="inline-flex gap-1 opacity-0 group-hover:opacity-100 transition ml-auto">
                              <button
                                onClick={() => startEditUser(u)}
                                title="Edit user"
                                className="w-7 h-7 flex items-center justify-center rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                                </svg>
                              </button>
                              {u.role !== "admin" && (
                              <button
                                onClick={() => deleteUser(u)}
                                title="Delete user"
                                className="w-7 h-7 flex items-center justify-center rounded-md bg-red-50 text-red-500 hover:bg-red-100"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                </svg>
                              </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* ── Edit User Modal ── */}
          {editingUser && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-bold text-slate-800">Edit User — {editingUser.username}</h3>
                  <button onClick={cancelEditUser} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 text-xl">&times;</button>
                </div>
                <div className="p-6 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="User ID" value={editUserForm.emp_id} onChange={(e) => setEditUserForm({ ...editUserForm, emp_id: e.target.value })} placeholder="EMP-001" />
                    <Field label="Name" value={editUserForm.name} onChange={(e) => setEditUserForm({ ...editUserForm, name: e.target.value })} placeholder="Muhammad Ahmed" />
                  </div>
                  <Field label="CNIC" value={editUserForm.cnic} onChange={(e) => setEditUserForm({ ...editUserForm, cnic: e.target.value })} placeholder="12345-1234567-1" />
                  <Field label="Address" value={editUserForm.address} onChange={(e) => setEditUserForm({ ...editUserForm, address: e.target.value })} placeholder="Street, City" />
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Contact No." value={editUserForm.contact_no} onChange={(e) => setEditUserForm({ ...editUserForm, contact_no: e.target.value })} placeholder="0300-1234567" />
                    <Field label="Father Contact No." value={editUserForm.father_contact_no} onChange={(e) => setEditUserForm({ ...editUserForm, father_contact_no: e.target.value })} placeholder="0300-7654321" />
                  </div>
                  <Field label="New Password (leave blank to keep)" type="password" value={editUserForm.password} onChange={(e) => setEditUserForm({ ...editUserForm, password: e.target.value })} placeholder="••••••••" />
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Role</label>
                    <select value={editUserForm.role} onChange={(e) => setEditUserForm({ ...editUserForm, role: e.target.value })}
                      className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition">
                      <option value="user">User</option>
                      <option value="cashier">Cashier</option>
                      <option value="manager">Manager</option>
                      {editingUser.role === "admin" && <option value="admin">Admin</option>}
                    </select>
                  </div>
                </div>
                <div className="px-6 pb-5 flex gap-3">
                  <button onClick={cancelEditUser} className="flex-1 py-2.5 border border-slate-300 text-slate-600 rounded-lg font-semibold text-sm hover:bg-slate-50 transition">Cancel</button>
                  <button onClick={submitEditUser} className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold text-sm hover:from-blue-700 hover:to-indigo-700 transition shadow-sm">Save Changes</button>
                </div>
              </div>
            </div>
          )}

          {/* ╔══════════════════════════════════════╗
             ║    CARD 2 — SUPPLIER MANAGEMENT      ║
             ╚══════════════════════════════════════╝ */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
            {/* Card Header */}
            <button
              onClick={() => toggleCard("supplier")}
              className="w-full text-left px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-red-500 to-rose-600 focus:outline-none"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h2 className="text-white font-bold text-sm">
                    Supplier Management
                  </h2>
                  <p className="text-red-200 text-xs">
                    {suppliers.length} supplier
                    {suppliers.length !== 1 ? "s" : ""} registered
                  </p>
                </div>
                <svg
                  className={`w-5 h-5 text-white/70 transition-transform duration-200 ${openCards.supplier ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </button>

            {/* Collapsible body */}
            {openCards.supplier && (
              <>
                {/* Summary Stats Row */}
                <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 grid grid-cols-3 divide-x divide-slate-200">
                  <div className="text-center px-3">
                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-0.5">
                      Total Purchased
                    </p>
                    <p className="text-base font-extrabold text-blue-700 tabular-nums">
                      Rs {fmt(totals.purchased)}
                    </p>
                  </div>
                  <div className="text-center px-3">
                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-0.5">
                      Total Returned
                    </p>
                    <p className="text-base font-extrabold text-amber-600 tabular-nums">
                      Rs {fmt(totals.returned)}
                    </p>
                  </div>
                  <div className="text-center px-3">
                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-0.5">
                      Total Due
                    </p>
                    <p
                      className={`text-base font-extrabold tabular-nums ${totals.due > 0 ? "text-red-700" : "text-emerald-700"}`}
                    >
                      Rs {fmt(totals.due)}
                    </p>
                  </div>
                </div>

                {/* Supplier Form */}
                <div className="px-5 py-4 border-b border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-bold text-slate-900">
                      {editingSupplier
                        ? `Editing: ${editingSupplier.name}`
                        : "Add New Supplier"}
                    </h3>
                    {editingSupplier && (
                      <button
                        onClick={cancelEdit}
                        className="text-sm px-3 py-1 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 font-semibold transition"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <Field
                      label="Company Name *"
                      placeholder="Pharma Co."
                      value={supplierForm.name}
                      onChange={(e) =>
                        setSupplierForm({
                          ...supplierForm,
                          name: e.target.value,
                        })
                      }
                    />
                    <Field
                      label="Contact"
                      placeholder="0300-1234567"
                      value={supplierForm.phone}
                      onChange={(e) =>
                        setSupplierForm({
                          ...supplierForm,
                          phone: e.target.value,
                        })
                      }
                    />
                    <Field
                      label="Opening Bal. (Rs)"
                      placeholder="0"
                      type="number"
                      min="0"
                      value={supplierForm.opening_balance}
                      onChange={(e) =>
                        setSupplierForm({
                          ...supplierForm,
                          opening_balance: e.target.value,
                        })
                      }
                    />
                    <div className="sm:col-span-2 lg:col-span-2">
                      <Field
                        label="Address"
                        placeholder="Street, City"
                        value={supplierForm.address}
                        onChange={(e) =>
                          setSupplierForm({
                            ...supplierForm,
                            address: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={submitSupplier}
                        className="w-full py-2.5 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-lg font-semibold text-sm hover:from-red-600 hover:to-rose-700 transition shadow-sm active:scale-[0.99]"
                      >
                        {editingSupplier ? "Update" : "Save Supplier"}
                      </button>
                    </div>
                  </div>

                  {/* Balance breakdown when editing */}
                  {editingSupplier && (
                    <div className="mt-3 grid grid-cols-4 gap-2">
                      {[
                        {
                          l: "Opening",
                          v: editingSupplier.opening_balance,
                          c: "text-slate-800",
                        },
                        {
                          l: "Purchased",
                          v: editingSupplier.total_billed,
                          c: "text-blue-700",
                        },
                        {
                          l: "Returned",
                          v: editingSupplier.total_returned,
                          c: "text-amber-700",
                        },
                        {
                          l: "Balance Due",
                          v: editingSupplier.final_balance,
                          c:
                            Number(editingSupplier.final_balance || 0) > 0
                              ? "text-red-700"
                              : "text-emerald-700",
                        },
                      ].map(({ l, v, c }) => (
                        <div
                          key={l}
                          className="bg-white rounded-lg border border-slate-300 p-2.5 text-center"
                        >
                          <p className="text-[11px] text-slate-600 uppercase font-bold tracking-wider mb-0.5">
                            {l}
                          </p>
                          <p
                            className={`text-sm font-extrabold tabular-nums ${c}`}
                          >
                            Rs {fmt(v)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Supplier List */}
                <div className="flex-1 overflow-hidden flex flex-col">
                  {loadingSuppliers ? (
                    <div className="py-12 text-center">
                      <div className="inline-block w-5 h-5 border-2 border-slate-200 border-t-red-500 rounded-full animate-spin" />
                      <p className="text-xs text-slate-400 mt-2">Loading...</p>
                    </div>
                  ) : suppliers.length === 0 ? (
                    <div className="py-12 text-center text-sm text-slate-400">
                      No suppliers yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm min-w-[640px]">
                        <thead className="sticky top-0">
                          <tr className="text-left text-xs font-bold text-slate-600 uppercase tracking-wider bg-slate-100 border-b border-slate-300">
                            <th className="pl-5 pr-2 py-3">#</th>
                            <th className="px-2 py-3">Company</th>
                            <th className="px-2 py-3">Contact</th>
                            <th className="px-2 py-3 text-right">Opening</th>
                            <th className="px-2 py-3 text-right text-blue-700">
                              Purchased
                            </th>
                            <th className="px-2 py-3 text-right text-amber-700">
                              Returned
                            </th>
                            <th className="px-2 py-3 text-right text-red-700">
                              Balance
                            </th>
                            <th className="px-2 pr-5 py-3 text-right">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {suppliers.map((s) => {
                            const bal = Number(s.final_balance || 0);
                            return (
                              <tr
                                key={s.id}
                                className="hover:bg-slate-50 transition group"
                              >
                                <td className="pl-5 pr-2 py-3 text-slate-500 font-mono text-sm">
                                  {s.id}
                                </td>
                                <td className="px-2 py-3">
                                  <span className="font-bold text-slate-900 text-sm">
                                    {s.name}
                                  </span>
                                  {s.address && (
                                    <span className="block text-xs text-slate-500 truncate max-w-[160px]">
                                      {s.address}
                                    </span>
                                  )}
                                </td>
                                <td className="px-2 py-3 text-slate-700 text-sm">
                                  {s.phone || "—"}
                                </td>
                                <td className="px-2 py-3 text-right text-slate-700 tabular-nums text-sm font-medium">
                                  {fmt(s.opening_balance)}
                                </td>
                                <td className="px-2 py-3 text-right font-bold text-blue-700 tabular-nums text-sm">
                                  {fmt(s.total_billed)}
                                </td>
                                <td className="px-2 py-3 text-right font-bold text-amber-700 tabular-nums text-sm">
                                  {fmt(s.total_returned)}
                                </td>
                                <td className="px-2 py-3 text-right">
                                  <span
                                    className={`inline-block px-2.5 py-0.5 rounded-full text-sm font-extrabold tabular-nums ${
                                      bal > 0
                                        ? "bg-red-100 text-red-800"
                                        : "bg-emerald-100 text-emerald-800"
                                    }`}
                                  >
                                    {fmt(bal)}
                                  </span>
                                </td>
                                <td className="px-2 pr-5 py-2.5 text-right">
                                  <div className="inline-flex gap-1 opacity-50 group-hover:opacity-100 transition">
                                    <button
                                      onClick={() => editSupplier(s)}
                                      title="Edit"
                                      className="w-7 h-7 flex items-center justify-center rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                                    >
                                      <svg
                                        className="w-3.5 h-3.5"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth={2}
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"
                                        />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() => deleteSupplier(s)}
                                      title="Delete"
                                      className="w-7 h-7 flex items-center justify-center rounded-md bg-red-50 text-red-600 hover:bg-red-100 transition"
                                    >
                                      <svg
                                        className="w-3.5 h-3.5"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth={2}
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                                        />
                                      </svg>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Reusable Field ── */
function Field({ label, ...props }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
        {label}
      </label>
      <input
        {...props}
        className={`w-full px-3 py-2.5 border rounded-lg text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 ${
          props.disabled
            ? "bg-slate-100 border-slate-200 text-slate-400"
            : "bg-white border-slate-300 text-slate-900 hover:border-slate-400 placeholder:text-slate-400"
        }`}
      />
    </div>
  );
}
