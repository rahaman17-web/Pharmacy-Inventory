import { useState, useRef, useEffect } from "react";
import AutoComplete from "./Autocomplete.jsx";
import Receipt from "./Receipt.jsx";

const SALE_DRAFT_KEY = "sale_invoice_draft";
const EMPTY_ROW = () => ({ product_id: null, item: "", qty: "", price: 0, pack_price: 0, pack_size: 1, available_stock: 0 });
const makeRows = (n = 10) => Array.from({ length: n }, EMPTY_ROW);

export default function SaleInvoice({ onBack }) {
  const [items, setItems] = useState(makeRows(10));
  const [discount, setDiscount] = useState("");
  const [lastSaleId, setLastSaleId] = useState(null);
  const [receiptAutoPrint, setReceiptAutoPrint] = useState(false);
  const [invoiceNo, setInvoiceNo] = useState("");
  const [availableMedicines, setAvailableMedicines] = useState([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [stockData, setStockData] = useState({});
  const [customerName, setCustomerName] = useState('');
  const [tempName, setTempName] = useState('');
  const [invDate, setInvDate] = useState(new Date().toISOString().split('T')[0]);
  const [received, setReceived] = useState('');
  const [billDiscRs, setBillDiscRs] = useState('');
  const [stockAlert, setStockAlert] = useState(null); // { name, qty, index }
  const stockAlertTimerRef = useRef(null);

  const dismissStockAlert = (rowIndex) => {
    clearTimeout(stockAlertTimerRef.current);
    setStockAlert(null);
    setTimeout(() => itemRefs.current[rowIndex]?.reset(), 60);
  };

  const hasHydratedDraftRef = useRef(false);

  const itemRefs = useRef([]);
  const qtyRefs = useRef([]);
  const priceRefs = useRef([]);
  const discountRef = useRef(null);
  const completeSaleRef = useRef(null);
  const clearFormRef = useRef(null);
  const backRef = useRef(null);
  const modalSaveRef = useRef(null);
  const modalPrintRef = useRef(null);
  const modalCancelRef = useRef(null);
  const scanRef = useRef(null);
  const receivedRef = useRef(null);
  const billDiscRef = useRef(null);
  
  const [focusedButton, setFocusedButton] = useState(null); // 0=complete, 1=clear, 2=back
  const [modalFocus, setModalFocus] = useState(0); // 0=save, 1=print, 2=cancel

  // Restore unsaved draft on refresh/back
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SALE_DRAFT_KEY);
      if (!raw) {
        hasHydratedDraftRef.current = true;
        return;
      }
      const draft = JSON.parse(raw);
      if (draft && Array.isArray(draft.items) && draft.items.length) {
        const restored = draft.items;
        setItems(restored.length >= 10 ? restored : [...restored, ...makeRows(10 - restored.length)]);
      }
      if (draft && typeof draft.discount === "string") {
        setDiscount(draft.discount);
      }
    } catch (e) {
      // ignore draft errors
    } finally {
      hasHydratedDraftRef.current = true;
    }
  }, []);

  // Save draft (debounced)
  useEffect(() => {
    if (!hasHydratedDraftRef.current) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(
          SALE_DRAFT_KEY,
          JSON.stringify({
            items,
            discount,
          })
        );
      } catch (e) {}
    }, 500);
    return () => clearTimeout(t);
  }, [items, discount]);

  // Auto-expand: when every row has a product, add 5 more empty rows
  useEffect(() => {
    if (items.length > 0 && items.every(r => r.product_id)) {
      setItems(prev => [...prev, ...makeRows(5)]);
    }
  }, [items]);

  const addRowIfReady = (index, rows) => {
    const list = rows || items;
    const row = list[index];
    const complete = row && row.product_id && Number(row.qty) > 0 && Number(row.price) > 0;
    if (complete && index === list.length - 1) {
      addRow();
    }
  };

  function updateItem(index, field, value) {
    const updated = [...items];
    if (field === "product") {
      const prod = value || {};
      if (
        prod.id &&
        items.some((it, idx) => idx !== index && it.product_id === prod.id)
      ) {
        alert("This item is already in the list. If you need a different price, create a new product name/tag for that variant.");
        // Clear the duplicate selection
        updated[index].product_id = null;
        updated[index].item = "";
        updated[index].price = 0;
        updated[index].pack_price = 0;
        updated[index].pack_size = 1;
        updated[index].available_stock = 0;
        setItems(updated);
        // Refocus the autocomplete field
        setTimeout(() => itemRefs.current[index]?.focus(), 100);
        return;
      }
      
      // Check stock availability
      const availableStock = stockData[prod.id] || 0;
      if (prod.id && availableStock <= 0) {
        clearTimeout(stockAlertTimerRef.current);
        setStockAlert({ name: prod.name, qty: 0, index });
        // Auto-dismiss after 3.5s if user doesn't press Enter/Escape
        stockAlertTimerRef.current = setTimeout(() => dismissStockAlert(index), 3500);
        return;
      }
      
      updated[index].product_id = prod.id || null;
      updated[index].item = prod.name || (typeof value === "string" ? value : updated[index].item);
      updated[index].available_stock = availableStock;
      // Treat product selling_price as PER-UNIT selling price (works for tablets + surgical items)
      const unitPrice = Number(prod.selling_price ?? prod.mrp ?? 0) || 0;
      const packSize = Number(prod.pack_size) || 1;
      updated[index].pack_price = unitPrice;
      updated[index].pack_size = packSize;
      updated[index].price = Math.round(unitPrice * 100) / 100;
      addRowIfReady(index, updated);
    } else if (field === "qty") {
      const row = updated[index];
      const requestedQty = Number(value);
      
      // Check if quantity exceeds available stock
      if (row.product_id && requestedQty > row.available_stock) {
        alert(`âš ï¸ Insufficient stock for ${row.item}!\n\nRequested: ${requestedQty}\nAvailable: ${row.available_stock}\n\nPlease enter a quantity less than or equal to ${row.available_stock}.`);
        return;
      }
      
      updated[index][field] = value;
      addRowIfReady(index, updated);
    } else {
      updated[index][field] = value;
      if (field === "price") {
        addRowIfReady(index, updated);
      }
    }
    setItems(updated);
  }

  function addRow() {
    setItems(prev => [...prev, EMPTY_ROW()]);
  }

  // Remove a row by index — always keep at least 12 rows
  function removeRow(index) {
    const next = items.filter((_, i) => i !== index);
    setItems(next.length >= 10 ? next : [...next, ...makeRows(10 - next.length)]);
  }

  useEffect(() => {
    const loadMedicines = async () => {
      try {
        const api = (await import("../api")).default;
        // Next sequential invoice number (sale.id)
        try {
          const r = await api.get("/sales/next-invoice");
          setInvoiceNo(r.data?.invoice_no || "1");
        } catch (e) {
          setInvoiceNo("1");
        }

        const { data } = await api.get("/products");
        setAvailableMedicines(data || []);
        
        // Load stock data
        const { data: stockBatches } = await api.get("/stock");
        const stockMap = {};
        stockBatches.forEach(batch => {
          if (!stockMap[batch.product_id]) {
            stockMap[batch.product_id] = 0;
          }
          stockMap[batch.product_id] += batch.qty;
        });
        // Products added with opening_qty (not through a purchase invoice) have no
        // batch rows — fill them in from the product's opening_qty field.
        (data || []).forEach(p => {
          if (!stockMap[p.id] && Number(p.opening_qty) > 0) {
            stockMap[p.id] = Number(p.opening_qty);
          }
        });
        setStockData(stockMap);
      } catch (err) {
        console.error("Failed to load medicines:", err);
      }
    };
    loadMedicines();
  }, []);

  const refreshInvoiceNo = async () => {
    try {
      const api = (await import("../api")).default;
      const r = await api.get("/sales/next-invoice");
      setInvoiceNo(r.data?.invoice_no || "1");
    } catch (e) {
      // keep current
    }
  };

  useEffect(() => {
    if (items.length > 1) itemRefs.current[items.length - 1]?.focus();
  }, [items.length]);

  // Dismiss stock alert immediately on Enter or Escape
  useEffect(() => {
    if (!stockAlert) return;
    const handler = (e) => {
      if (e.key === "Enter" || e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        dismissStockAlert(stockAlert.index);
      }
    };
    window.addEventListener("keydown", handler, { capture: true });
    return () => window.removeEventListener("keydown", handler, { capture: true });
  }, [stockAlert]);

  const handleKeyDownGlobal = (e) => {
    if (e.key === "F1") {
      e.preventDefault();
      setItems(makeRows(10)); setDiscount(""); setBillDiscRs(""); setReceived(""); setCustomerName(""); setTempName("");
      try { localStorage.removeItem(SALE_DRAFT_KEY); } catch (_) {}
      setTimeout(() => itemRefs.current[0]?.focus(), 50);
    } else if (e.key === "F3") {
      e.preventDefault();
      // Close any open autocomplete dropdowns first
      itemRefs.current.forEach(r => r?.closeDropdown?.());
      discountRef.current?.focus();
      discountRef.current?.select();
    } else if (e.key === "F4") {
      e.preventDefault();
      handleSubmit();
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDownGlobal, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDownGlobal, { capture: true });
  }, [items, discount, availableMedicines]);

  // Auto-focus first item input on mount
  useEffect(() => {
    itemRefs.current[0]?.focus();
  }, []);

  const totalAmount = items.reduce((sum, row) => sum + Number(row.qty) * Number(row.price || 0), 0);

  // Discount limit (cap) based on role and GST presence. Users may choose any percent up to this cap.
  const storedUser = (() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch (e) { return null; }
  })();
  const role = storedUser?.role || 'user';
  const hasGstItemsForDisplay = items.some(item => {
    if (!item.product_id) return false;
    const product = availableMedicines.find(p => Number(p.id) === Number(item.product_id));
    return product && Number(product.gst_percentage) > 0;
  });
  const capPercent = role === 'admin' ? (hasGstItemsForDisplay ? 7 : 12) : (hasGstItemsForDisplay ? 5 : 10);
  const currentDiscountPercent = Number(discount || 0);
  const discountAmount = Number(((totalAmount * currentDiscountPercent) / 100).toFixed(2));
  const netTotal = Number((totalAmount - discountAmount).toFixed(2));
  const billDiscAmount = Number(billDiscRs) || 0;
  const netAfterBillDisc = Math.max(0, netTotal - billDiscAmount);
  const receivedAmount = Number(received) || 0;

  // If the cap changes (items added/removed or role changed), clamp current discount to cap
  useEffect(() => {
    try {
      const num = Number(discount || 0);
      if (num > capPercent) {
        setDiscount(String(capPercent));
      }
    } catch (e) {}
  }, [capPercent]);

  const handleSubmit = async () => {
    const discountPercent = Number(discount || 0);
    
    // Check if any item has GST
    const hasGstItems = items.some(item => {
      if (!item.product_id) return false;
      const product = availableMedicines.find(p => Number(p.id) === Number(item.product_id));
      return product && Number(product.gst_percentage) > 0;
    });
    
    // Admin: GST→7%, non-GST→12%. Other users: GST→5%, non-GST→10%
    const maxDiscount = role === 'admin' ? (hasGstItems ? 7 : 12) : (hasGstItems ? 5 : 10);
    if (discountPercent > maxDiscount) {
      alert(`Maximum discount allowed is ${maxDiscount}%${hasGstItems ? ' (GST item)' : ''}. Please reduce the discount to ${maxDiscount}% or less.`);
      return;
    }

    const payload = {
      items: items
        .filter((it) => it.product_id && it.qty > 0)
        .map((it) => ({ product_id: it.product_id, qty: Number(it.qty), unit_price: Number(it.price) })),
      discountPercent: discountPercent,
    };

    if (payload.items.length === 0) {
      alert("Please add at least one item");
      return;
    }

    // Show confirmation modal
    setShowConfirmation(true);
    setModalFocus(0);
    setTimeout(() => modalSaveRef.current?.focus(), 100);
  };

  const saveSale = async (shouldPrint) => {
    if (isSaving) return;
    setIsSaving(true);

    // Important: if user chose "Save Only", ensure receipt modal is never shown.
    if (shouldPrint !== true) {
      setReceiptAutoPrint(false);
      setLastSaleId(null);
    }

    try {
      const payload = {
        items: items
          .filter((it) => it.product_id && it.qty > 0)
          .map((it) => ({ product_id: it.product_id, qty: Number(it.qty), unit_price: Number(it.price) })),
        discountPercent: Number(discount || 0),
      };

      const api = (await import("../api")).default;
      const { data } = await api.post("/sales", payload);
      alert("Sale recorded successfully!");

      try {
        localStorage.removeItem(SALE_DRAFT_KEY);
      } catch (e) {}

      if (shouldPrint === true) {
        setReceiptAutoPrint(true);
        setLastSaleId(data.sale_id);
      } else {
        setReceiptAutoPrint(false);
        setLastSaleId(null);
      }
      setItems(makeRows(10));
      setDiscount("");
      setBillDiscRs("");
      setReceived("");
      setCustomerName("");
      setTempName("");
      setShowConfirmation(false);
      refreshInvoiceNo();
      
      // Refresh stock data after sale
      try {
        const apiModule = (await import("../api")).default;
        const { data: stockBatches } = await apiModule.get("/stock");
        const stockMap = {};
        stockBatches.forEach(batch => {
          if (!stockMap[batch.product_id]) {
            stockMap[batch.product_id] = 0;
          }
          stockMap[batch.product_id] += batch.qty;
        });
        setStockData(stockMap);
      } catch (err) {
        console.error("Failed to refresh stock data:", err);
      }
      
      // Printing is handled by the Receipt modal when user chose Print.
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || err.message || "Sale failed");
      setShowConfirmation(false);
    } finally {
      setIsSaving(false);
    }
  };

  const TBL_CELL = { width:"100%", height:"clamp(28px,2.8vh,36px)", border:"none", background:"transparent", outline:"none", fontSize:"clamp(13px,1.15vw,16px)", padding:"0 6px", textAlign:"center", color:"#111" };
  const HDR_INP  = { background:"#fff", border:"1px solid #555", fontSize:"clamp(13px,1.15vw,15px)", padding:"3px 7px", height:"clamp(26px,2.4vh,30px)", color:"#111" };

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden z-40"
      style={{ background:"#e8c840", fontFamily:"'Segoe UI',Tahoma,sans-serif" }}>

      {/* ══════ OUT-OF-STOCK TOAST ══════ */}
      {stockAlert && (
        <div onClick={() => dismissStockAlert(stockAlert.index)}
          style={{ position:"fixed", inset:0, zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.45)", backdropFilter:"blur(3px)", animation:"fadeIn 0.18s ease", cursor:"pointer" }}>
          <div style={{ background:"#fff", borderRadius:16, boxShadow:"0 24px 64px rgba(0,0,0,0.28)", width:380, overflow:"hidden", animation:"popUp 0.22s cubic-bezier(.34,1.56,.64,1)" }}>
            {/* Red accent bar */}
            <div style={{ background:"linear-gradient(90deg,#c53030,#e53e3e)", height:5 }}/>
            <div style={{ padding:"28px 28px 24px", textAlign:"center" }}>
              {/* Icon circle */}
              <div style={{ width:64, height:64, borderRadius:"50%", background:"#fff5f5", border:"2.5px solid #fc8181", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px", fontSize:28 }}>
                🚫
              </div>
              <div style={{ fontWeight:900, fontSize:18, color:"#c53030", letterSpacing:0.3, marginBottom:8 }}>Out of Stock</div>
              <div style={{ fontWeight:700, fontSize:15, color:"#1a202c", marginBottom:6 }}>{stockAlert.name}</div>
              <div style={{ fontSize:13, color:"#718096", lineHeight:1.6 }}>
                This item currently has <span style={{ fontWeight:800, color:"#e53e3e" }}>0 units</span> available.<br/>Please choose a different product.
              </div>
              <div style={{ marginTop:14, fontSize:11, color:"#a0aec0", letterSpacing:0.3 }}>Press Enter or click anywhere to continue</div>
            </div>
            {/* Progress bar — drains over 3.5s */}
            <div style={{ height:4, background:"#fed7d7" }}>
              <div style={{ height:"100%", background:"#e53e3e", animation:"drain 3.5s linear forwards", transformOrigin:"left" }}/>
            </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes popUp{from{opacity:0;transform:scale(0.88)}to{opacity:1;transform:scale(1)}}
        @keyframes drain{from{width:100%}to{width:0%}}
      `}</style>

      {/* ══════ TITLE BAR ══════ */}
      <div className="shrink-0 text-center font-black"
        style={{ background:"#e8c840", color:"#111", fontSize:"clamp(22px,2.6vw,36px)", letterSpacing:4, padding:"4px 0 2px" }}>
        ZAM ZAM PHARMACY
      </div>

      {/* ══════ HEADER: Customer info (dark green bar) ══════ */}
      <div className="shrink-0 flex items-center gap-2 px-3 py-1"
        style={{ background:"#1a5c1a", color:"#fff" }}>
        <button style={{ background:"#e0e0e0", color:"#111", border:"1px solid #555", fontWeight:700, fontSize:"clamp(13px,1.15vw,15px)", padding:"3px 12px", cursor:"pointer", whiteSpace:"nowrap" }}>
          New Customer
        </button>
        <span style={{ fontWeight:700, fontSize:"clamp(13px,1.15vw,15px)", whiteSpace:"nowrap" }}>ID</span>
        <input readOnly value="1"
          style={{ width:44, background:"#d8d8d8", border:"1px solid #777", textAlign:"center", fontSize:"clamp(13px,1.15vw,15px)", padding:"2px 3px", color:"#111" }}/>
        <span style={{ fontWeight:700, fontSize:"clamp(13px,1.15vw,15px)", whiteSpace:"nowrap" }}>Customer</span>
        <input value={customerName} onChange={e=>setCustomerName(e.target.value)}
          style={{ width:"clamp(120px,14vw,240px)", ...HDR_INP, color:"#111" }}/>
        <span style={{ fontWeight:700, fontSize:"clamp(13px,1.15vw,15px)", whiteSpace:"nowrap" }}>Temporary Name</span>
        <input value={tempName} onChange={e=>setTempName(e.target.value)}
          style={{ width:"clamp(100px,11vw,190px)", ...HDR_INP, color:"#111" }}/>
        <span style={{ fontWeight:700, fontSize:"clamp(13px,1.15vw,15px)", whiteSpace:"nowrap" }}>Inv. Date</span>
        <input type="date" value={invDate} onChange={e=>setInvDate(e.target.value)}
          style={{ ...HDR_INP, color:"#111", width:"clamp(110px,9vw,140px)" }}/>
        <span style={{ marginLeft:"auto", fontWeight:900, fontSize:"clamp(14px,1.3vw,18px)", letterSpacing:1, whiteSpace:"nowrap" }}>
          {storedUser?.name || storedUser?.username || "USER"}
        </span>
      </div>

      {/* ══════ SCAN ROW ══════ */}
      <div className="shrink-0 flex items-start gap-3 px-3 pt-2 pb-1"
        style={{ background:"#e8c840" }}>

        {/* Left: New Sale + F1 + Page Up/Down */}
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:0, minWidth:80 }}>
          <button
            onClick={()=>{ setItems(makeRows(10)); setDiscount(""); setBillDiscRs(""); setReceived(""); setCustomerName(""); setTempName(""); setTimeout(()=>itemRefs.current[0]?.focus(),50); }}
            style={{ background:"#e0e0e0", border:"2px solid #888", fontWeight:900, fontSize:"clamp(13px,1.15vw,15px)", padding:"4px 14px", cursor:"pointer", whiteSpace:"nowrap" }}>
            New Sale
          </button>
          <span style={{ fontWeight:900, fontSize:"clamp(18px,1.8vw,24px)", lineHeight:1.1 }}>F1</span>
          <div style={{ fontSize:"clamp(11px,1vw,13px)", fontWeight:700, color:"#333", lineHeight:1.5, textAlign:"left", marginTop:2 }}>
            <div>Page Up: +</div>
            <div>Page Down: -</div>
          </div>
        </div>

        {/* Right: two sub-rows */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", gap:4 }}>
          {/* Row 1: Scan/Search label + input + Inv.No + Rs box */}
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ fontWeight:700, fontSize:"clamp(13px,1.15vw,15px)", whiteSpace:"nowrap" }}>Scan / Search Product</span>
            <input ref={scanRef}
              onKeyDown={e=>{ if(e.key==="Enter"){ e.preventDefault(); const q=e.target.value.trim(); if(q){ const found=availableMedicines.find(m=>String(m.barcode||"")===q||m.name.toLowerCase().includes(q.toLowerCase())); if(found){ const emptyIdx=items.findIndex(r=>!r.product_id); const idx=emptyIdx>=0?emptyIdx:items.length; const newItems=[...items]; if(idx===newItems.length) newItems.push(EMPTY_ROW()); const stock=stockData[found.id]||0; newItems[idx]={...newItems[idx],product_id:found.id,item:found.name,price:Number(found.selling_price||0),pack_size:Number(found.pack_size)||1,available_stock:stock}; setItems(newItems); e.target.value=""; } else alert("Product not found"); } } }}
              style={{ flex:1, background:"#fff", border:"1px solid #777", padding:"3px 8px", fontSize:"clamp(13px,1.15vw,15px)", height:"clamp(28px,2.6vh,34px)" }} placeholder=""
            />
            <span style={{ fontWeight:700, fontSize:"clamp(13px,1.15vw,15px)", whiteSpace:"nowrap" }}>Inv. No.</span>
            <input readOnly value={invoiceNo}
              style={{ width:"clamp(70px,6vw,100px)", background:"#e0e0e0", border:"1px solid #777", textAlign:"center", fontWeight:900, fontSize:"clamp(14px,1.25vw,16px)", padding:"2px 4px", height:"clamp(28px,2.6vh,34px)", color:"#111" }}/>
            {/* Rs box — blue, large */}
            <div style={{ background:"#0a1ebf", color:"#fff", display:"flex", alignItems:"center", gap:6, padding:"2px 18px 2px 12px", minWidth:"clamp(150px,15vw,210px)", height:"clamp(38px,3.8vh,52px)" }}>
              <span style={{ fontWeight:900, fontSize:"clamp(18px,1.8vw,24px)", color:"#ff3333" }}>Rs.</span>
              <span style={{ fontWeight:900, fontSize:"clamp(22px,2.4vw,32px)" }}>{netAfterBillDisc.toFixed(2)}</span>
            </div>
          </div>
          {/* Row 2: Stock in Hand */}
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ fontWeight:700, fontSize:"clamp(13px,1.15vw,15px)", whiteSpace:"nowrap" }}>Stock in Hand</span>
            <input readOnly
              value={(() => { const f=items.find(r=>r.product_id); return f?(stockData[f.product_id]??""):""; })()}
              style={{ width:"clamp(70px,6vw,110px)", background:"#fff", border:"1px solid #777", textAlign:"center", fontSize:"clamp(13px,1.15vw,15px)", padding:"2px 4px", color:"#111" }}/>
          </div>
        </div>
      </div>

      {/* ══════ TABLE PANEL (bordered box on yellow background) ══════ */}
      <div className="flex-1 min-h-0 flex flex-col px-3 pb-1" style={{ background:"#e8c840" }}>
        {/* The panel that contains the table + total row */}
        <div style={{ flex:1, minHeight:0, display:"flex", flexDirection:"column", border:"2px solid #444", background:"#fff" }}>

          {/* Scrollable table + X column */}
          <div style={{ flex:1, minHeight:0, display:"flex" }}>
            {/* Scrollable table */}
            <div style={{ flex:1, minWidth:0, overflowX:"auto", overflowY:"auto" }}>
              <table className="w-full border-collapse" style={{ fontSize:"clamp(13px,1.15vw,15px)", tableLayout:"fixed", minWidth:640 }}>
                <colgroup>
                  <col style={{width:"8%"}}/>
                  <col style={{width:"38%"}}/>
                  <col style={{width:"7%"}}/>
                  <col style={{width:"13%"}}/>
                  <col style={{width:"13%"}}/>
                  <col style={{width:"21%"}}/>
                </colgroup>
                <thead className="sticky top-0 z-10">
                  <tr style={{ background:"#1a3a1a", borderBottom:"2px solid #111" }}>
                    {["ProductID","Product Name","Qty","Sale Price","Gross","Net Amount"].map(h=>(
                      <th key={h} style={{ padding:"5px 6px", border:"1px solid #333", textAlign:"center", fontWeight:700, fontSize:"clamp(13px,1.15vw,15px)", whiteSpace:"nowrap", color:"#fff" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((row, i) => {
                    const gross = Number(row.qty) * Number(row.price || 0);
                    const rowBg = i % 2 === 0 ? "#ffffff" : "#eef4ee";
                    return (
                      <tr key={i} style={{ background:rowBg, height:"clamp(28px,2.8vh,36px)", borderBottom:"1px solid #555" }}>
                        <td style={{ padding:"0 4px", border:"1px solid #555", textAlign:"center", color:"#333", fontSize:"clamp(13px,1.1vw,15px)", fontWeight:600 }}>
                          {row.product_id || ""}
                        </td>
                        <td style={{ padding:0, border:"1px solid #555" }}
                          onFocusCapture={(e) => {
                            const firstEmpty = items.findIndex(r => !r.product_id);
                            if (firstEmpty >= 0 && firstEmpty < i) {
                              e.target.blur();
                              setTimeout(() => itemRefs.current[firstEmpty]?.focus(), 0);
                            }
                          }}>
                          <AutoComplete
                            value={{ id: row.product_id, name: row.item }}
                            ref={(el) => (itemRefs.current[i] = el)}
                            onSelect={(val) => updateItem(i, "product", val)}
                            onEnter={() => qtyRefs.current[i]?.focus()}
                            allItems={availableMedicines}
                            allowCreate={false}
                            fullScreenList={true}
                            stockData={stockData}
                            placeholder=""
                            inputStyle={{ ...TBL_CELL, textAlign:"left", padding:"0 6px" }}
                          />
                        </td>
                        <td style={{ padding:0, border:"1px solid #555" }}>
                          <input ref={(el)=>(qtyRefs.current[i]=el)} type="number" min={1} value={row.qty}
                            onChange={e=>updateItem(i,"qty",e.target.value)}
                            onKeyDown={e=>{ if(e.key==="Enter"){ e.preventDefault(); if(!row.qty || Number(row.qty)<=0){ e.target.select(); return; } const next=i+1; if(next<items.length){ itemRefs.current[next]?.openDropdown(); } else { setItems(p=>[...p,EMPTY_ROW()]); setTimeout(()=>itemRefs.current[items.length]?.openDropdown(),80); } } }}
                            style={TBL_CELL}/>
                        </td>
                        <td style={{ padding:"0 6px", border:"1px solid #555", textAlign:"right", fontSize:"clamp(13px,1.1vw,15px)", color:"#111" }}>
                          {row.product_id ? Number(row.price).toFixed(2) : ""}
                        </td>
                        <td style={{ padding:"0 6px", border:"1px solid #555", textAlign:"right", fontWeight:700, fontSize:"clamp(13px,1.1vw,15px)", color:"#1a6b1a" }}>
                          {row.product_id && row.qty>0 ? gross.toFixed(2) : ""}
                        </td>
                        <td style={{ padding:"0 6px", border:"1px solid #555", textAlign:"right", fontWeight:700, fontSize:"clamp(13px,1.1vw,15px)", color:"#1a6b1a" }}>
                          {row.product_id && row.qty>0 ? gross.toFixed(2) : ""}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* X delete column — fixed outside scroll */}
            <div className="shrink-0 flex flex-col" style={{ width:28, background:"#d0d0d0", borderLeft:"2px solid #555" }}>
              <div style={{ height:"clamp(28px,2.8vh,36px)", background:"#1a3a1a", borderBottom:"2px solid #111", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:700, color:"#fff" }}>✕</div>
              {items.map((row,i)=>(
                <div key={i} style={{ height:"clamp(28px,2.8vh,36px)", display:"flex", alignItems:"center", justifyContent:"center", borderBottom:"1px solid #555", background: i%2===0?"#fff":"#eef4ee" }}>
                  {items.length>1 && (
                    <button onClick={()=>removeRow(i)}
                      style={{ width:20, height:20, background:"#c0392b", color:"#fff", fontSize:11, fontWeight:900, border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", borderRadius:2 }}>✕</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── Total + Line Discount row — inside the panel ── */}
          <div style={{ display:"flex", alignItems:"center", padding:"5px 10px", borderTop:"2px solid #444", background:"#e8f0e8", flexShrink:0 }}>
            <span style={{ fontWeight:900, fontSize:"clamp(14px,1.3vw,17px)", marginRight:8, color:"#111" }}>Total</span>
            <span style={{ fontWeight:900, fontSize:"clamp(15px,1.4vw,18px)", color:"#1a6b1a" }}>{totalAmount.toFixed(2)}</span>
            <span style={{ marginLeft:"auto", fontWeight:700, fontSize:"clamp(13px,1.2vw,15px)", color:"#444", marginRight:32 }}>
              Line Discount
            </span>
          </div>
        </div>
      </div>

      {/* ══════ BOTTOM BAR ══════ */}
      <div className="shrink-0 flex items-stretch"
        style={{ background:"#e8c840", borderTop:"1px solid #b89800", minHeight:"clamp(70px,8vh,100px)" }}>

        {/* Save/Print + Exit + F4 */}
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"4px 24px", gap:2 }}>
          <div style={{ display:"flex", gap:8 }}>
            <button ref={completeSaleRef} onClick={handleSubmit}
              style={{ background:"#e0e0e0", border:"2px solid #888", fontWeight:900, fontSize:"clamp(13px,1.2vw,16px)", padding:"5px 22px", cursor:"pointer", whiteSpace:"nowrap" }}>
              Save/Print
            </button>
            <button ref={backRef} onClick={onBack}
              style={{ background:"#e0e0e0", border:"2px solid #888", fontWeight:700, fontSize:"clamp(13px,1.2vw,16px)", padding:"5px 22px", cursor:"pointer" }}>
              Exit
            </button>
          </div>
          <span style={{ fontWeight:900, fontSize:"clamp(16px,1.6vw,22px)" }}>F4</span>
        </div>

        {/* Payment fields — right side, vertical stack */}
        <div style={{ marginLeft:"auto", display:"flex", flexDirection:"column", justifyContent:"center", gap:2, padding:"4px 16px 4px 0" }}>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ width:"clamp(90px,9vw,120px)", textAlign:"right", fontWeight:700, fontSize:"clamp(13px,1.15vw,15px)", whiteSpace:"nowrap" }}>Amount:</span>
            <input readOnly value={totalAmount.toFixed(2)}
              style={{ width:"clamp(110px,10vw,155px)", background:"#d8e8ff", border:"1px solid #888", textAlign:"right", padding:"2px 8px", fontSize:"clamp(13px,1.15vw,15px)", fontWeight:700, color:"#111" }}/>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ width:"clamp(90px,9vw,120px)", textAlign:"right", fontWeight:700, fontSize:"clamp(13px,1.15vw,15px)", whiteSpace:"nowrap" }}>%</span>
            <input ref={discountRef} type="number" min={0} max={capPercent} step="0.1" value={discount}
              onChange={e=>{ const v=e.target.value; if(v===''){setDiscount('');return;} const n=Number(v); if(n>capPercent){setDiscount(String(capPercent));return;} setDiscount(String(n)); }}
              onKeyDown={e=>{ if(e.key==='Enter'){ e.preventDefault(); const net=(totalAmount - (totalAmount*(Number(discount||0)/100))).toFixed(2); setReceived(net); setTimeout(()=>{ receivedRef.current?.focus(); receivedRef.current?.select(); },50); } }}
              style={{ width:"clamp(110px,10vw,155px)", background:"#fff", border:"1px solid #888", textAlign:"right", padding:"2px 8px", fontSize:"clamp(13px,1.15vw,15px)", color:"#111" }}/>
            <span style={{ fontWeight:900, fontSize:"clamp(14px,1.3vw,17px)" }}>F3</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ width:"clamp(90px,9vw,120px)", textAlign:"right", fontWeight:700, fontSize:"clamp(13px,1.15vw,15px)", whiteSpace:"nowrap" }}>Bill Disc Rs:</span>
            <input readOnly value={discount && Number(discount) > 0 ? discountAmount.toFixed(2) : ""}
              style={{ width:"clamp(110px,10vw,155px)", background:"#e8f0e8", border:"1px solid #888", textAlign:"right", padding:"2px 8px", fontSize:"clamp(13px,1.15vw,15px)", fontWeight:700, color:"#1a6b1a" }}/>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ width:"clamp(90px,9vw,120px)", textAlign:"right", fontWeight:700, fontSize:"clamp(13px,1.15vw,15px)", whiteSpace:"nowrap" }}>Received</span>
            <input ref={receivedRef} type="number" min={0} value={received} onChange={e=>setReceived(e.target.value)}
              style={{ width:"clamp(110px,10vw,155px)", background:"#fff", border:"1px solid #888", textAlign:"right", padding:"2px 8px", fontSize:"clamp(13px,1.15vw,15px)", color:"#111" }}/>
          </div>
        </div>
      </div>

      {/* ══════ CONFIRM MODAL ══════ */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onKeyDown={e=>{ if(e.key==='Escape'){e.preventDefault();setShowConfirmation(false);} else if(e.key==='ArrowDown'||e.key==='Tab'){e.preventDefault();const nf=modalFocus<2?modalFocus+1:0;setModalFocus(nf);[modalSaveRef,modalPrintRef,modalCancelRef][nf]?.current?.focus();} else if(e.key==='ArrowUp'){e.preventDefault();const nf=modalFocus>0?modalFocus-1:2;setModalFocus(nf);[modalSaveRef,modalPrintRef,modalCancelRef][nf]?.current?.focus();} }}>
          <div className="bg-white rounded-lg shadow-xl p-6 w-80 text-center border-2 border-gray-400">
            <h2 className="text-[16px] font-black mb-4">Save Invoice?</h2>
            <div className="flex flex-col gap-2">
              <button ref={modalSaveRef} type="button" onClick={()=>saveSale(false)} onFocus={()=>setModalFocus(0)} onKeyDown={e=>e.key==='Enter'&&saveSale(false)} disabled={isSaving}
                className={`py-2 bg-green-600 text-white font-bold rounded ${modalFocus===0?'ring-2 ring-green-400':''}`}>
                {isSaving?'Saving...':'✓ Save Only'}
              </button>
              <button ref={modalPrintRef} type="button" onClick={()=>saveSale(true)} onFocus={()=>setModalFocus(1)} onKeyDown={e=>e.key==='Enter'&&saveSale(true)} disabled={isSaving}
                className={`py-2 bg-blue-600 text-white font-bold rounded ${modalFocus===1?'ring-2 ring-blue-400':''}`}>
                {isSaving?'Saving...':'🖨️ Print Invoice'}
              </button>
              <button ref={modalCancelRef} type="button" onClick={()=>setShowConfirmation(false)} onFocus={()=>setModalFocus(2)} disabled={isSaving}
                className={`py-2 bg-gray-600 text-white font-bold rounded ${modalFocus===2?'ring-2 ring-gray-400':''}`}>
                ✕ Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {lastSaleId && (
        <Receipt
          saleId={lastSaleId}
          autoPrint={receiptAutoPrint}
          onClose={() => { setLastSaleId(null); setReceiptAutoPrint(false); }}
        />
      )}
    </div>
  );
}