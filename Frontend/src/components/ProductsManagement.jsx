import { useState, useEffect, useRef } from "react";
import api from "../api";

const CATEGORIES = [
  "Tablet",
  "Syrup",
  "Capsule",
  "Drop",
  "Cream",
  "Face Wash",
  "Injection",
  "Lotion",
  "Milk",
  "Ointment",
  "General",
  "Surgical",
];
const AC_UNITS = [
  "No.",
  "Yes.",
  "Strip",
  "Bottle",
  "Box",
  "Vial",
  "Tube",
  "Sachet",
  "Ampoule",
];

const emptyForm = {
  supplier_id: "",
  name: "",
  formula: "",
  category: "",
  brand: "",
  ac_unit: "",
  barcode: "",
  shelf: "",
  active: true,
  gst_percentage: "",
  selling_price: "",
  mrp: "",
  pack_size: 1,
  pack_sale_price: "",
  purchase_price: "",
  purchase_percent: "14.5",
  def_discount: "",
  from_date: "",
  to_date: "",
  opening_qty: "",
  min_level: "",
  batch_no: "",
  expiry_date: "",
  expiry_by_brand: "",
};

/* ── shared input style ── */
const INP =
  "w-full h-[24px] min-h-[22px] px-1.5 text-[clamp(10px,1.1vw,13px)] font-semibold border border-gray-400 bg-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-400";
const SEL = INP + " appearance-none";

