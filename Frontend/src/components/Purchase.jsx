import React, { useState, useRef, useEffect } from "react";
import AutoComplete from "./Autocomplete.jsx";

const emptyRow = () => ({
  product_id: null,
  name: "",
  category: "",
  formula: "",
  batch: "",
  expiry: "",
  quantity: "",
  purchaseRate: "",
  gst: "",
  discount1: "",
  discount2: "",
  bonusQty: "",
  sellingPrice: "",
  pack_size: 1,
  pack_price: 0,
});

export default function Purchase({ onBack }) {
  const [supplier, setSupplier] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [receiveDate, setReceiveDate] = useState("");
  const [isTestingItem, setIsTestingItem] = useState(false);
  const [testingReturnDate, setTestingReturnDate] = useState("");
  const [medicines, setMedicines] = useState([]);
  const [includeBonusInCost, setIncludeBonusInCost] = useState(false);
  const [recentSuppliers, setRecentSuppliers] = useState([]);
  const [showInvoiceList, setShowInvoiceList] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [searchInvoice, setSearchInvoice] = useState("");
  const [invoiceList, setInvoiceList] = useState([]);
  const [barcode, setBarcode] = useState("");
  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [showInvoiceViewer, setShowInvoiceViewer] = useState(false);

  const itemRefs = useRef([]);
  const productNameRefs = useRef([]);
  const packRefs = useRef([]);
  const qtyRefs = useRef([]);
  const salePriceRefs = useRef([]);
  const disc1Refs = useRef([]);
  const disc2Refs = useRef([]);
  const gstRefs = useRef([]);
  const purPriceRefs = useRef([]);
  const batchRefs = useRef([]);
  const bonusRefs = useRef([]);
  const expiryRefs = useRef([]);
  
  const invDateRef = useRef(null);
  const invNoRef = useRef(null);
  const receiveDateRef = useRef(null);
  const supplierRef = useRef(null);
  const barcodeRef = useRef(null);

  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  // Set default dates on component mount
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    if (!purchaseDate) setPurchaseDate(today);
    if (!receiveDate) setReceiveDate(today);
  }, []);

  const removeRow = (index) => {
    setMedicines((prev) => prev.filter((_, i) => i !== index));
  };

  const validateRow = (r) => {
    const errs = {};
    if (!((typeof r.name === 'object' ? r.name?.name : r.name) || '').toString().trim() && !r.batch && !r.purchaseRate) {
      errs.name = 'Enter product name, batch or price';
    }
    return errs;
  };

  const searchInvoices = async (q) => {
    try {
      const api = (await import('../api')).default;
      const { data } = await api.get(`/purchases?q=${encodeURIComponent(q)}`);
      
      // Deduplicate invoices by invoice_no to prevent showing duplicates
      const uniqueInvoices = [];
      const seenInvoiceNos = new Set();
      
      if (Array.isArray(data)) {
        data.forEach(invoice => {
          const invoiceNo = invoice.invoice_no;
          if (!seenInvoiceNos.has(invoiceNo)) {
            seenInvoiceNos.add(invoiceNo);
            uniqueInvoices.push(invoice);
          }
        });
      }
      
      setInvoiceList(uniqueInvoices);
      setShowInvoiceList(true);
    } catch (e) {
      console.error('Search error:', e);
      setInvoiceList([]);
      setShowInvoiceList(false);
    }
  };

  const searchByBarcode = async () => {
    if (!barcode.trim()) return;
    try {
      const api = (await import('../api')).default;
      const { data } = await api.get(`/products?barcode=${encodeURIComponent(barcode)}`);
      if (data && data.length > 0) {
        const product = data[0];
        if (medicines.length === 0) {
          setMedicines([{
            ...emptyRow(),
            product_id: product.id,
            name: product.name,
            pack_size: product.pack_size || 1
          }]);
        }
      } else {
        alert('Product not found with this barcode');
      }
    } catch (error) {
      console.error('Barcode search error:', error);
      alert('Error searching by barcode');
    }
  };

  const viewInvoiceDetails = async (invoice) => {
    try {
      const api = (await import('../api')).default;
      const { data } = await api.get(`/purchases/invoice/${invoice.invoice_no}`);
      
      if (data && data.purchase) {
        setViewingInvoice({
          ...data.purchase,
          items: data.items || [],
          supplier_name: data.purchase.supplier_name || invoice.supplier_name
        });
        setShowInvoiceViewer(true);
        setShowInvoiceList(false);
      } else {
        alert('Invoice details not found');
      }
    } catch (error) {
      console.error('Error loading invoice details:', error);
      alert(`Error loading invoice: ${error.message}`);
    }
  };

  const reprintInvoice = async (invoice) => {
    try {
      const api = (await import('../api')).default;
      const { data } = await api.get(`/purchases/invoice/${invoice.invoice_no}`);
      
      if (data && data.purchase && data.items) {
        // Generate print data
        const printData = {
          invoice_no: data.purchase.invoice_no,
          purchase_date: data.purchase.purchase_date,
          supplier_name: data.purchase.supplier_name,
          items: data.items,
          total_amount: invoice.total_amount
        };
        
        // Here you would integrate with your print system
        console.log('Printing invoice:', printData);
        alert(`🖨️ Reprinting Invoice #${invoice.invoice_no}\n\nSent to printer!`);
        
        // You can integrate with actual printer here
        // window.print() or send to printer service
      }
    } catch (error) {
      console.error('Reprint error:', error);
      alert(`Error reprinting invoice: ${error.message}`);
    }
  };

  const createNewInvoice = async () => {
    try {
      // Clear all form data
      setSupplier('');
      setPurchaseDate(new Date().toISOString().split('T')[0]);
      setReceiveDate(new Date().toISOString().split('T')[0]);
      setIsTestingItem(false);
      setTestingReturnDate('');
      setMedicines([]);
      setShowInvoiceList(false);
      
      // Get next invoice number
      const api = (await import('../api')).default;
      const { data } = await api.get('/purchases/next-invoice');
      setInvoiceNo(data.invoice_no || '0');
    } catch (error) {
      console.error('Error creating new invoice:', error);
      // Fallback
      setSupplier('');
      setPurchaseDate(new Date().toISOString().split('T')[0]);
      setReceiveDate(new Date().toISOString().split('T')[0]);
      setIsTestingItem(false);
      setTestingReturnDate('');
      setMedicines([]);
      setInvoiceNo('0');
    }
  };

  const showAllInvoices = async () => {
    try {
      const api = (await import('../api')).default;
      const { data } = await api.get('/purchases');
      
      // Deduplicate invoices by invoice_no to prevent showing duplicates
      const uniqueInvoices = [];
      const seenInvoiceNos = new Set();
      
      if (Array.isArray(data)) {
        data.forEach(invoice => {
          const invoiceNo = invoice.invoice_no;
          if (!seenInvoiceNos.has(invoiceNo)) {
            seenInvoiceNos.add(invoiceNo);
            uniqueInvoices.push(invoice);
          }
        });
      }
      
      setInvoiceList(uniqueInvoices);
      setShowInvoiceList(true);
    } catch (error) {
      console.error('Error loading invoices:', error);
      alert('Error loading invoices');
    }
  };

  const updateRow = (index, changes, opts = {}) => {
    setMedicines((prev) => {
      const newMeds = [...prev];
      newMeds[index] = { ...newMeds[index], ...changes };
      
      // Trigger purchase price calculation when relevant fields change
      if (changes.sellingPrice !== undefined || changes.discount1 !== undefined || 
          changes.discount2 !== undefined || changes.gst !== undefined) {
        const row = newMeds[index];
        if (row.sellingPrice && !changes.purchaseRate) {
          // Clear purchase rate to trigger auto-calculation display
          if (!row.purchaseRate) {
            newMeds[index] = { ...newMeds[index], purchaseRate: '' };
          }
        }
      }
      
      if (opts.checkAdd && index === newMeds.length - 1) {
        const lastRow = newMeds[index];
        const hasData = (typeof lastRow.name === 'string' ? lastRow.name : lastRow.name?.name) || lastRow.batch || lastRow.purchaseRate;
        if (hasData) {
          newMeds.push(emptyRow());
        }
      }
      return newMeds;
    });
  };

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setPurchaseDate(today);
    (async () => {
      try {
        const api = (await import("../api")).default;
        const r = await api.get("/purchases/next-invoice");
        setInvoiceNo(r.data.invoice_no || "0");
      } catch (e) {
        setInvoiceNo("0");
      }

      try {
        const api = (await import("../api")).default;
        const { data } = await api.get("/products");
        setAvailableProducts(Array.isArray(data) ? data : []);
      } catch (e) {}

      try {
        const rs = JSON.parse(localStorage.getItem("recent_suppliers") || "[]");
        setRecentSuppliers(Array.isArray(rs) ? rs : []);
      } catch (e) {}

      try {
        const draft = JSON.parse(localStorage.getItem("purchase_draft") || "null");
        if (draft) {
          setSupplier(draft.supplier || "");
          setMedicines(draft.medicines && draft.medicines.length ? draft.medicines : []);
          setPurchaseDate(draft.purchaseDate || today);
        }
      } catch (e) {}
    })();
  }, []);

  const savePurchase = async (shouldPrint) => {
    try {
      const filled = medicines.filter((r) =>
        (typeof r.name === 'object' ? r.name?.name : r.name) || r.batch || r.purchaseRate
      );
      const api = (await import("../api")).default;
      const payload = {
        supplier_name: supplier,
        invoice_no: invoiceNo,
        purchase_date: purchaseDate,
        received_date: receiveDate || purchaseDate,
        is_testing_item: isTestingItem,
        testing_return_date: testingReturnDate || null,
        items: filled.map((r) => ({
          ...(() => {
            const t = getTotals(r);
            return {
              line_total: Number(t.finalAmt) || 0,
              bonus_qty: Number(r.bonusQty) || 0,
              unit_cost: Number(t.perUnit) || 0,
            };
          })(),
          product_id: r.product_id && Number(r.product_id) > 0 ? Number(r.product_id) : null,
          product_name: typeof r.name === 'string' ? r.name : r.name?.name || "",
          category: (r.category || "").trim() || null,
          formula: (r.formula || "").trim() || null,
          batch_no: r.batch || "",
          expiry: r.expiry || null,
          qty: Number(r.quantity) || 0,
          unit_price: Number(getTotals(r).perUnit) || 0,
          gst_percentage: Number(r.gst) || 0,
          discount1: Number(r.discount1) || 0,
          discount2: Number(r.discount2) || 0,
          selling_price: Number(r.sellingPrice) || 0,
          pack_size: Number(r.pack_size) || 1
        }))
      };

      await api.post("/purchases", payload);
      alert("Saved");
      try { localStorage.removeItem("purchase_draft"); } catch (e) {}
      setMedicines([emptyRow()]);
      setShowConfirmation(false);
      setAttemptedSubmit(false);

      if (shouldPrint === true) {
        setTimeout(() => window.print(), 200);
      }
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.error || err.message || "Failed");
      setShowConfirmation(false);
    }
  };

  const handleSubmit = () => {
    setAttemptedSubmit(true);
    
    // Validate required fields
    if (!purchaseDate || !String(purchaseDate).trim()) {
      alert('Please enter invoice date');
      invDateRef.current?.focus();
      return;
    }
    
    if (!supplier || !String(supplier).trim()) {
      alert('Please enter supplier name');
      supplierRef.current?.focus();
      return;
    }
    
    const filled = medicines.filter((r) => {
      const name = typeof r.name === 'object' ? r.name?.name : r.name;
      return name || r.batch || r.quantity || r.purchaseRate;
    });
    
    if (!filled.length) {
      alert('Please add at least one purchase item with name, batch, quantity or price');
      return;
    }
    
    // Validate each item has minimum required fields
    for (let i = 0; i < filled.length; i++) {
      const item = filled[i];
      const name = typeof item.name === 'object' ? item.name?.name : item.name;
      
      if (!name || !String(name).trim()) {
        alert(`Row ${i + 1}: Product name is required`);
        return;
      }
      
      if (!item.quantity || Number(item.quantity) <= 0) {
        alert(`Row ${i + 1}: Quantity is required`);
        return;
      }
      
      // Need either purchase price OR sale price to calculate costs
      const hasPurchasePrice = item.purchaseRate && Number(item.purchaseRate) > 0;
      const hasSalePrice = item.sellingPrice && Number(item.sellingPrice) > 0;
      
      if (!hasPurchasePrice && !hasSalePrice) {
        alert(`Row ${i + 1}: Either Purchase Price or Sale Price is required`);
        return;
      }
    }
    
    setShowConfirmation(true);
  };

  const loadInvoice = async (invoiceNumber) => {
    const invNo = invoiceNumber || invoiceNo;
    if (!String(invNo).trim()) return;
    try {
      const api = (await import("../api")).default;
      const { data } = await api.get(`/purchases/invoice/${invNo}`);
      if (data?.purchase) {
        setSupplier(data.purchase.supplier_name || "");
        setPurchaseDate(data.purchase.purchase_date ? data.purchase.purchase_date.split('T')[0] : "");
        setMedicines(data.items.map((it) => ({
          product_id: it.product_id,
          name: it.product_name,
          category: it.category || "",
          formula: it.formula || "",
          batch: it.batch_no || "",
          expiry: it.expiry ? it.expiry.split('T')[0] : "",
          quantity: it.qty || 0,
          purchaseRate: (Number(it.unit_price ?? it.cost ?? 0) * Number(it.pack_size || 1)) || 0,
          gst: it.gst_percentage || 0,
          discount1: "",
          discount2: "",
          bonusQty: it.bonus_qty ?? "",
          sellingPrice: it.selling_price || 0,
          pack_size: it.pack_size || 1,
          pack_price: 0
        })));
      }
    } catch (e) {
      console.error(e);
      alert("Load failed");
    }
  };

  const getTotals = (r) => {
    const packSize = Number(r.pack_size) || 1; // pieces per pack
    const qty = Number(r.quantity) || 0; // number of packs
    const bonus = Number(r.bonusQty) || 0; // bonus packs
    
    // Business logic: Sale Price → Apply Discounts → Add GST = Purchase Price
    const salePrice = Number(r.sellingPrice) || 0; // sale price per pack
    const disc1 = Number(r.discount1) || 0; // First discount %
    const disc2 = Number(r.discount2) || 0; // Extra discount %
    const gstPct = Number(r.gst) || 0; // GST %
    
    let purchasePrice = Number(r.purchaseRate) || 0; // purchase price per pack
    
    // If we have sale price but no purchase price, calculate it
    if (salePrice > 0 && purchasePrice === 0) {
      // Start with sale price per pack, apply discounts, then add GST
      let priceAfterDisc1 = salePrice * (1 - disc1 / 100); // Apply first discount
      let priceAfterDisc2 = priceAfterDisc1 * (1 - disc2 / 100); // Apply extra discount
      purchasePrice = priceAfterDisc2 * (1 + gstPct / 100); // Add GST on top
    }
    
    // Total packs we receive (including bonus)
    const totalPacks = qty + bonus;
    
    // For cost calculation: we pay for 'qty' packs but get 'totalPacks'
    const packsWePayFor = includeBonusInCost ? totalPacks : qty;
    
    // Gross amount = purchase price per pack × packs we pay for
    const grossAmount = purchasePrice * packsWePayFor;
    
    // For display calculations (showing the discount breakdown)
    const grossSaleValue = salePrice * totalPacks;
    const discountAmount1 = grossSaleValue * disc1 / 100;
    const discountAmount2 = (grossSaleValue - discountAmount1) * disc2 / 100;
    const totalDiscount = discountAmount1 + discountAmount2;
    const afterDiscounts = grossSaleValue - totalDiscount;
    const gstAmount = afterDiscounts * gstPct / 100;
    const finalAmount = afterDiscounts + gstAmount;
    
    // Total pieces we get = total packs × pieces per pack
    const totalPieces = totalPacks * packSize;
    
    return {
      perPackPrice: Number(purchasePrice) || 0,
      grossAmt: Number(grossAmount) || 0,
      saleValue: Number(grossSaleValue) || 0,
      discountAmt: Number(totalDiscount) || 0,
      afterDiscount: Number(afterDiscounts) || 0,
      gstAmt: Number(gstAmount) || 0,
      finalAmt: Number(grossAmount) || 0, // This is what we actually pay
      calculatedPurchaseRate: Number(purchasePrice) || 0,
      totalPacks: totalPacks,
      totalPieces: totalPieces,
      packsWePayFor: packsWePayFor,
      effectiveDiscountPercent: salePrice > 0 ? ((salePrice - purchasePrice) / salePrice * 100) : 0
    };
  };

  return (
    <div className="min-h-screen p-4" style={{backgroundColor: '#E8F5A8'}}>
      {/* Header matching screenshot */}
      <div className="mb-3">
        <div className="py-3" style={{backgroundColor: '#D4E157'}}>
          <h1 className="text-3xl font-bold text-center" style={{color: '#5D4E37'}}>Purchase Invoice</h1>
        </div>

        <div className="p-3" style={{backgroundColor: '#FFB74D'}}>
          <div className="grid grid-cols-12 gap-2 items-start">
            <div className="col-span-1 flex flex-col gap-1">
              <div className="text-xs font-semibold mb-1 text-center">Availability</div>
              <label className="flex items-center gap-1 text-xs">
                <input 
                  type="checkbox" 
                  checked={isTestingItem}
                  onChange={(e) => setIsTestingItem(e.target.checked)}
                  className="rounded"
                />
                🧪 Testing Item
              </label>
              
              {isTestingItem && (
                <div className="text-xs">
                  <label className="block mb-1">Return Date:</label>
                  <input 
                    type="date" 
                    value={testingReturnDate} 
                    onChange={(e) => setTestingReturnDate(e.target.value)}
                    className="w-full px-1 py-1 border border-gray-400 text-xs rounded"
                  />
                </div>
              )}
            </div>

            <div className="col-span-7 grid grid-cols-12 gap-2 items-center text-xs">
              <label className="col-span-2 font-semibold">Inv. Date</label>
              <input ref={invDateRef} type="date" value={purchaseDate} onChange={(e)=>setPurchaseDate(e.target.value)} onKeyDown={(e)=>{if(e.key==='Enter'){e.preventDefault();invNoRef.current?.focus();}}} className="col-span-4 border border-gray-400 px-1 py-1 text-xs" />
              <label className="col-span-2 font-semibold">Invoice No.</label>
              <input ref={invNoRef} value={invoiceNo} onChange={(e)=>setInvoiceNo(e.target.value)} onKeyDown={(e)=>{if(e.key==='Enter'){e.preventDefault();receiveDateRef.current?.focus();}}} className="col-span-4 border border-gray-400 px-1 py-1 text-xs" />
                
                <label className="col-span-2 font-semibold">Receive Date</label>
                <input ref={receiveDateRef} type="date" value={receiveDate} onChange={(e)=>setReceiveDate(e.target.value)} onKeyDown={(e)=>{if(e.key==='Enter'){e.preventDefault();supplierRef.current?.focus();}}} className="col-span-10 border border-gray-400 px-1 py-1 text-xs" />
                
                <label className="col-span-2 font-semibold">Supplier</label>
                <input ref={supplierRef} list="suppliers" value={supplier} onChange={async (e)=>{setSupplier(e.target.value); try{ if(e.target.value.trim()){ const api=(await import('../api')).default; const {data}=await api.get(`/suppliers?q=${encodeURIComponent(e.target.value)}`); setRecentSuppliers(Array.isArray(data)?data.map(d=>d.name):[]); } }catch(e){} }} onKeyDown={(e)=>{if(e.key==='Enter'){e.preventDefault();barcodeRef.current?.focus();}}} className="col-span-10 border border-gray-400 px-1 py-1 text-xs" />
                <datalist id="suppliers">{recentSuppliers.map((s,i)=>(<option value={s} key={i}/>))}</datalist>
              </div>

              <div className="col-span-4">
                <div className="mb-1 text-xs font-semibold">Purchase Actions</div>
                <div className="flex gap-2 mb-2">
                  <button onClick={createNewInvoice} className="flex-1 px-3 py-2 bg-green-600 text-white border border-green-700 text-xs hover:bg-green-700 rounded">
                    ➕ New Invoice
                  </button>
                  <button onClick={showAllInvoices} className="flex-1 px-3 py-2 bg-blue-600 text-white border border-blue-700 text-xs hover:bg-blue-700 rounded">
                    📋 Previous Invoices
                  </button>
                </div>
                <div className="flex gap-2 items-center text-xs">
                  <span>Packs</span>
                  <input className="w-16 border border-gray-400 px-1 py-1 text-xs" />
                  <span>Pieces</span>
                  <input className="w-16 border border-gray-400 px-1 py-1 text-xs" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Invoice List Modal */}
        {showInvoiceList && (
          <div className="mb-4 bg-white border border-gray-300 rounded shadow-lg max-h-96 overflow-y-auto">
            <div className="p-3 bg-blue-100 border-b">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <h3 className="font-semibold text-sm text-blue-800">📋 Previous Invoices</h3>
                  <p className="text-xs text-blue-600">Search and click on any invoice to load</p>
                </div>
                <button onClick={() => setShowInvoiceList(false)} className="text-red-600 hover:text-red-800 font-bold text-lg">×</button>
              </div>
              {/* Search within modal */}
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={searchInvoice} 
                  onChange={(e) => setSearchInvoice(e.target.value)}
                  placeholder="Search by invoice number..."
                  className="flex-1 border border-blue-300 px-2 py-1 text-xs rounded focus:border-blue-500 focus:outline-none"
                />
                <button 
                  onClick={() => searchInvoices(searchInvoice)}
                  className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                >
                  🔍 Search
                </button>
                <button 
                  onClick={() => {setSearchInvoice(''); showAllInvoices();}}
                  className="px-3 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
                >
                  Show All
                </button>
              </div>
            </div>
            {invoiceList.length > 0 ? (
              <div className="max-h-64 overflow-y-auto">
                {invoiceList
                  .filter(inv => !searchInvoice || inv.invoice_no.toString().includes(searchInvoice))
                  .map((inv, i) => (
                  <div key={i} className="p-3 border-b hover:bg-blue-50 cursor-pointer text-xs transition-colors" 
                       onClick={() => viewInvoiceDetails(inv)}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-semibold text-blue-800">📄 Invoice #{inv.invoice_no}</div>
                        <div className="text-gray-600 mt-1">🏪 Supplier: {inv.supplier_name || 'N/A'}</div>
                        <div className="text-gray-600">📅 Date: {inv.purchase_date}</div>
                        <div className="text-green-600 font-semibold">💰 ₹{inv.total_amount || 0}</div>
                        <div className="text-xs text-blue-500 mt-1">👆 Click to view invoice</div>
                      </div>
                      <div className="ml-4">
                        <button 
                          onClick={(e) => {e.stopPropagation(); reprintInvoice(inv);}}
                          className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                        >
                          🖨️ Reprint
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500 text-sm">
                <div className="text-2xl mb-2">📄</div>
                <div>{searchInvoice ? `No invoices found matching "${searchInvoice}"` : 'No invoices found'}</div>
                <div className="text-xs text-gray-400 mt-1">{searchInvoice ? 'Try a different search term' : 'Try creating a new invoice'}</div>
              </div>
            )}
          </div>
        )}

        <div className="mb-2 text-xs font-semibold px-2">Barcode</div>
        <input ref={barcodeRef} placeholder="Scan or enter barcode..." onKeyDown={(e)=>{if(e.key==='Enter'){e.preventDefault();itemRefs.current[0]?.focus();}}} className="w-full border border-gray-400 px-2 py-1 text-sm mb-3" style={{backgroundColor: '#FFFDE7'}} />
        
        {medicines.length === 0 && (
          <div className="text-center mb-4">
            <button 
              onClick={() => setMedicines([emptyRow()])} 
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-sm shadow-lg"
            >
              📋 Start Adding Items
            </button>
          </div>
        )}

        {/* Items Table */}
        {medicines.length > 0 && (
          <div className="mb-3 overflow-hidden" style={{backgroundColor: '#FFFDE7'}}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr style={{backgroundColor: '#B2EBF2'}} className="border-b border-gray-400">
                  <th className="px-2 py-2 text-left text-sm font-semibold text-gray-800 border-r border-gray-300">SNo.</th>
                  <th className="px-2 py-2 text-left text-sm font-semibold text-gray-800 border-r border-gray-300">ProductID</th>
                  <th className="px-2 py-2 text-left text-sm font-semibold text-gray-800 border-r border-gray-300">Product</th>
                  <th className="px-2 py-2 text-center text-sm font-semibold text-gray-800 border-r border-gray-300">Packs<br/><span className="font-normal text-xs">(Qty)</span></th>
                  <th className="px-2 py-2 text-center text-sm font-semibold text-gray-800 border-r border-gray-300">Pieces</th>
                  <th className="px-2 py-2 text-center text-sm font-semibold text-gray-800 border-r border-gray-300">Sale Price</th>
                  <th className="px-2 py-2 text-center text-sm font-semibold text-gray-800 border-r border-gray-300">Disc%</th>
                  <th className="px-2 py-2 text-center text-sm font-semibold text-gray-800 border-r border-gray-300">Extra%</th>
                  <th className="px-2 py-2 text-center text-sm font-semibold text-gray-800 border-r border-gray-300">GST</th>
                  <th className="px-2 py-2 text-center text-sm font-semibold text-gray-800 border-r border-gray-300">Pur Price</th>
                  <th className="px-2 py-2 text-left text-sm font-semibold text-gray-800 border-r border-gray-300">Batch</th>
                  <th className="px-2 py-2 text-center text-sm font-semibold text-gray-800 border-r border-gray-300">Bonus</th>
                  <th className="px-2 py-2 text-left text-sm font-semibold text-gray-800 border-r border-gray-300">Expiry</th>
                  <th className="px-2 py-2 text-center text-sm font-semibold text-gray-800 border-r border-gray-300">Gross Amount</th>
                  <th className="px-2 py-2 text-center text-sm font-semibold text-gray-800 border-r border-gray-300">Pack Size<br/><span className="font-normal text-xs">(Pcs/Pack)</span></th>
                  <th className="px-2 py-2 text-center text-sm font-semibold text-gray-800">X</th>
                </tr>
              </thead>
              <tbody>
                {medicines.map((r, i) => {
                  const errs = attemptedSubmit ? validateRow(r) : {};
                  const t = getTotals(r);
                  const autoCalcPrice = (() => {
                    const salePrice = Number(r.sellingPrice) || 0;
                    const disc1 = Number(r.discount1) || 0;
                    const disc2 = Number(r.discount2) || 0;
                    const gst = Number(r.gst) || 0;
                    
                    // If user manually entered purchase rate and no sale price, use manual rate
                    if (r.purchaseRate && !salePrice) return r.purchaseRate;
                    
                    // If we have sale price, always calculate from it
                    if (salePrice > 0) {
                      let price = salePrice;
                      price = price * (1 - disc1/100);  // Apply first discount
                      price = price * (1 - disc2/100);  // Apply second discount  
                      price = price * (1 + gst/100);    // Add GST
                      return price.toFixed(2);
                    }
                    
                    // Fallback to manual purchase rate
                    return r.purchaseRate || '';
                  })();
                  return (
                    <tr key={i} className="border-b border-gray-300">
                      <td className="px-2 py-1 text-center text-sm border-r border-gray-300">{i + 1}</td>
                      <td className="px-2 py-1 border-r border-gray-300"><input ref={(el) => (itemRefs.current[i] = el)} value={r.product_id || ''} onChange={(e) => updateRow(i, { product_id: e.target.value })} onKeyDown={(e)=>{if(e.key==='Enter'){e.preventDefault();productNameRefs.current[i]?.focus();}}} className="w-full border-0 px-2 py-1 text-sm bg-transparent" /></td>
                      <td className="px-2 py-1 border-r border-gray-300"><input ref={(el) => (productNameRefs.current[i] = el)} value={typeof r.name === 'string' ? r.name : (r.name?.name || '')} onChange={(e) => updateRow(i, { name: e.target.value }, { checkAdd: true })} onKeyDown={(e)=>{if(e.key==='Enter'){e.preventDefault();packRefs.current[i]?.focus();}}} className={`w-full border-0 px-2 py-1 text-sm bg-transparent ${attemptedSubmit && !r.name ? 'bg-red-50' : ''}`} /></td>
                      <td className="px-2 py-1 border-r border-gray-300 text-center"><input ref={(el) => (packRefs.current[i] = el)} type="number" value={r.pack_size} onChange={(e) => updateRow(i, { pack_size: e.target.value })} onKeyDown={(e)=>{if(e.key==='Enter'){e.preventDefault();qtyRefs.current[i]?.focus();}}} className="w-full border-0 px-2 py-1 text-sm text-center bg-transparent" /></td>
                      <td className="px-2 py-1 border-r border-gray-300 text-center"><input ref={(el) => (qtyRefs.current[i] = el)} type="number" value={r.quantity} onChange={(e) => updateRow(i, { quantity: e.target.value })} onKeyDown={(e)=>{if(e.key==='Enter'){e.preventDefault();salePriceRefs.current[i]?.focus();}}} className={`w-full border-0 px-2 py-1 text-sm text-center bg-transparent ${attemptedSubmit && (!r.quantity || Number(r.quantity) <= 0) ? 'bg-red-50' : ''}`} /></td>
                      <td className="px-2 py-1 border-r border-gray-300 text-center"><input ref={(el) => (salePriceRefs.current[i] = el)} type="number" value={r.sellingPrice} onChange={(e) => updateRow(i, { sellingPrice: e.target.value })} onKeyDown={(e)=>{if(e.key==='Enter'){e.preventDefault();disc1Refs.current[i]?.focus();}}} className="w-full border-0 px-2 py-1 text-sm text-center bg-transparent" /></td>
                      <td className="px-2 py-1 border-r border-gray-300 text-center"><input ref={(el) => (disc1Refs.current[i] = el)} type="number" value={r.discount1} onChange={(e) => updateRow(i, { discount1: e.target.value })} onKeyDown={(e)=>{if(e.key==='Enter'){e.preventDefault();disc2Refs.current[i]?.focus();}}} className="w-full border-0 px-2 py-1 text-sm text-center bg-transparent" /></td>
                      <td className="px-2 py-1 border-r border-gray-300 text-center"><input ref={(el) => (disc2Refs.current[i] = el)} type="number" value={r.discount2} onChange={(e) => updateRow(i, { discount2: e.target.value })} onKeyDown={(e)=>{if(e.key==='Enter'){e.preventDefault();gstRefs.current[i]?.focus();}}} className="w-full border-0 px-2 py-1 text-sm text-center bg-transparent" /></td>
                      <td className="px-2 py-1 border-r border-gray-300 text-center"><input ref={(el) => (gstRefs.current[i] = el)} type="number" value={r.gst} onChange={(e) => updateRow(i, { gst: e.target.value })} onKeyDown={(e)=>{if(e.key==='Enter'){e.preventDefault();purPriceRefs.current[i]?.focus();}}} className="w-full border-0 px-2 py-1 text-sm text-center bg-transparent" /></td>
                      <td className="px-2 py-1 border-r border-gray-300 text-center"><input ref={(el) => (purPriceRefs.current[i] = el)} type="number" value={autoCalcPrice} onChange={(e) => updateRow(i, { purchaseRate: e.target.value })} onKeyDown={(e)=>{if(e.key==='Enter'){e.preventDefault();batchRefs.current[i]?.focus();}}} className="w-full border-0 px-2 py-1 text-sm text-center bg-transparent" placeholder="Auto-calc" /></td>
                      <td className="px-2 py-1 border-r border-gray-300"><input ref={(el) => (batchRefs.current[i] = el)} value={r.batch} onChange={(e) => updateRow(i, { batch: e.target.value })} onKeyDown={(e)=>{if(e.key==='Enter'){e.preventDefault();bonusRefs.current[i]?.focus();}}} className="w-full border-0 px-2 py-1 text-sm bg-transparent" /></td>
                      <td className="px-2 py-1 border-r border-gray-300 text-center"><input ref={(el) => (bonusRefs.current[i] = el)} type="number" value={r.bonusQty} onChange={(e) => updateRow(i, { bonusQty: e.target.value })} onKeyDown={(e)=>{if(e.key==='Enter'){e.preventDefault();expiryRefs.current[i]?.focus();}}} className="w-full border-0 px-2 py-1 text-sm text-center bg-transparent" /></td>
                      <td className="px-2 py-1 border-r border-gray-300"><input ref={(el) => (expiryRefs.current[i] = el)} type="date" value={r.expiry} onChange={(e) => updateRow(i, { expiry: e.target.value })} onKeyDown={(e)=>{if(e.key==='Enter'){e.preventDefault();const name=typeof r.name==='string'?r.name:(r.name?.name||'');const hasRequired=name.trim()&&r.quantity&&Number(r.quantity)>0&&r.purchaseRate&&Number(r.purchaseRate)>0;if(i===medicines.length-1){if(hasRequired){setMedicines(prev=>[...prev,emptyRow()]);setTimeout(()=>itemRefs.current[i+1]?.focus(),50);}else{alert('Please fill Product Name, Quantity and Purchase Price before adding a new row');productNameRefs.current[i]?.focus();}}else{itemRefs.current[i+1]?.focus();}}}} className="w-full border-0 px-2 py-1 text-sm bg-transparent" /></td>
                      <td className="px-2 py-1 border-r border-gray-300 text-center text-sm">{t.finalAmt.toFixed(2)}</td>
                      <td className="px-2 py-1 border-r border-gray-300 text-center text-sm">{r.pack_size}</td>
                      <td className="px-2 py-1 text-center">{medicines.length > 1 && (<button onClick={() => removeRow(i)} className="text-sm text-red-600">X</button>)}</td>
                    </tr>
                  );
                })}
                <tr className="border-t border-gray-400">
                  <td colSpan="16" className="py-1"></td>
                </tr>
                <tr className="border-t-2 border-gray-600 font-bold" style={{backgroundColor: '#B2EBF2'}}>
                  <td colSpan="13" className="px-2 py-2 text-right text-sm border-r border-gray-300">TOTAL:</td>
                  <td className="px-2 py-2 text-center text-sm border-r border-gray-300">{medicines.reduce((s, r) => s + getTotals(r).finalAmt, 0).toFixed(2)}</td>
                  <td colSpan="2"></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Summary Section */}
          <div className="p-4" style={{backgroundColor: '#FFFDE7'}}>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <div className="text-sm font-semibold text-gray-700">Items Summary</div>
              <div className="text-xs text-gray-600">Packs: {medicines.reduce((sum, r) => sum + Number(r.quantity || 0), 0)}</div>
              <div className="text-xs text-gray-600">Bonus Packs: {medicines.reduce((sum, r) => sum + Number(r.bonusQty || 0), 0)}</div>
              <div className="text-xs text-green-600">Total Pieces: {medicines.reduce((sum, r) => sum + getTotals(r).totalPieces, 0)}</div>
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-700">Discounts Applied</div>
              <div className="text-xs text-green-600">Sale Value: ₹{medicines.reduce((sum, r) => sum + getTotals(r).saleValue, 0).toFixed(2)}</div>
              <div className="text-xs text-red-600">Savings: ₹{medicines.reduce((sum, r) => sum + getTotals(r).discountAmt, 0).toFixed(2)}</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold">Purchase Total</div>
              <div className="text-xs text-blue-600">+GST: ₹{medicines.reduce((sum, r) => sum + getTotals(r).gstAmt, 0).toFixed(2)}</div>
            </div>
          </div>
          <div className="flex justify-between items-center mb-4">
            <div className="text-lg font-semibold">Final Amount: <span className="inline-block bg-blue-200 px-4 py-2 ml-2 text-lg">Rs. {medicines.reduce((s, r) => s + getTotals(r).finalAmt, 0).toFixed(2)}</span></div>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-gray-100 border border-gray-400 text-sm hover:bg-gray-200">Print BarCode 1x1</button>
            <button className="px-4 py-2 bg-gray-100 border border-gray-400 text-sm hover:bg-gray-200">Products</button>
            <button className="px-4 py-2 bg-gray-100 border border-gray-400 text-sm hover:bg-gray-200" onClick={onBack}>Exit</button>
            <button className="px-4 py-2 bg-green-600 text-white border border-green-700 text-sm hover:bg-green-700 font-semibold" onClick={handleSubmit}>💾 Save</button>
          </div>
        </div>
        </div>
        )}

        {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            {/* Invoice Preview */}
            <div className="border-b pb-4 mb-4">
              <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">📋 Purchase Invoice Preview</h2>
              
              {/* Header Details */}
              <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                <div><strong>Invoice No:</strong> {invoiceNo}</div>
                <div><strong>Date:</strong> {purchaseDate}</div>
                <div><strong>Supplier:</strong> {supplier}</div>
              </div>
              
              {/* Items Table Preview */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300 text-xs">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border border-gray-300 px-2 py-1">Product</th>
                      <th className="border border-gray-300 px-2 py-1">Batch</th>
                      <th className="border border-gray-300 px-2 py-1">Expiry</th>
                      <th className="border border-gray-300 px-2 py-1">Qty</th>
                      <th className="border border-gray-300 px-2 py-1">Bonus</th>
                      <th className="border border-gray-300 px-2 py-1">Sale Price</th>
                      <th className="border border-gray-300 px-2 py-1">Disc%</th>
                      <th className="border border-gray-300 px-2 py-1">Extra%</th>
                      <th className="border border-gray-300 px-2 py-1">GST%</th>
                      <th className="border border-gray-300 px-2 py-1">Purchase Price</th>
                      <th className="border border-gray-300 px-2 py-1">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {medicines.filter(r => (typeof r.name === 'string' ? r.name : r.name?.name) || r.batch || r.purchaseRate).map((r, i) => {
                      const t = getTotals(r);
                      const productName = typeof r.name === 'string' ? r.name : (r.name?.name || '');
                      return (
                        <tr key={i}>
                          <td className="border border-gray-300 px-2 py-1">{productName}</td>
                          <td className="border border-gray-300 px-2 py-1">{r.batch}</td>
                          <td className="border border-gray-300 px-2 py-1">{r.expiry || '-'}</td>
                          <td className="border border-gray-300 px-2 py-1 text-center">{r.quantity}</td>
                          <td className="border border-gray-300 px-2 py-1 text-center">{r.bonusQty || '-'}</td>
                          <td className="border border-gray-300 px-2 py-1 text-right">₹{r.sellingPrice || '-'}</td>
                          <td className="border border-gray-300 px-2 py-1 text-center">{r.discount1}%</td>
                          <td className="border border-gray-300 px-2 py-1 text-center">{r.discount2}%</td>
                          <td className="border border-gray-300 px-2 py-1 text-center">{r.gst}%</td>
                          <td className="border border-gray-300 px-2 py-1 text-right">₹{t.calculatedPurchaseRate.toFixed(2)}</td>
                          <td className="border border-gray-300 px-2 py-1 text-right">₹{t.finalAmt.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                    <tr className="bg-blue-50 font-semibold">
                      <td colSpan="10" className="border border-gray-300 px-2 py-1 text-right">Grand Total:</td>
                      <td className="border border-gray-300 px-2 py-1 text-right">₹{medicines.reduce((s, r) => s + getTotals(r).finalAmt, 0).toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Choose Action</h3>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => savePurchase(false)}
                  className="w-full px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700 font-semibold text-lg"
                >
                  💾 Save Only
                </button>
                
                <button
                  type="button"
                  onClick={() => savePurchase(true)}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold text-lg"
                >
                  🖨️ Save & Print Invoice
                </button>
                
                <button
                  type="button"
                  onClick={() => setShowConfirmation(false)}
                  className="w-full px-6 py-3 bg-gray-600 text-white rounded hover:bg-gray-700 font-semibold text-lg"
                >
                  ❌ Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Read-Only Invoice Viewer */}
      {showInvoiceViewer && viewingInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-lg p-6 max-w-6xl w-full mx-4 max-h-[95vh] overflow-y-auto">
            {/* Invoice Header */}
            <div className="border-b-2 border-blue-500 pb-4 mb-6">
              <div className="text-center mb-4">
                <h1 className="text-3xl font-bold text-blue-800">📋 PURCHASE INVOICE</h1>
                <div className="text-lg font-semibold text-gray-600">Invoice #{viewingInvoice.invoice_no}</div>
              </div>
              
              {/* Invoice Details Grid */}
              <div className="grid grid-cols-3 gap-6 text-sm">
                <div className="bg-blue-50 p-3 rounded">
                    <div className="font-semibold text-blue-800 mb-2">📅 Invoice Information</div>
                    <div><strong>Invoice No:</strong> {viewingInvoice.invoice_no}</div>
                    <div><strong>Invoice Date:</strong> {viewingInvoice.purchase_date}</div>
                    <div><strong>Received Date:</strong> {viewingInvoice.receive_date || 'Same as invoice date'}</div>
                  </div>
                  
                  <div className="bg-green-50 p-3 rounded">
                    <div className="font-semibold text-green-800 mb-2">🏪 Supplier Details</div>
                    <div><strong>Supplier:</strong> {viewingInvoice.supplier_name || 'N/A'}</div>
                    <div><strong>Contact:</strong> {viewingInvoice.supplier_phone || 'N/A'}</div>
                    <div><strong>Address:</strong> {viewingInvoice.supplier_address || 'N/A'}</div>
                  </div>
                  
                  <div className="bg-yellow-50 p-3 rounded">
                    <div className="font-semibold text-yellow-800 mb-2">💰 Invoice Summary</div>
                    <div><strong>Total Items:</strong> {viewingInvoice.items?.length || 0}</div>
                    <div><strong>Grand Total:</strong> ₹{viewingInvoice.total || viewingInvoice.total_amount || 0}</div>
                  <div><strong>Status:</strong> 
                    {viewingInvoice.availability_type === 'trial' && <span className="text-blue-600">🧪 Trial Period</span>}
                    {viewingInvoice.availability_type === 'consignment' && <span className="text-orange-600">📋 Consignment</span>}
                    {viewingInvoice.availability_type === 'owned' && <span className="text-green-600">✅ Owned</span>}
                  </div>
                  {(viewingInvoice.availability_type === 'trial' || viewingInvoice.availability_type === 'consignment') && (
                    <div className="mt-2 text-sm">
                      <div><strong>Return Date:</strong> {viewingInvoice.trial_end_date || 'Not set'}</div>
                      <div><strong>Payment:</strong> 
                        {viewingInvoice.payment_status === 'pending' && <span className="text-yellow-600">⏳ Pending</span>}
                        {viewingInvoice.payment_status === 'paid' && <span className="text-green-600">✅ Paid</span>}
                        {viewingInvoice.payment_status === 'partial' && <span className="text-blue-600">🔄 Partial</span>}
                        {viewingInvoice.payment_status === 'returned' && <span className="text-gray-600">↩️ Returned</span>}
                      </div>
                    </div>
                  )}
                  </div>
                </div>
              </div>
              
              {/* Items Table */}
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-3">📦 Items Details</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-400 text-xs">
                    <thead className="bg-gray-200">
                      <tr>
                        <th className="border border-gray-400 px-2 py-2 text-left">#</th>
                        <th className="border border-gray-400 px-2 py-2 text-left">Product Name</th>
                        <th className="border border-gray-400 px-2 py-2">Batch</th>
                        <th className="border border-gray-400 px-2 py-2">Expiry</th>
                        <th className="border border-gray-400 px-2 py-2">Packs</th>
                        <th className="border border-gray-400 px-2 py-2">Bonus</th>
                        <th className="border border-gray-400 px-2 py-2">Pack Size</th>
                        <th className="border border-gray-400 px-2 py-2">Sale Price</th>
                        <th className="border border-gray-400 px-2 py-2">Disc 1%</th>
                        <th className="border border-gray-400 px-2 py-2">Disc 2%</th>
                        <th className="border border-gray-400 px-2 py-2">GST%</th>
                        <th className="border border-gray-400 px-2 py-2">Purchase Price</th>
                        <th className="border border-gray-400 px-2 py-2">Line Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewingInvoice.items.map((item, i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="border border-gray-400 px-2 py-1 text-center">{i + 1}</td>
                          <td className="border border-gray-400 px-2 py-1">{item.product_name}</td>
                          <td className="border border-gray-400 px-2 py-1 text-center">{item.batch_no || '-'}</td>
                          <td className="border border-gray-400 px-2 py-1 text-center">{item.expiry || '-'}</td>
                          <td className="border border-gray-400 px-2 py-1 text-center">{item.qty}</td>
                          <td className="border border-gray-400 px-2 py-1 text-center">{item.bonus_qty || '-'}</td>
                          <td className="border border-gray-400 px-2 py-1 text-center">{item.pack_size || 1}</td>
                          <td className="border border-gray-400 px-2 py-1 text-right">₹{item.original_sale_price || '-'}</td>
                          <td className="border border-gray-400 px-2 py-1 text-center">{item.discount1_percent || 0}%</td>
                          <td className="border border-gray-400 px-2 py-1 text-center">{item.discount2_percent || 0}%</td>
                          <td className="border border-gray-400 px-2 py-1 text-center">{item.gst_percent || 0}%</td>
                          <td className="border border-gray-400 px-2 py-1 text-right">₹{Number(item.unit_price || 0).toFixed(2)}</td>
                          <td className="border border-gray-400 px-2 py-1 text-right">₹{Number(item.qty * item.unit_price || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                      <tr className="bg-blue-100 font-bold">
                        <td colSpan="12" className="border border-gray-400 px-2 py-2 text-right">GRAND TOTAL:</td>
                        <td className="border border-gray-400 px-2 py-2 text-right">₹{viewingInvoice.items.reduce((sum, item) => sum + (item.qty * item.unit_price), 0).toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex justify-center gap-4 pt-4 border-t">
                <button
                  onClick={() => reprintInvoice(viewingInvoice)}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                >
                  🖨️ Print Invoice
                </button>
                <button
                  onClick={() => {setShowInvoiceViewer(false); setViewingInvoice(null);}}
                  className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold"
                >
                  ❌ Close
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}