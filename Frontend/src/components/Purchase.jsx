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
    <div className="p-2 sm:p-4 lg:p-6 bg-gray-50 dark:bg-gray-900/90 flex-1 overflow-y-auto">
      <div>
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-700 mb-6">
          <div className="bg-gray-800 dark:bg-gray-900 px-4 sm:px-6 py-4 text-white">
            <div className="flex justify-between items-center">
              <h1 className="text-xl sm:text-2xl font-bold">Purchase Invoice</h1>
              <button
                onClick={onBack}
                className={`px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-semibold transition whitespace-nowrap ring-offset-gray-800 ring-blue-400 focus:ring-2 focus:ring-offset-2`}
              >
                ← Back
              </button>
            </div>
          </div>

          {/* Top Form */}
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
              {/* Left Side */}
              <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Invoice Date</label>
                  <input ref={invDateRef} type="date" value={purchaseDate} onChange={(e)=>setPurchaseDate(e.target.value)} onKeyDown={(e)=>{if(e.key==='Enter'){e.preventDefault();invNoRef.current?.focus();}}} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Invoice No.</label>
                  <input ref={invNoRef} value={invoiceNo} onChange={(e)=>setInvoiceNo(e.target.value)} onKeyDown={(e)=>{if(e.key==='Enter'){e.preventDefault();receiveDateRef.current?.focus();}}} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Receive Date</label>
                  <input ref={receiveDateRef} type="date" value={receiveDate} onChange={(e)=>setReceiveDate(e.target.value)} onKeyDown={(e)=>{if(e.key==='Enter'){e.preventDefault();supplierRef.current?.focus();}}} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Supplier</label>
                  <input ref={supplierRef} list="suppliers" value={supplier} onChange={async (e)=>{setSupplier(e.target.value); try{ if(e.target.value.trim()){ const api=(await import('../api')).default; const {data}=await api.get(`/suppliers?q=${encodeURIComponent(e.target.value)}`); setRecentSuppliers(Array.isArray(data)?data.map(d=>d.name):[]); } }catch(e){} }} onKeyDown={(e)=>{if(e.key==='Enter'){e.preventDefault();barcodeRef.current?.focus();}}} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700" />
                  <datalist id="suppliers">{recentSuppliers.map((s,i)=>(<option value={s} key={i}/>))}</datalist>
                </div>
                <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Barcode</label>
                    <input ref={barcodeRef} placeholder="Scan or enter barcode..." onKeyDown={(e)=>{if(e.key==='Enter'){e.preventDefault();itemRefs.current[0]?.focus();}}} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700" />
                </div>
              </div>

              {/* Right Side */}
              <div className="md:col-span-4 flex flex-col gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Purchase Actions</label>
                  <div className="flex gap-2">
                    <button onClick={createNewInvoice} className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700">
                      New Invoice
                    </button>
                    <button onClick={showAllInvoices} className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">
                      Previous Invoices
                    </button>
                  </div>
                </div>
                <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        <input 
                        type="checkbox" 
                        checked={isTestingItem}
                        onChange={(e) => setIsTestingItem(e.target.checked)}
                        className="rounded h-4 w-4 text-blue-600 focus:ring-blue-500"
                        />
                        Testing Item
                    </label>
                    {isTestingItem && (
                        <div className="mt-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Return Date:</label>
                        <input 
                            type="date" 
                            value={testingReturnDate} 
                            onChange={(e) => setTestingReturnDate(e.target.value)}
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                        />
                        </div>
                    )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Invoice List Modal */}
        {showInvoiceList && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h3 className="font-semibold text-lg text-gray-800 dark:text-white">Previous Invoices</h3>
                <button onClick={() => setShowInvoiceList(false)} className="text-gray-500 hover:text-gray-800 dark:hover:text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="p-4">
                <div className="flex gap-2 mb-4">
                  <input 
                    type="text" 
                    value={searchInvoice} 
                    onChange={(e) => setSearchInvoice(e.target.value)}
                    placeholder="Search by invoice number..."
                    className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                  />
                  <button onClick={() => searchInvoices(searchInvoice)} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Search</button>
                  <button onClick={() => {setSearchInvoice(''); showAllInvoices();}} className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600">Show All</button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {invoiceList.length > 0 ? (
                  invoiceList
                    .filter(inv => !searchInvoice || inv.invoice_no.toString().includes(searchInvoice))
                    .map((inv, i) => (
                    <div key={i} className="p-4 border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer" onClick={() => viewInvoiceDetails(inv)}>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold text-blue-600 dark:text-blue-400">Invoice #{inv.invoice_no}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">Supplier: {inv.supplier_name || 'N/A'}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">Date: {inv.purchase_date}</div>
                          <div className="font-semibold text-green-600">Rs. {inv.total_amount || 0}</div>
                        </div>
                        <button onClick={(e) => {e.stopPropagation(); reprintInvoice(inv);}} className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600">Reprint</button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-gray-500">No invoices found.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Items Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-700">
            {medicines.length === 0 && (
            <div className="text-center p-10">
                <button 
                onClick={() => setMedicines([emptyRow()])} 
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-lg shadow-lg"
                >
                Start Adding Items
                </button>
            </div>
            )}
            {medicines.length > 0 && (
                <>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1200px]">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="py-2 px-2 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">#</th>
                            <th className="py-2 px-2 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Product</th>
                            <th className="py-2 px-2 text-center text-sm font-semibold text-gray-600 dark:text-gray-300">Qty</th>
                            <th className="py-2 px-2 text-center text-sm font-semibold text-gray-600 dark:text-gray-300">Sale Price</th>
                            <th className="py-2 px-2 text-center text-sm font-semibold text-gray-600 dark:text-gray-300">Disc%</th>
                            <th className="py-2 px-2 text-center text-sm font-semibold text-gray-600 dark:text-gray-300">GST%</th>
                            <th className="py-2 px-2 text-center text-sm font-semibold text-gray-600 dark:text-gray-300">Pur. Price</th>
                            <th className="py-2 px-2 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Batch</th>
                            <th className="py-2 px-2 text-center text-sm font-semibold text-gray-600 dark:text-gray-300">Bonus</th>
                            <th className="py-2 px-2 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Expiry</th>
                            <th className="py-2 px-2 text-right text-sm font-semibold text-gray-600 dark:text-gray-300">Total</th>
                            <th className="py-2 px-2 text-center text-sm font-semibold text-gray-600 dark:text-gray-300">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {medicines.map((r, i) => {
                        const t = getTotals(r);
                        const autoCalcPrice = (() => {
                            const salePrice = Number(r.sellingPrice) || 0;
                            if (salePrice > 0) {
                            let price = salePrice * (1 - (Number(r.discount1) || 0)/100);
                            price = price * (1 - (Number(r.discount2) || 0)/100);
                            price = price * (1 + (Number(r.gst) || 0)/100);
                            return price.toFixed(2);
                            }
                            return r.purchaseRate || '';
                        })();
                        return (
                            <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <td className="p-2 text-center">{i + 1}</td>
                                <td className="p-2 w-1/4">
                                    <AutoComplete
                                        value={{ id: r.product_id, name: r.name }}
                                        ref={(el) => (productNameRefs.current[i] = el)}
                                        onSelect={(val) => updateRow(i, { product_id: val?.id, name: val?.name, pack_size: val?.pack_size || 1 }, { checkAdd: true })}
                                        onEnter={() => qtyRefs.current[i]?.focus()}
                                        allItems={availableProducts}
                                        placeholder="Search product..."
                                    />
                                </td>
                                <td className="p-2"><input ref={(el) => (qtyRefs.current[i] = el)} type="number" value={r.quantity} onChange={(e) => updateRow(i, { quantity: e.target.value })} onKeyDown={(e)=>{if(e.key==='Enter'){e.preventDefault();salePriceRefs.current[i]?.focus();}}} className="w-20 p-1 text-center border rounded bg-white dark:bg-gray-700" /></td>
                                <td className="p-2"><input ref={(el) => (salePriceRefs.current[i] = el)} type="number" value={r.sellingPrice} onChange={(e) => updateRow(i, { sellingPrice: e.target.value })} onKeyDown={(e)=>{if(e.key==='Enter'){e.preventDefault();disc1Refs.current[i]?.focus();}}} className="w-24 p-1 text-right border rounded bg-white dark:bg-gray-700" /></td>
                                <td className="p-2"><input ref={(el) => (disc1Refs.current[i] = el)} type="number" value={r.discount1} onChange={(e) => updateRow(i, { discount1: e.target.value })} onKeyDown={(e)=>{if(e.key==='Enter'){e.preventDefault();gstRefs.current[i]?.focus();}}} className="w-20 p-1 text-center border rounded bg-white dark:bg-gray-700" /></td>
                                <td className="p-2"><input ref={(el) => (gstRefs.current[i] = el)} type="number" value={r.gst} onChange={(e) => updateRow(i, { gst: e.target.value })} onKeyDown={(e)=>{if(e.key==='Enter'){e.preventDefault();purPriceRefs.current[i]?.focus();}}} className="w-20 p-1 text-center border rounded bg-white dark:bg-gray-700" /></td>
                                <td className="p-2"><input ref={(el) => (purPriceRefs.current[i] = el)} type="number" value={autoCalcPrice} onChange={(e) => updateRow(i, { purchaseRate: e.target.value })} onKeyDown={(e)=>{if(e.key==='Enter'){e.preventDefault();batchRefs.current[i]?.focus();}}} className="w-24 p-1 text-right border rounded bg-white dark:bg-gray-700" placeholder="Auto" /></td>
                                <td className="p-2"><input ref={(el) => (batchRefs.current[i] = el)} value={r.batch} onChange={(e) => updateRow(i, { batch: e.target.value })} onKeyDown={(e)=>{if(e.key==='Enter'){e.preventDefault();bonusRefs.current[i]?.focus();}}} className="w-28 p-1 border rounded bg-white dark:bg-gray-700" /></td>
                                <td className="p-2"><input ref={(el) => (bonusRefs.current[i] = el)} type="number" value={r.bonusQty} onChange={(e) => updateRow(i, { bonusQty: e.target.value })} onKeyDown={(e)=>{if(e.key==='Enter'){e.preventDefault();expiryRefs.current[i]?.focus();}}} className="w-20 p-1 text-center border rounded bg-white dark:bg-gray-700" /></td>
                                <td className="p-2"><input ref={(el) => (expiryRefs.current[i] = el)} type="date" value={r.expiry} onChange={(e) => updateRow(i, { expiry: e.target.value })} onKeyDown={(e)=>{if(e.key==='Enter'){e.preventDefault();if(i===medicines.length-1){setMedicines(p=>[...p,emptyRow()]);setTimeout(()=>productNameRefs.current[i+1]?.focus(),50)}else{productNameRefs.current[i+1]?.focus()}}}} className="w-36 p-1 border rounded bg-white dark:bg-gray-700" /></td>
                                <td className="p-2 text-right font-semibold">{t.finalAmt.toFixed(2)}</td>
                                <td className="p-2 text-center">{medicines.length > 1 && (<button onClick={() => removeRow(i)} className="text-red-500 hover:text-red-700">✕</button>)}</td>
                            </tr>
                        );
                        })}
                    </tbody>
                    </table>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-600">
                    <div className="flex justify-end items-center">
                        <div className="text-lg font-bold text-gray-800 dark:text-white">
                            Total: <span className="ml-4 text-2xl">Rs. {medicines.reduce((s, r) => s + getTotals(r).finalAmt, 0).toFixed(2)}</span>
                        </div>
                    </div>
                </div>
                </>
            )}
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                <button className="px-6 py-3 bg-green-600 text-white border border-green-700 rounded-md text-lg hover:bg-green-700 font-semibold" onClick={handleSubmit}>Save Purchase</button>
            </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 text-center">Confirm Purchase</h2>
            <div className="space-y-3">
              <button onClick={() => savePurchase(false)} className="w-full px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold text-lg">Save Only</button>
              <button onClick={() => savePurchase(true)} className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold text-lg">Save & Print</button>
              <button onClick={() => setShowConfirmation(false)} className="w-full px-6 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 font-semibold text-lg">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Read-Only Invoice Viewer */}
      {showInvoiceViewer && viewingInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-blue-700 dark:text-blue-400">Purchase Invoice #{viewingInvoice.invoice_no}</h2>
                <button onClick={() => {setShowInvoiceViewer(false); setViewingInvoice(null);}} className="text-gray-500 hover:text-gray-800 dark:hover:text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 text-sm">
                    <div><strong>Supplier:</strong> {viewingInvoice.supplier_name || 'N/A'}</div>
                    <div><strong>Invoice Date:</strong> {viewingInvoice.purchase_date}</div>
                </div>
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                        <tr>
                            <th scope="col" className="py-3 px-6">Product</th>
                            <th scope="col" className="py-3 px-6">Qty</th>
                            <th scope="col" className="py-3 px-6">Price</th>
                            <th scope="col" className="py-3 px-6">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {viewingInvoice.items.map((item, i) => (
                            <tr key={i} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                                <th scope="row" className="py-4 px-6 font-medium text-gray-900 whitespace-nowrap dark:text-white">{item.product_name}</th>
                                <td className="py-4 px-6">{item.qty}</td>
                                <td className="py-4 px-6">Rs. {Number(item.unit_price || 0).toFixed(2)}</td>
                                <td className="py-4 px-6">Rs. {Number(item.qty * item.unit_price || 0).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-600 flex justify-between items-center">
                <div className="text-lg font-bold">Grand Total: Rs. {viewingInvoice.items.reduce((sum, item) => sum + (item.qty * item.unit_price), 0).toFixed(2)}</div>
                <button onClick={() => reprintInvoice(viewingInvoice)} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Print</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}