/* grid cell: label above + input below */
const FG = ({ label, span = 1, children }) => (
  <div style={{ gridColumn: `span ${span}`, minWidth: 0, overflow: "hidden" }}>
    <div
      style={{
        fontSize: "clamp(8px,0.85vw,10px)",
        color: "#333",
        fontWeight: 800,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        marginBottom: 1,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      {label}
    </div>
    {children}
  </div>
);

/* unique id counter so each KbSelect has its own portal id */
let _kbId = 0;

/* ── Searchable KbSelect — type to filter, arrow keys navigate, Enter picks ── */
function KbSelect({ value, onChange, options, className, formContainerRef }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hi, setHi] = useState(0);
  const [rect, setRect] = useState(null);
  const btnRef = useRef(null);
  const inputRef = useRef(null);
  const hiRef = useRef(null);
  const myId = useRef(`kbselect-portal-${++_kbId}`);
  const portalRef = useRef(null);

  const selectedLabel =
    options.find((o) => String(o.value) === String(value))?.label ||
    options[0]?.label ||
    "";

  const filtered = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  const openList = () => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setRect({ top: r.bottom, left: r.left, width: r.width });
    setQuery("");
    const idx = Math.max(
      0,
      options.findIndex((o) => String(o.value) === String(value)),
    );
    setHi(idx);
    setOpen(true);
    // Tell every other KbSelect to close
    window.dispatchEvent(new CustomEvent("kbselect-opened", { detail: myId.current }));
    setTimeout(() => inputRef.current?.focus(), 20);
  };

  const closeList = () => {
    setOpen(false);
    setQuery("");
  };

  const pick = (val) => {
    onChange(val);
    closeList();
    setTimeout(() => {
      const cnt = formContainerRef?.current;
      if (!cnt) return;
      const fields = Array.from(
        cnt.querySelectorAll(
          'input:not([readonly]):not([type="checkbox"]):not([data-skip-enter]), button[data-kbselect]',
        ),
      );
      const idx = fields.indexOf(btnRef.current);
      if (idx >= 0 && idx < fields.length - 1) fields[idx + 1].focus();
      else cnt.querySelector("button[data-save]")?.focus();
    }, 30);
  };

  // When query changes, reset highlight to first match
  useEffect(() => {
    setHi(0);
  }, [query]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (open && hiRef.current)
      hiRef.current.scrollIntoView({ block: "nearest" });
  }, [hi, open]);

  // Close when another KbSelect opens
  useEffect(() => {
    const handler = (e) => { if (e.detail !== myId.current) closeList(); };
    window.addEventListener("kbselect-opened", handler);
    return () => window.removeEventListener("kbselect-opened", handler);
  }, []);

  // Close on outside click — use portalRef so each instance checks its own portal
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        !btnRef.current?.contains(e.target) &&
        !portalRef.current?.contains(e.target)
      )
        closeList();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const onSearchKD = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      e.stopPropagation();
      setHi((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      e.stopPropagation();
      setHi((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      if (filtered[hi]) pick(filtered[hi].value);
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      closeList();
      btnRef.current?.focus();
    }
  };

  const onBtnKD = (e) => {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      if (!open) openList();
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      closeList();
    }
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        data-kbselect
        className={className}
        style={{
          textAlign: "left",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          width: "100%",
        }}
        onFocus={(e) => {
          // Don't re-open when focus returns from our own portal (e.g. Escape key)
          if (portalRef.current?.contains(e.relatedTarget)) return;
          openList();
        }}
        onKeyDown={onBtnKD}
        onPointerDown={(e) => {
          // Handle click toggle without relying on focus event
          e.preventDefault();
          open ? closeList() : openList();
        }}
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
          }}
        >
          {selectedLabel}
        </span>
        <span
          style={{
            opacity: 0.5,
            fontSize: "0.7em",
            marginLeft: 4,
            flexShrink: 0,
          }}
        >
          &#9660;
        </span>
      </button>
      {open && rect && (
        <div
          ref={portalRef}
          id={myId.current}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            top: rect.top,
            left: rect.left,
            width: Math.max(rect.width, 180),
            zIndex: 9999,
            background: "#fff",
            border: "2px solid #1a3f8f",
            boxShadow: "0 6px 24px rgba(0,0,0,0.3)",
          }}
        >
          {/* Search box */}
          <div
            style={{
              padding: "4px 6px",
              borderBottom: "1px solid #c0c8e0",
              background: "#eef2ff",
            }}
          >
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onSearchKD}
              placeholder="Type to search..."
              style={{
                width: "100%",
                border: "1px solid #99aadd",
                padding: "2px 6px",
                fontSize: "clamp(10px,1.05vw,13px)",
                outline: "none",
                background: "#fff",
              }}
            />
          </div>
          {/* Options list */}
          <div
            style={{
              maxHeight: Math.max(120, window.innerHeight - rect.top - 50),
              overflowY: "auto",
            }}
          >
            {filtered.length === 0 ? (
              <div style={{ padding: "6px 10px", color: "#999", fontSize: 12 }}>
                No match
              </div>
            ) : (
              filtered.map((opt, i) => (
                <div
                  key={opt.value}
                  ref={i === hi ? hiRef : null}
                  onMouseDown={() => pick(opt.value)}
                  onMouseEnter={() => setHi(i)}
                  style={{
                    padding: "5px 10px",
                    fontSize: "clamp(11px,1.1vw,14px)",
                    fontWeight: String(opt.value) === String(value) ? 700 : 400,
                    background:
                      i === hi
                        ? "#1a3f8f"
                        : String(opt.value) === String(value)
                          ? "#ddeeff"
                          : "#fff",
                    color: i === hi ? "#fff" : "#111",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {opt.label}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default function ProductsManagement({ onBack, user }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [searchFormula, setSearchFormula] = useState("");
  const [searchGroup, setSearchGroup] = useState("");
  const [searchId, setSearchId] = useState("");
  const [searchName, setSearchName] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [editProduct, setEditProduct] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [successMsg, setSuccessMsg] = useState("");
  const [discountWarning, setDiscountWarning] = useState("");

  const isAdmin = user?.role === "admin";
  const isAdminOrManager = user?.role === "admin" || user?.role === "manager";
  const formContainerRef = useRef(null);
  const productIdRef = useRef(null);
  const addNewBtnRef = useRef(null);
  // Tracks whether the user manually typed in purchase_price (stops auto-overwrite)
  const manualPurchasePriceRef = useRef(false);

  // Auto-focus "Add New" button when page opens
  useEffect(() => {
    if (isAdminOrManager) setTimeout(() => addNewBtnRef.current?.focus(), 80);
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [prodRes, suppRes] = await Promise.all([
        api.get("/products?q="),
        api.get("/suppliers?q="),
      ]);
      setProducts(prodRes.data || []);
      setSuppliers(Array.isArray(suppRes.data) ? suppRes.data : []);
    } catch {
      alert("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = products.filter((p) => {
    const matchSearch =
      !search ||
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      String(p.id).includes(search);
    const matchFormula =
      !searchFormula ||
      p.formula?.toLowerCase().includes(searchFormula.toLowerCase());
    const matchGroup = !searchGroup || p.category === searchGroup;
    const matchId = !searchId || String(p.id).includes(searchId);
    const matchName =
      !searchName || p.name?.toLowerCase().includes(searchName.toLowerCase());
    const pDate = p.created_at
      ? p.created_at.slice(0, 10)
      : p.from_date
        ? p.from_date.slice(0, 10)
        : "";
    const matchFrom = !filterFrom || (pDate && pDate >= filterFrom);
    const matchTo = !filterTo || (pDate && pDate <= filterTo);
    return (
      matchSearch &&
      matchFormula &&
      matchGroup &&
      matchId &&
      matchName &&
      matchFrom &&
      matchTo
    );
  });

  const stockInHand = filtered.reduce(
    (s, p) => s + (Number(p.opening_qty) || 0),
    0,
  );

  const openAdd = () => {
    setForm(emptyForm);
    setEditProduct(null);
    manualPurchasePriceRef.current = false;
    // Focus the first editable field (Ac Unit KbSelect)
    setTimeout(() => {
      const cnt = formContainerRef.current;
      if (!cnt) return;
      const firstEditable = cnt.querySelector('button[data-kbselect], input:not([readonly]):not([type="checkbox"])');
      firstEditable?.focus();
    }, 40);
  };

  const selectProduct = (p) => {
    manualPurchasePriceRef.current = false;
    setForm({
      supplier_id: p.supplier_id ? String(p.supplier_id) : "",
      name: p.name || "",
      formula: p.formula || "",
      category: p.category || "",
      brand: p.brand || "",
      ac_unit: p.ac_unit || "",
      barcode: p.barcode || "",
      shelf: p.shelf || "",
      active: p.active !== false,
      gst_percentage: Number(p.gst_percentage) > 0 ? p.gst_percentage : "",
      selling_price: p.selling_price ?? "",
      mrp: p.mrp ?? "",
      pack_size: p.pack_size || 1,
      pack_sale_price: p.pack_sale_price ?? "",
      purchase_price: p.purchase_price ?? "",
      purchase_percent: p.purchase_percent != null && p.purchase_percent !== "" ? p.purchase_percent : "14.5",
      def_discount: p.def_discount ?? "",
      from_date: p.from_date ? p.from_date.slice(0, 10) : "",
      to_date: p.to_date ? p.to_date.slice(0, 10) : "",
      opening_qty: p.opening_qty ?? "",
      min_level: p.min_level ?? "",
      batch_no: p.batch_no || "",
      expiry_date: p.expiry_date ? p.expiry_date.slice(0, 10) : "",
      expiry_by_brand: p.expiry_by_brand || "",
    });
    setEditProduct(p);
    setTimeout(() => productIdRef.current?.focus(), 30);
  };

  const sf = (f) => (e) => {
    const val = e.target.value;

    // User is manually typing purchase_price → don't auto-overwrite until pack_sale_price changes
    if (f === "purchase_price") manualPurchasePriceRef.current = true;
    // User changed the base price → allow auto-recalc again
    if (f === "pack_sale_price") manualPurchasePriceRef.current = false;

    setForm((v) => {
      const updated = { ...v, [f]: val };

      // Auto-calculate selling_price and purchase_price whenever pack fields change
      if (f === "pack_sale_price" || f === "pack_size" || f === "purchase_percent") {
        const psp = Number(f === "pack_sale_price"  ? val : v.pack_sale_price)  || 0;
        const ps  = Math.max(Number(f === "pack_size" ? val : v.pack_size) || 1, 0.0001);
        const pct = Number(f === "purchase_percent" ? val : v.purchase_percent) || 0;

        if (psp > 0) {
          updated.selling_price = (psp / ps).toFixed(2);
          // Only overwrite purchase_price if user hasn't manually typed a value
          if (!manualPurchasePriceRef.current) {
            updated.purchase_price = (psp * (1 - pct / 100) / ps).toFixed(2);
          }
        } else {
          // pack_sale_price cleared — clear both derived fields
          updated.selling_price  = "";
          updated.purchase_price = "";
          manualPurchasePriceRef.current = false;
        }
      }

      // def_discount is independent — no capping here. GST is just a product flag.
      // The 5% cap is enforced only in Sale Invoice.

      return updated;
    });
  };
  const sc = (f) => (e) => setForm((v) => ({ ...v, [f]: e.target.checked }));

  // Prevent mouse wheel from changing numeric inputs — blur the input on wheel
  const preventWheel = (e) => {
    e.target.blur();
  };

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  /* Enter / ArrowDown → next field,  ArrowUp → previous field */
  const handleEnterKey = (e) => {
    const key = e.key;
    if (key !== "Enter" && key !== "ArrowDown" && key !== "ArrowUp") return;
    const tag = e.target.tagName;
    const isNavStart = tag === "INPUT" && e.target.dataset.navstart !== undefined;
    const isInput = tag === "INPUT" && e.target.type !== "checkbox" && !e.target.readOnly;
    const isKbSel = tag === "BUTTON" && e.target.dataset.kbselect !== undefined;
    if (!isInput && !isKbSel && !isNavStart) return;
    if (isKbSel) return; // KbSelect handles its own keys
    e.preventDefault();
    const fields = Array.from(
      e.currentTarget.querySelectorAll(
        'input[data-navstart], input:not([readonly]):not([type="checkbox"]):not([data-skip-enter]), button[data-kbselect]',
      ),
    );
    const idx = fields.indexOf(e.target);
    if (key === "ArrowUp") {
      if (idx > 0) fields[idx - 1].focus();
    } else {
      // Enter or ArrowDown → move forward
      if (idx >= 0 && idx < fields.length - 1) {
        fields[idx + 1].focus();
      } else if (idx === fields.length - 1) {
        e.currentTarget.querySelector("button[data-save]")?.focus();
      }
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      alert("Product name is required");
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name,
      formula: form.formula,
      category: form.category,
      brand: form.brand,
      ac_unit: form.ac_unit,
      barcode: form.barcode,
      shelf: form.shelf,
      active: Boolean(form.active),
      supplier_id: form.supplier_id || null,
      selling_price: Number(form.selling_price) || 0,
      mrp: Number(form.mrp) || 0,
      pack_size: Number(form.pack_size) || 1,
      pack_sale_price: Number(form.pack_sale_price) || 0,
      purchase_price: Number(form.purchase_price) || 0,
      purchase_percent: Number(form.purchase_percent) || 0,
      def_discount: Number(form.def_discount) || 0,
      gst_percentage: Number(form.gst_percentage) || 0,
      from_date: form.from_date || null,
      to_date: form.to_date || null,
      opening_qty: Number(form.opening_qty) || 0,
      min_level: Number(form.min_level) || 0,
      batch_no: form.batch_no,
      expiry_date: form.expiry_date || null,
      expiry_by_brand: form.expiry_by_brand,
    };
    try {
      if (editProduct) {
        await api.put(`/products/${editProduct.id}`, payload);
        await load();
        const freshList = (await api.get("/products?q=")).data || [];
        const fresh = freshList.find((p) => p.id === editProduct.id);
        if (fresh) selectProduct(fresh);
        showSuccess("Updated!");
      } else {
        await api.post("/products", payload);
        await load();
        openAdd();
        showSuccess("Created!");
      }
    } catch (err) {
      alert(err.response?.data?.error || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/products/${id}`);
      setDeleteConfirm(null);
      if (editProduct?.id === id) openAdd();
      load();
      showSuccess("Deleted!");
    } catch (err) {
      const data = err.response?.data;
      if (data?.canDeactivate) {
        if (window.confirm(data.error + "\n\nOK to deactivate instead.")) {
          try {
            await api.delete(`/products/${id}?deactivate=true`);
            setDeleteConfirm(null);
            load();
            showSuccess("Deactivated!");
            if (editProduct?.id === id) openAdd();
          } catch (e2) {
            alert(e2.response?.data?.error || "Failed");
          }
        } else {
          setDeleteConfirm(null);
        }
      } else {
        alert(data?.error || "Failed to delete");
      }
    }
  };

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden z-40"
      style={{
        background: "#f0dfa0",
        fontFamily: "'Segoe UI',Tahoma,sans-serif",
      }}
    >
      {/* ── TOAST ── */}
      {successMsg && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] px-8 py-3 rounded-lg shadow-2xl font-black text-[15px] tracking-wide"
          style={{
            background: "#1a7a2e",
            color: "#ffffff",
            border: "2px solid #145c22",
            letterSpacing: "0.04em",
          }}
        >
          ✓ &nbsp;{successMsg}
        </div>
      )}

      {/* ══════ HEADER BAR ══════ */}
      <div
        style={{ background: "#d4aa40", borderBottom: "2px solid #b8921c" }}
        className="shrink-0 px-2 py-1"
      >
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Title + Add New */}
          <span className="text-[clamp(15px,1.6vw,22px)] font-black text-gray-900 tracking-tight leading-none mr-1 whitespace-nowrap">
            Products
          </span>
          {isAdminOrManager && (
            <button
              ref={addNewBtnRef}
              onClick={openAdd}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); openAdd(); } }}
              className="h-[26px] px-2 text-[11px] font-bold border border-gray-500 rounded whitespace-nowrap"
              style={{ background: "#e8e8e8" }}
            >
              Add New
            </button>
          )}

          {/* Search fields — responsive */}
          <div className="flex items-center gap-0 border border-gray-500 rounded overflow-hidden">
            <span className="px-1.5 text-[10px] font-bold text-gray-800 bg-amber-200 border-r border-gray-400 h-[24px] flex items-center whitespace-nowrap">
              BarCode
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder=""
              className="h-[24px] px-1 text-[11px] border-0 outline-none bg-white"
              style={{ width: "clamp(55px,7vw,110px)" }}
            />
          </div>
          <div className="flex items-center gap-0 border border-gray-500 rounded overflow-hidden">
            <span className="px-1.5 text-[10px] font-bold text-gray-800 bg-amber-200 border-r border-gray-400 h-[24px] flex items-center whitespace-nowrap">
              Formula
            </span>
            <input
              value={searchFormula}
              onChange={(e) => setSearchFormula(e.target.value)}
              placeholder=""
              className="h-[24px] px-1 text-[11px] border-0 outline-none bg-white"
              style={{ width: "clamp(55px,7vw,110px)" }}
            />
          </div>
          <div className="flex items-center gap-0 border border-gray-500 rounded overflow-hidden">
            <span className="px-1.5 text-[10px] font-bold text-gray-800 bg-amber-200 border-r border-gray-400 h-[24px] flex items-center whitespace-nowrap">
              ProductID
            </span>
            <input
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder=""
              className="h-[24px] px-1 text-[11px] border-0 outline-none bg-white border-r border-gray-400"
              style={{ width: "clamp(35px,4vw,55px)" }}
            />
            <span className="px-1.5 text-[10px] font-bold text-gray-800 bg-amber-200 border-r border-gray-400 h-[24px] flex items-center whitespace-nowrap">
              Product Name
            </span>
            <input
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              placeholder=""
              className="h-[24px] px-1 text-[11px] border-0 outline-none bg-white"
              style={{ width: "clamp(65px,8vw,130px)" }}
            />
          </div>
          <div className="flex items-center gap-0 border border-gray-500 rounded overflow-hidden">
            <span className="px-1.5 text-[10px] font-bold text-gray-800 bg-amber-200 border-r border-gray-400 h-[24px] flex items-center whitespace-nowrap">
              Group
            </span>
            <select
              value={searchGroup}
              onChange={(e) => setSearchGroup(e.target.value)}
              className="h-[24px] px-1 text-[11px] border-0 outline-none bg-white"
              style={{ width: "clamp(80px,7vw,115px)" }}
            >
              <option value="">All Groups</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ══════ MAIN 3-PANEL BODY ══════ */}
      <div
        className="flex flex-1 overflow-hidden min-h-0"
        style={{ gap: 2, padding: 2 }}
      >
        {/* ── LEFT FORM PANEL ── */}
        {isAdminOrManager && (
          <div
            className="shrink-0 flex flex-col min-h-0 border border-gray-500"
            style={{ width: "clamp(260px,24vw,500px)", background: "#f5f7fa" }}
          >
            {/* Blue header */}
            <div
              className="text-white font-black px-2 py-1.5 shrink-0 text-center"
              style={{
                background: "#1a3f8f",
                fontSize: "clamp(11px,1.1vw,14px)",
                letterSpacing: "0.04em",
                textShadow: "0 1px 2px rgba(0,0,0,0.3)",
              }}
            >
              {editProduct
                ? `Edit Product — #${editProduct.id}`
                : "Add New Product"}
            </div>
            {/* 2-column grid form */}
            <div
              ref={formContainerRef}
              className="flex-1 flex flex-col overflow-x-hidden px-1.5 pt-1 pb-1"
              style={{ gap: 0 }}
              onKeyDown={handleEnterKey}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "clamp(2px,0.3vw,4px)",
                  alignContent: "start",
                  minWidth: 0,
                }}
              >
                <FG label="Product ID">
                  <input
                    ref={productIdRef}
                    data-navstart
                    className={INP}
                    value={editProduct?.id || "(auto)"}
                    readOnly
                    style={{ background: "#e8e8e8" }}
                  />
                </FG>
                <FG label="Ac. Unit">
                  <KbSelect
                    className={SEL}
                    value={form.ac_unit}
                    onChange={(v) => setForm((f) => ({ ...f, ac_unit: v }))}
                    formContainerRef={formContainerRef}
                    options={[
                      { value: "", label: "No." },
                      ...AC_UNITS.map((u) => ({ value: u, label: u })),
                    ]}
                  />
                </FG>

                <FG label="Supplier" span={2}>
                  <KbSelect
                    className={SEL}
                    value={form.supplier_id}
                    onChange={(v) => setForm((f) => ({ ...f, supplier_id: v }))}
                    formContainerRef={formContainerRef}
                    options={[
                      { value: "", label: "General" },
                      ...suppliers.map((s) => ({
                        value: String(s.id),
                        label: s.name,
                      })),
                    ]}
                  />
                </FG>

                <FG label="Product Name" span={2}>
                  <input
                    className={INP}
                    value={form.name}
                    onChange={sf("name")}
                    placeholder="Product name *"
                  />
                </FG>

                <FG label="Formula" span={2}>
                  <input
                    className={INP}
                    value={form.formula}
                    onChange={sf("formula")}
                  />
                </FG>

                <FG label="Units in Pack">
                  <input
                    className={INP}
                    type="number"
                    min="1"
                    value={form.pack_size}
                    onChange={sf("pack_size")}
                    onWheel={preventWheel}
                  />
                </FG>
                <FG label="Pack Sale Price">
                  <input
                    className={INP}
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.pack_sale_price}
                    onChange={sf("pack_sale_price")}
                    onWheel={preventWheel}
                  />
                </FG>

                <FG label="Sale Price (auto)">
                  <input
                    className={INP}
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.selling_price}
                    onChange={sf("selling_price")}
                    onWheel={preventWheel}
                    style={{ background: "#efffef" }}
                    title="Auto-calculated from Pack Sale Price ÷ Units in Pack. Can be overridden."
                  />
                </FG>
                <FG label="Purchase %">
                  <input
                    className={INP}
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.purchase_percent}
                    onChange={sf("purchase_percent")}
                    onWheel={preventWheel}
                  />
                </FG>

                <FG label="Pur. Price">
                  <input
                    className={INP}
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.purchase_price}
                    onChange={sf("purchase_price")}
                    onWheel={preventWheel}
                  />
                </FG>
                <FG label="Opening Qty">
                  <input
                    className={INP}
                    type="number"
                    min="0"
                    value={form.opening_qty}
                    onChange={sf("opening_qty")}
                    onWheel={preventWheel}
                  />
                </FG>

                <FG label="Group">
                  <KbSelect
                    className={SEL}
                    value={form.category}
                    onChange={(v) => setForm((f) => ({ ...f, category: v }))}
                    formContainerRef={formContainerRef}
                    options={[
                      { value: "", label: "General" },
                      ...CATEGORIES.map((c) => ({ value: c, label: c })),
                    ]}
                  />
                </FG>
                <FG label="Min Level">
                  <input
                    className={INP}
                    type="number"
                    min="0"
                    value={form.min_level}
                    onChange={sf("min_level")}
                    onWheel={preventWheel}
                  />
                </FG>

                <FG label="Brand">
                  <input
                    className={INP}
                    value={form.brand}
                    onChange={sf("brand")}
                  />
                </FG>
                <FG label="BarCode">
                  <input
                    className={INP}
                    value={form.barcode}
                    onChange={sf("barcode")}
                  />
                </FG>

                <FG label="Batch No">
                  <input
                    className={INP}
                    value={form.batch_no}
                    onChange={sf("batch_no")}
                  />
                </FG>
                <FG label="Def. Discount">
                  <div>
                    <input
                      className={INP}
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.def_discount}
                      onChange={sf("def_discount")}
                      onWheel={preventWheel}
                    />
                  </div>
                </FG>

                <FG label="Expiry Date">
                  <input
                    className={INP}
                    type="date"
                    value={form.expiry_date}
                    onChange={sf("expiry_date")}
                  />
                </FG>
                <FG label="Shelf">
                  <input
                    className={INP}
                    value={form.shelf}
                    onChange={sf("shelf")}
                  />
                </FG>

                {/* Active + GST row */}
                <FG label="" span={2}>
                  <div className="flex items-center gap-6 py-0.5">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.active}
                        onChange={sc("active")}
                        className="w-4 h-4"
                      />
                      <span style={{ fontSize: 13, color: "#111", fontWeight: 700 }}>Active</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Number(form.gst_percentage) > 0}
                        onChange={(e) =>
                          setForm((v) => {
                            const newGst = e.target.checked ? "17" : "";
                            const updated = { ...v, gst_percentage: newGst };
                            // GST is just a flag — no capping of def_discount here
                            setDiscountWarning("");
                            const psp = Number(v.pack_sale_price) || 0;
                            const ps = Number(v.pack_size) || 1;
                            const pPerc = Number(v.purchase_percent) || 0;
                            if (psp > 0 && ps > 0 && (v.purchase_price === "" || Number(v.purchase_price) === 0)) {
                              const perPackPurchase = psp * (1 - (pPerc || 0) / 100);
                              updated.purchase_price = (perPackPurchase / ps).toFixed(2);
                            }
                            return updated;
                          })
                        }
                        className="w-4 h-4"
                      />
                      <span style={{ fontSize: 13, color: "#111", fontWeight: 700 }}>GST</span>
                    </label>
                  </div>
                </FG>
              </div>

              {/* Save button */}
              <button
                data-save
                onClick={handleSave}
                disabled={saving}
                className="w-full font-black border-0 disabled:opacity-50 mt-1 shrink-0 tracking-widest uppercase"
                style={{
                  height: "clamp(26px,3vh,32px)",
                  background: "#1a3f8f",
                  color: "#fff",
                  fontSize: "clamp(10px,1.1vw,13px)",
                  letterSpacing: "0.06em",
                  boxShadow: "0 2px 6px rgba(26,63,143,0.4)",
                }}
              >
                {saving
                  ? "Saving..."
                  : editProduct
                    ? "✔  Update Product"
                    : "✔  Save Product"}
              </button>

              {/* From / To Date filter — filters the product table */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "clamp(2px,0.3vw,4px)",
                  marginTop: 4,
                }}
              >
                <FG label="From Date">
                  <input
                    className={INP}
                    type="date"
                    value={filterFrom}
                    onChange={(e) => setFilterFrom(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                      }
                    }}
                    data-skip-enter="true"
                  />
                </FG>
                <FG label="To Date">
                  <input
                    className={INP}
                    type="date"
                    value={filterTo}
                    onChange={(e) => setFilterTo(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        setFilterTo(e.target.value);
                      }
                    }}
                    data-skip-enter="true"
                  />
                </FG>
              </div>
              {(filterFrom || filterTo) && (
                <button
                  onClick={() => {
                    setFilterFrom("");
                    setFilterTo("");
                  }}
                  style={{
                    marginTop: 2,
                    fontSize: 10,
                    color: "#555",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  Clear date filter
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── CENTER TABLE ── */}
        <div
          className="flex-1 flex flex-col overflow-hidden border border-gray-500"
          style={{ background: "#fff", minWidth: 0 }}
        >
          <div className="overflow-auto flex-1 min-h-0">
            {loading ? (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                Loading...
              </div>
            ) : (
              <table
                className="w-full border-collapse"
                style={{
                  fontSize: "clamp(10px,1vw,12px)",
                  tableLayout: "fixed",
                }}
              >
                <colgroup>
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "22%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "9%" }} />
                  <col style={{ width: "9%" }} />
                  <col style={{ width: "7%" }} />
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "7%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "8%" }} />
                </colgroup>
                <thead className="sticky top-0 z-10">
                  <tr
                    style={{
                      background: "#d4aa40",
                      borderBottom: "2px solid #b8921c",
                    }}
                  >
                    {[
                      "ProductID",
                      "Product Name",
                      "PurPrice Avg",
                      "SalePrice",
                      "Opening",
                      "Min",
                      "Shelf",
                      "IsGST",
                      "Active",
                      "X",
                    ].map((h, i) => (
                      <th
                        key={h}
                        className={`py-1 px-1 font-bold border border-amber-600 text-center`}
                        style={{
                          fontSize: "clamp(9px,0.9vw,11px)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={10}
                        className="text-center py-10 text-gray-400"
                      >
                        No products found
                      </td>
                    </tr>
                  ) : (
                    filtered.map((p, i) => {
                      const sel = editProduct?.id === p.id;
                      return (
                        <tr
                          key={p.id}
                          onClick={() => isAdminOrManager && selectProduct(p)}
                          style={{
                            background: sel
                              ? "#cce0ff"
                              : i % 2 === 0
                                ? "#fff"
                                : "#f7f3e8",
                            cursor: "pointer",
                            height: 26,
                          }}
                        >
                          <td className="px-1 py-0.5 text-center border border-gray-300 font-bold">
                            {p.id}
                          </td>
                          <td className="px-1 py-0.5 border border-gray-300 truncate">
                            {p.name}
                          </td>
                          <td className="px-1 py-0.5 text-center border border-gray-300">
                            {Number(p.purchase_price || 0).toFixed(2)}
                          </td>
                          <td className="px-1 py-0.5 text-center border border-gray-300 font-bold">
                            {Number(p.selling_price || 0).toFixed(0)}
                          </td>
                          <td className="px-1 py-0.5 text-center border border-gray-300">
                            {p.opening_qty ?? 0}
                          </td>
                          <td className="px-1 py-0.5 text-center border border-gray-300">
                            {p.min_level ?? 0}
                          </td>
                          <td className="px-1 py-0.5 text-center border border-gray-300 truncate">
                            {p.shelf || ""}
                          </td>
                          <td className="px-2 py-0.5 text-center border border-gray-300">
                            <input
                              type="checkbox"
                              checked={Number(p.gst_percentage) > 0}
                              readOnly
                              className="w-3.5 h-3.5 accent-blue-600 pointer-events-none"
                            />
                          </td>
                          <td className="px-2 py-0.5 text-center border border-gray-300">
                            <div className="flex items-center justify-center gap-1">
                              <div
                                style={{
                                  width: 8,
                                  height: 16,
                                  background:
                                    p.active !== false ? "#22c55e" : "#ef4444",
                                  borderRadius: 2,
                                }}
                              />
                              <input
                                type="checkbox"
                                checked={p.active !== false}
                                readOnly
                                className="w-3.5 h-3.5 accent-blue-600 pointer-events-none"
                              />
                            </div>
                          </td>
                          <td
                            className="px-1 py-0.5 text-center border border-gray-300"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isAdmin) setDeleteConfirm(p.id);
                            }}
                          >
                            {isAdmin && (
                              <button
                                className="w-5 h-5 text-white font-black text-[10px] rounded"
                                style={{ background: "#e53e3e" }}
                                title="Delete"
                              >
                                X
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Table footer */}
          <div
            className="shrink-0 flex items-center px-2 py-1 border-t border-gray-400"
            style={{
              background: "#d4aa40",
              fontSize: "clamp(10px,1vw,12px)",
              fontWeight: 600,
            }}
          >
            <span className="text-gray-900 whitespace-nowrap">
              Stock in Hand&nbsp;
              <span className="inline-block border border-gray-600 bg-white px-1.5 font-bold text-gray-900">
                {stockInHand}
              </span>
            </span>
            <span className="flex-1 text-center text-[11px] text-amber-900 font-medium hidden xl:block">
              Double Click Product Name to View Product Ledger
            </span>
            <span className="text-gray-900 ml-auto whitespace-nowrap">
              Total Records&nbsp;
              <span className="inline-block border border-gray-600 bg-white px-1.5 font-bold text-gray-900">
                {filtered.length}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* ══════ BOTTOM BAR ══════ */}
      <div
        className="shrink-0 flex items-center gap-2 px-3 py-1.5 border-t border-gray-500"
        style={{ background: "#e8e8e8" }}
      >
        <button
          className="h-[34px] px-4 text-[13px] font-bold border-2 border-gray-500 rounded whitespace-nowrap"
          style={{ background: "#d0d0d0" }}
        >
          F1
        </button>
        <button
          className="h-[34px] px-4 text-[13px] font-bold border-2 border-gray-500 rounded whitespace-nowrap"
          style={{ background: "#d0d0d0" }}
        >
          Print BarCode 1x1
        </button>
        <button
          onClick={onBack}
          className="h-[34px] px-5 text-[13px] font-bold border-2 border-red-500 rounded whitespace-nowrap"
          style={{ background: "#ffd0d0", color: "#990000" }}
        >
          Exit
        </button>
        {isAdminOrManager && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="h-[34px] px-5 text-[13px] font-bold border-2 border-blue-600 rounded disabled:opacity-50 whitespace-nowrap"
            style={{ background: "#1a3f8f", color: "#fff" }}
          >
            {saving ? "Saving..." : "Update"}
          </button>
        )}
        {editProduct && (
          <span className="ml-2 text-[13px] font-semibold text-gray-700 truncate min-w-0">
            Editing: #{editProduct.id} — {editProduct.name}
          </span>
        )}
      </div>

      {/* ══════ DELETE CONFIRM ══════ */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
          <div className="bg-white border-2 border-gray-400 shadow-2xl w-72 p-5 text-center rounded">
            <h2 className="text-[14px] font-bold text-gray-800 mb-1">
              Delete Product?
            </h2>
            <p className="text-gray-500 text-[12px] mb-4">
              This cannot be undone.
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-1.5 border border-gray-400 text-[12px] font-bold rounded"
                style={{ background: "#e8e8e8" }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-1.5 text-white text-[12px] font-bold rounded"
                style={{ background: "#cc2222" }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
