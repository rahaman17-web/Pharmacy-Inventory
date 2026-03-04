import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
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
  isTesting: false,
});

export default function Purchase({ onBack }) {
  const [supplier, setSupplier] = useState("");
  const [supplierId, setSupplierId] = useState(null);
  const [invoiceNo, setInvoiceNo] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [receiveDate, setReceiveDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [isTestingItem, setIsTestingItem] = useState(false);
  const [testingReturnDate, setTestingReturnDate] = useState("");
  const [medicines, setMedicines] = useState(
    Array.from({ length: 10 }, emptyRow),
  );
  const [includeBonusInCost, setIncludeBonusInCost] = useState(false);
  const [recentSuppliers, setRecentSuppliers] = useState([]);
  const [allSuppliers, setAllSuppliers] = useState([]);
  const [showSupplierDrop, setShowSupplierDrop] = useState(false);
  const [supplierHighlight, setSupplierHighlight] = useState(-1);

  // Press Enter on blank page → focus supplier
  useEffect(() => {
    const handleEnter = (e) => {
      if (e.key === "Enter") {
        const tag = document.activeElement?.tagName;
        if (!tag || tag === "BODY") {
          e.preventDefault();
          supplierRef.current?.focus();
        }
      }
    };
    document.addEventListener("keydown", handleEnter);
    return () => document.removeEventListener("keydown", handleEnter);
  }, []);

  // Scroll highlighted supplier item into view when navigating with keyboard
  useEffect(() => {
    if (supplierHighlight >= 0 && supplierDropRef.current) {
      const item = supplierDropRef.current.children[supplierHighlight];
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [supplierHighlight]);
  const [showInvoiceList, setShowInvoiceList] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [stockData, setStockData] = useState({});
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
  const supplierDropRef = useRef(null);
  const barcodeRef = useRef(null);
  const tableContainerRef = useRef(null);

  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  // Set default dates on component mount
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    if (!purchaseDate) setPurchaseDate(today);
    if (!receiveDate) setReceiveDate(today);
    // Auto-load next invoice number on mount
    (async () => {
      try {
        const api = (await import("../api")).default;
        const { data } = await api.get("/purchases/next-invoice");
        setInvoiceNo(data.invoice_no || "1");
      } catch {
        setInvoiceNo("1");
      }
    })();
  }, []);

  // Dynamically size table rows to exactly fill visible space on mount
  useLayoutEffect(() => {
    const el = tableContainerRef.current;
    if (!el) return;
    const ROW_H = 33;
    const h = el.clientHeight;
    const headerH = 33; // thead row
    const fit = Math.max(10, Math.floor((h - headerH) / ROW_H));
    setMedicines(Array.from({ length: fit }, emptyRow));
  }, []);

  const fitRows = () => {
    const el = tableContainerRef.current;
    if (!el) return 15;
    const ROW_H = 33;
    const h = el.clientHeight;
    return Math.max(10, Math.floor((h - 33) / ROW_H));
  };

  const removeRow = (index) => {
    setMedicines((prev) => prev.filter((_, i) => i !== index));
  };

  const validateRow = (r) => {
    const errs = {};
    if (
      !((typeof r.name === "object" ? r.name?.name : r.name) || "")
        .toString()
        .trim() &&
      !r.batch &&
      !r.purchaseRate
    ) {
      errs.name = "Enter product name, batch or price";
    }
    return errs;
  };

  const searchInvoices = async (q) => {
    try {
      const api = (await import("../api")).default;
      const { data } = await api.get(`/purchases?q=${encodeURIComponent(q)}`);

      // Deduplicate invoices by invoice_no to prevent showing duplicates
      const uniqueInvoices = [];
      const seenInvoiceNos = new Set();

      if (Array.isArray(data)) {
        data.forEach((invoice) => {
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
      console.error("Search error:", e);
      setInvoiceList([]);
      setShowInvoiceList(false);
    }
  };

  const searchByBarcode = async () => {
    if (!barcode.trim()) return;
    try {
      const api = (await import("../api")).default;
      const { data } = await api.get(
        `/products?barcode=${encodeURIComponent(barcode)}`,
      );
      if (data && data.length > 0) {
        const product = data[0];
        // Fill the first empty row with the found product
        setMedicines((prev) => {
          const updated = [...prev];
          const emptyIdx = updated.findIndex((r) => !r.name && !r.product_id);
          const targetIdx = emptyIdx >= 0 ? emptyIdx : updated.length;
          updated[targetIdx] = {
            ...emptyRow(),
            product_id: product.id,
            name: product.name,
            pack_size: product.pack_size || 1,
          };
          if (targetIdx === updated.length - 1) updated.push(emptyRow());
          return updated;
        });
      } else {
        alert("Product not found with this barcode");
      }
    } catch (error) {
      console.error("Barcode search error:", error);
      alert("Error searching by barcode");
    }
  };

  const viewInvoiceDetails = async (invoice) => {
    try {
      const api = (await import("../api")).default;
      const { data } = await api.get(
        `/purchases/invoice/${invoice.invoice_no}`,
      );

      if (data && data.purchase) {
        setViewingInvoice({
          ...data.purchase,
          items: data.items || [],
          supplier_name: data.purchase.supplier_name || invoice.supplier_name,
        });
        setShowInvoiceViewer(true);
        setShowInvoiceList(false);
      } else {
        alert("Invoice details not found");
      }
    } catch (error) {
      console.error("Error loading invoice details:", error);
      alert(`Error loading invoice: ${error.message}`);
    }
  };

  const reprintInvoice = async (invoice) => {
    try {
      const api = (await import("../api")).default;
      const { data } = await api.get(
        `/purchases/invoice/${invoice.invoice_no}`,
      );

      if (data && data.purchase && data.items) {
        // Generate print data
        const printData = {
          invoice_no: data.purchase.invoice_no,
          purchase_date: data.purchase.purchase_date,
          supplier_name: data.purchase.supplier_name,
          items: data.items,
          total_amount: invoice.total_amount,
        };

        // Here you would integrate with your print system
        console.log("Printing invoice:", printData);
        alert(
          `🖨️ Reprinting Invoice #${invoice.invoice_no}\n\nSent to printer!`,
        );

        // You can integrate with actual printer here
        // window.print() or send to printer service
      }
    } catch (error) {
      console.error("Reprint error:", error);
      alert(`Error reprinting invoice: ${error.message}`);
    }
  };

  const createNewInvoice = async () => {
    try {
      // Clear all form data
      setSupplier("");
      setSupplierId(null);
      setPurchaseDate(new Date().toISOString().split("T")[0]);
      setReceiveDate(new Date().toISOString().split("T")[0]);
      setIsTestingItem(false);
      setTestingReturnDate("");
      setMedicines(Array.from({ length: fitRows() }, emptyRow));
      setShowInvoiceList(false);

      // Get next invoice number
      const api = (await import("../api")).default;
      const { data } = await api.get("/purchases/next-invoice");
      setInvoiceNo(data.invoice_no || "1");
    } catch (error) {
      console.error("Error creating new invoice:", error);
      // Fallback
      setSupplier("");
      setSupplierId(null);
      setPurchaseDate(new Date().toISOString().split("T")[0]);
      setReceiveDate(new Date().toISOString().split("T")[0]);
      setIsTestingItem(false);
      setTestingReturnDate("");
      setMedicines(Array.from({ length: fitRows() }, emptyRow));
      setInvoiceNo("1");
    }
  };

  const showAllInvoices = async () => {
    try {
      const api = (await import("../api")).default;
      const { data } = await api.get("/purchases");

      // Deduplicate invoices by invoice_no to prevent showing duplicates
      const uniqueInvoices = [];
      const seenInvoiceNos = new Set();

      if (Array.isArray(data)) {
        data.forEach((invoice) => {
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
      console.error("Error loading invoices:", error);
      alert("Error loading invoices");
    }
  };

  const updateRow = (index, changes, opts = {}) => {
    setMedicines((prev) => {
      const newMeds = [...prev];
      newMeds[index] = { ...newMeds[index], ...changes };

      // Trigger purchase price calculation when relevant fields change
      if (
        changes.sellingPrice !== undefined ||
        changes.discount1 !== undefined ||
        changes.discount2 !== undefined ||
        changes.gst !== undefined
      ) {
        const row = newMeds[index];
        if (row.sellingPrice && !changes.purchaseRate) {
          // Clear purchase rate to trigger auto-calculation display
          if (!row.purchaseRate) {
            newMeds[index] = { ...newMeds[index], purchaseRate: "" };
          }
        }
      }

      if (opts.checkAdd && index === newMeds.length - 1) {
        const lastRow = newMeds[index];
        const hasData =
          (typeof lastRow.name === "string"
            ? lastRow.name
            : lastRow.name?.name) ||
          lastRow.batch ||
          lastRow.purchaseRate;
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

      // Load all suppliers for dropdown
      try {
        const api2 = (await import("../api")).default;
        const { data: sups } = await api2.get("/suppliers");
        setAllSuppliers(Array.isArray(sups) ? sups : []);
      } catch (e) {}

      try {
        const draft = JSON.parse(
          localStorage.getItem("purchase_draft") || "null",
        );
        if (draft) {
          setSupplier(draft.supplier || "");
          setMedicines(
            draft.medicines && draft.medicines.length
              ? (() => {
                  const fit = fitRows();
                  return draft.medicines.length < fit
                    ? [
                        ...draft.medicines,
                        ...Array.from(
                          { length: fit - draft.medicines.length },
                          emptyRow,
                        ),
                      ]
                    : draft.medicines;
                })()
              : Array.from({ length: fitRows() }, emptyRow),
          );
          setPurchaseDate(draft.purchaseDate || today);
        }
      } catch (e) {}
    })();
  }, []);

  // Fetch supplier suggestions + resolve supplierId when supplier name changes
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!supplier.trim()) {
        setRecentSuppliers([]);
        setSupplierId(null);
        return;
      }
      try {
        const api = (await import("../api")).default;
        const { data } = await api.get(
          `/suppliers?q=${encodeURIComponent(supplier)}`,
        );
        const list = Array.isArray(data) ? data : [];
        setRecentSuppliers(list);
        const match = list.find(
          (d) => d.name.toLowerCase() === supplier.trim().toLowerCase(),
        );
        setSupplierId(match ? match.id : null);
      } catch (e) {}
    }, 300);
    return () => clearTimeout(timer);
  }, [supplier]);

  // Re-fetch products whenever the resolved supplierId changes
  useEffect(() => {
    (async () => {
      try {
        const api = (await import("../api")).default;
        const url = supplierId
          ? `/products?supplier_id=${supplierId}`
          : "/products";
        const { data } = await api.get(url);
        setAvailableProducts(Array.isArray(data) ? data : []);
        // Build stock map from batches
        try {
          const { data: stockBatches } = await api.get("/stock");
          const stockMap = {};
          stockBatches.forEach((b) => {
            stockMap[b.product_id] = (stockMap[b.product_id] || 0) + b.qty;
          });
          // Fall back to opening_qty for products with no batch rows
          (Array.isArray(data) ? data : []).forEach((p) => {
            if (!stockMap[p.id] && Number(p.opening_qty) > 0)
              stockMap[p.id] = Number(p.opening_qty);
          });
          setStockData(stockMap);
        } catch (e) {}
      } catch (e) {}
    })();
  }, [supplierId]);

  const savePurchase = async (shouldPrint) => {
    try {
      const filled = medicines.filter(
        (r) =>
          (typeof r.name === "object" ? r.name?.name : r.name) ||
          r.batch ||
          r.purchaseRate,
      );
      const api = (await import("../api")).default;
      const payload = {
        supplier_id: supplierId || null,
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
              unit_cost: Number(t.perPackPrice) || 0,
            };
          })(),
          product_id:
            r.product_id && Number(r.product_id) > 0
              ? Number(r.product_id)
              : null,
          product_name:
            typeof r.name === "string" ? r.name : r.name?.name || "",
          is_testing: !!r.isTesting,
          category: (r.category || "").trim() || null,
          formula: (r.formula || "").trim() || null,
          batch_no: r.batch || "",
          expiry: r.expiry || null,
          qty: Number(r.quantity) || 0,
          unit_price: Number(getTotals(r).perPackPrice) || 0,
          gst_percentage: Number(r.gst) || 0,
          discount1: Number(r.discount1) || 0,
          discount2: Number(r.discount2) || 0,
          selling_price: Number(r.sellingPrice) || 0,
          pack_size: Number(r.pack_size) || 1,
        })),
      };

      await api.post("/purchases", payload);
      alert("Saved");
      try {
        localStorage.removeItem("purchase_draft");
      } catch (e) {}
      // Reset form and get next invoice number
      setMedicines(Array.from({ length: fitRows() }, emptyRow));
      setSupplier("");
      setSupplierId(null);
      setPurchaseDate(new Date().toISOString().split("T")[0]);
      setReceiveDate(new Date().toISOString().split("T")[0]);
      setShowConfirmation(false);
      setAttemptedSubmit(false);
      try {
        const r2 = await api.get("/purchases/next-invoice");
        setInvoiceNo(r2.data.invoice_no || "0");
      } catch (e) {}
      setTimeout(() => supplierRef.current?.focus(), 100);

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
      alert("Please enter invoice date");
      invDateRef.current?.focus();
      return;
    }

    if (!supplier || !String(supplier).trim()) {
      alert("Please enter supplier name");
      supplierRef.current?.focus();
      return;
    }

    const filled = medicines.filter((r) => {
      const name = typeof r.name === "object" ? r.name?.name : r.name;
      return name || r.batch || r.quantity || r.purchaseRate;
    });

    if (!filled.length) {
      alert(
        "Please add at least one purchase item with name, batch, quantity or price",
      );
      return;
    }

    // Validate each item has minimum required fields
    for (let i = 0; i < filled.length; i++) {
      const item = filled[i];
      const name = typeof item.name === "object" ? item.name?.name : item.name;
      const label = `Row ${i + 1} (${String(name || "").trim() || "unnamed"})`;

      if (!name || !String(name).trim()) {
        alert(`Row ${i + 1}: Product name is required`);
        return;
      }

      if (!item.batch || !String(item.batch).trim()) {
        alert(`${label}: Batch number is required`);
        return;
      }

      if (!item.expiry || !String(item.expiry).trim()) {
        alert(`${label}: Expiry date is required`);
        return;
      }

      if (!item.quantity || Number(item.quantity) <= 0) {
        alert(`${label}: Quantity is required`);
        return;
      }

      // Accept manual purchaseRate OR auto-calculated from sale price + discounts
      const calcPurchaseRate = (() => {
        if (item.purchaseRate && Number(item.purchaseRate) > 0)
          return Number(item.purchaseRate);
        const sp = Number(item.sellingPrice) || 0;
        if (sp > 0) {
          let p = sp * (1 - (Number(item.discount1) || 0) / 100);
          p = p * (1 - (Number(item.discount2) || 0) / 100);
          p = p * (1 + (Number(item.gst) || 0) / 100);
          return p;
        }
        return 0;
      })();
      if (!(calcPurchaseRate > 0)) {
        alert(`${label}: Purchase Price (Cost) is required`);
        return;
      }

      if (!(item.sellingPrice && Number(item.sellingPrice) > 0)) {
        alert(`${label}: Sale Price is required`);
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
        setInvoiceNo(String(invNo));
        setSupplier(data.purchase.supplier_name || "");
        setSupplierId(data.purchase.supplier_id || null);
        setPurchaseDate(
          data.purchase.purchase_date
            ? data.purchase.purchase_date.split("T")[0]
            : "",
        );
        const loadedRows = data.items.map((it) => ({
          product_id: it.product_id,
          name: it.product_name,
          category: it.category || "",
          formula: it.formula || "",
          batch: it.batch_no || "",
          expiry: it.expiry ? it.expiry.split("T")[0] : "",
          quantity: it.qty || 0,
          purchaseRate:
            Number(it.unit_price ?? it.cost ?? 0) * Number(it.pack_size || 1) ||
            0,
          gst: it.gst_percentage || 0,
          discount1: "",
          discount2: "",
          bonusQty: it.bonus_qty ?? "",
          sellingPrice: it.selling_price || 0,
          pack_size: it.pack_size || 1,
          pack_price: 0,
        }));
        const fit = fitRows();
        const padded =
          loadedRows.length < fit
            ? [
                ...loadedRows,
                ...Array.from({ length: fit - loadedRows.length }, emptyRow),
              ]
            : [...loadedRows, ...Array.from({ length: 5 }, emptyRow)];
        setMedicines(padded);
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
    const discountAmount1 = (grossSaleValue * disc1) / 100;
    const discountAmount2 = ((grossSaleValue - discountAmount1) * disc2) / 100;
    const totalDiscount = discountAmount1 + discountAmount2;
    const afterDiscounts = grossSaleValue - totalDiscount;
    const gstAmount = (afterDiscounts * gstPct) / 100;
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
      effectiveDiscountPercent:
        salePrice > 0 ? ((salePrice - purchasePrice) / salePrice) * 100 : 0,
    };
  };

  // Ordered list of editable column refs for keyboard navigation
  const COLS = [
    productNameRefs, // 0 – Product
    packRefs, // 1 – Qty (packs)
    salePriceRefs, // 2 – Sale Price
    disc1Refs, // 3 – Disc %
    disc2Refs, // 4 – Extra %
    gstRefs, // 5 – GST
    purPriceRefs, // 6 – Pur Price
    batchRefs, // 7 – Batch
    bonusRefs, // 8 – Bonus
    expiryRefs, // 9 – Expiry
  ];

  /**
   * Keyboard navigation for table cells.
   * Enter / ArrowRight  → next column (or first col of next row at end)
   * ArrowLeft           → previous column (or last col of previous row at start)
   * ArrowDown           → same column, next row
   * ArrowUp             → same column, previous row
   */
  const navigateCell = (e, rowIdx, colIdx) => {
    const key = e.key;
    const totalRows = medicines.length;

    if (key === "Enter" || key === "ArrowRight") {
      e.preventDefault();
      const nextCol = colIdx + 1;
      if (nextCol < COLS.length) {
        COLS[nextCol].current[rowIdx]?.focus();
      } else {
        // End of row → jump to product name of consecutive next row
        const nextRow = rowIdx + 1;
        if (nextRow < totalRows) {
          COLS[0].current[nextRow]?.focus();
        } else {
          setMedicines((p) => [...p, emptyRow()]);
          setTimeout(() => COLS[0].current[rowIdx + 1]?.focus(), 50);
        }
      }
    } else if (key === "ArrowLeft") {
      e.preventDefault();
      const prevCol = colIdx - 1;
      if (prevCol >= 0) {
        COLS[prevCol].current[rowIdx]?.focus();
      } else if (rowIdx > 0) {
        COLS[COLS.length - 1].current[rowIdx - 1]?.focus();
      }
    } else if (key === "ArrowDown") {
      e.preventDefault();
      if (rowIdx + 1 < totalRows) COLS[colIdx].current[rowIdx + 1]?.focus();
    } else if (key === "ArrowUp") {
      e.preventDefault();
      if (rowIdx > 0) COLS[colIdx].current[rowIdx - 1]?.focus();
    }
  };

  const HDR_INP = {
    height: "clamp(26px,2.2vh,32px)",
    border: "1px solid #555",
    padding: "0 8px",
    fontSize: "clamp(13px,1.1vw,15px)",
    width: "clamp(130px,10vw,160px)",
    background: "#fff",
  };
  const TBL_INP = {
    width: "100%",
    height: "100%",
    minHeight: "clamp(28px,2.4vh,34px)",
    border: "none",
    padding: "0 5px",
    fontSize: "clamp(13px,1.15vw,15px)",
    background: "transparent",
    outline: "none",
  };
  const TBL_CELL = {
    width: "100%",
    height: "100%",
    minHeight: "clamp(28px,2.4vh,34px)",
    border: "none",
    padding: "0 5px",
    fontSize: "clamp(13px,1.15vw,15px)",
    background: "transparent",
    outline: "none",
    MozAppearance: "textfield",
  };

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden z-40"
      style={{
        background: "#e8c840",
        fontFamily: "'Segoe UI',Tahoma,sans-serif",
      }}
    >
      {/* ══════ HEADER BAR ══════ */}
      <div style={{ background:"#1e293b", color:"#fff", padding:"10px 20px", display:"flex", alignItems:"center", gap:14, flexShrink:0 }}>
        <button onClick={onBack} style={{ background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.3)", color:"#fff", borderRadius:6, padding:"6px 16px", fontWeight:700, fontSize:13, cursor:"pointer" }}>← Back</button>
        <span style={{ fontSize:18, fontWeight:800 }}>PURCHASE INVOICE</span>
      </div>
      {/* ══════ HEADER FORM ══════ */}
      <div
        className="shrink-0 px-3 py-1.5 flex items-start gap-4"
        style={{
          background: "#f0f0f0",
          borderBottom: "2px solid #aaa",
          color: "#111",
        }}
      >
        {/* Nav buttons */}
        <div className="flex flex-col gap-1 shrink-0">
          <button
            onClick={async () => {
              if (!invoiceNo || invoiceNo === "0") return;
              try {
                const api = (await import("../api")).default;
                const { data } = await api.get(
                  `/purchases/next-invoice-from/${invoiceNo}`,
                );
                loadInvoice(data.invoice_no);
              } catch {
                // No saved next invoice — start a fresh new one
                const api = (await import("../api")).default;
                try {
                  const { data } = await api.get("/purchases/next-invoice");
                  setInvoiceNo(data.invoice_no || "1");
                } catch {
                  setInvoiceNo(String(Number(invoiceNo) + 1));
                }
                setSupplier("");
                setSupplierId(null);
                setPurchaseDate(new Date().toISOString().split("T")[0]);
                setReceiveDate(new Date().toISOString().split("T")[0]);
                setIsTestingItem(false);
                setTestingReturnDate("");
                setMedicines(Array.from({ length: fitRows() }, emptyRow));
              }
            }}
            className="font-bold border-2 border-gray-600"
            style={{
              background: "#e8e8e8",
              width: "clamp(76px,6vw,96px)",
              height: "clamp(28px,2.4vh,34px)",
              fontSize: "clamp(12px,1.1vw,15px)",
            }}
          >
            Next
          </button>
          <button
            onClick={async () => {
              if (!invoiceNo || invoiceNo === "0") return;
              try {
                const api = (await import("../api")).default;
                const { data } = await api.get(
                  `/purchases/prev-invoice/${invoiceNo}`,
                );
                loadInvoice(data.invoice_no);
              } catch {
                alert("No previous invoice found.");
              }
            }}
            className="font-bold border-2 border-gray-600"
            style={{
              background: "#e8e8e8",
              width: "clamp(76px,6vw,96px)",
              height: "clamp(28px,2.4vh,34px)",
              fontSize: "clamp(12px,1.1vw,15px)",
            }}
          >
            Previous
          </button>
        </div>

        {/* Date / Invoice / Supplier fields */}
        <div className="flex flex-col" style={{ gap: 3 }}>
          {/* Inv Date */}
          <div className="flex items-center">
            <span
              style={{
                width: "clamp(86px,7vw,110px)",
                fontSize: "clamp(12px,1.1vw,14px)",
                fontWeight: 700,
                color: "#111",
                whiteSpace: "nowrap",
              }}
            >
              Inv. Date
            </span>
            <input
              ref={invDateRef}
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              onKeyUp={(e) => {
                if (e.key === "Enter") {
                  supplierRef.current?.focus();
                }
              }}
              style={HDR_INP}
            />
            <button
              style={{
                marginLeft: 2,
                width: 22,
                height: "clamp(26px,2.2vh,32px)",
                border: "1px solid #888",
                background: "#e8e8e8",
                fontSize: "clamp(11px,1vw,13px)",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              ?
            </button>
          </div>
          {/* Invoice No */}
          <div className="flex items-center">
            <span
              style={{
                width: "clamp(86px,7vw,110px)",
                fontSize: "clamp(12px,1.1vw,14px)",
                fontWeight: 700,
                color: "#111",
                whiteSpace: "nowrap",
              }}
            >
              Invoice No.
            </span>
            <input
              readOnly
              value={invoiceNo}
              style={{
                ...HDR_INP,
                background: "#e0e0e0",
                cursor: "default",
                fontWeight: 900,
                color: "#1a4d00",
              }}
            />
            <span
              style={{
                marginLeft: 4,
                fontSize: "clamp(10px,0.9vw,12px)",
                color: "#666",
                fontStyle: "italic",
              }}
            >
              (Auto)
            </span>
          </div>
          {/* Receive Date */}
          <div className="flex items-center">
            <span
              style={{
                width: "clamp(86px,7vw,110px)",
                fontSize: "clamp(12px,1.1vw,14px)",
                fontWeight: 700,
                color: "#111",
                whiteSpace: "nowrap",
              }}
            >
              Receive Date
            </span>
            <input
              ref={receiveDateRef}
              type="date"
              value={receiveDate}
              onChange={(e) => setReceiveDate(e.target.value)}
              onKeyUp={(e) => {
                if (e.key === "Enter") {
                  supplierRef.current?.focus();
                }
              }}
              style={HDR_INP}
            />
            <button
              style={{
                marginLeft: 2,
                width: 22,
                height: "clamp(26px,2.2vh,32px)",
                border: "1px solid #888",
                background: "#e8e8e8",
                fontSize: "clamp(11px,1vw,13px)",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              ?
            </button>
          </div>
          {/* Supplier */}
          <div className="flex items-center" style={{ position: "relative" }}>
            <span
              style={{
                width: "clamp(86px,7vw,110px)",
                fontSize: "clamp(12px,1.1vw,14px)",
                fontWeight: 700,
                color: "#111",
                whiteSpace: "nowrap",
              }}
            >
              Supplier
            </span>
            <div style={{ position: "relative", display: "inline-block" }}>
              <input
                ref={supplierRef}
                value={supplier}
                onChange={(e) => {
                  setSupplier(e.target.value);
                  setSupplierId(null);
                  setShowSupplierDrop(true);
                  setSupplierHighlight(-1);
                }}
                onFocus={() => {
                  setShowSupplierDrop(true);
                  setSupplierHighlight(-1);
                }}
                onClick={() => {
                  setShowSupplierDrop(true);
                  setSupplierHighlight(-1);
                }}
                onBlur={() =>
                  setTimeout(() => {
                    setShowSupplierDrop(false);
                    setSupplierHighlight(-1);
                  }, 200)
                }
                onKeyDown={(e) => {
                  const q = supplier.trim().toLowerCase();
                  const matches = allSuppliers.filter((s) =>
                    s.name.toLowerCase().includes(q),
                  );
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setShowSupplierDrop(true);
                    setSupplierHighlight((prev) =>
                      Math.min(prev + 1, matches.length - 1),
                    );
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setSupplierHighlight((prev) => Math.max(prev - 1, -1));
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    if (supplierHighlight >= 0 && matches[supplierHighlight]) {
                      const sel = matches[supplierHighlight];
                      setSupplier(sel.name);
                      setSupplierId(sel.id || null);
                      setShowSupplierDrop(false);
                      setSupplierHighlight(-1);
                      setTimeout(() => barcodeRef.current?.focus(), 50);
                    } else {
                      setShowSupplierDrop(false);
                      setSupplierHighlight(-1);
                      barcodeRef.current?.focus();
                    }
                  } else if (e.key === "Escape") {
                    setShowSupplierDrop(false);
                    setSupplierHighlight(-1);
                  }
                }}
                placeholder="Type to search supplier..."
                style={{ ...HDR_INP, width: "clamp(180px,16vw,260px)" }}
              />
              {showSupplierDrop &&
                (() => {
                  const q = supplier.trim().toLowerCase();
                  const matches = allSuppliers.filter((s) =>
                    s.name.toLowerCase().includes(q),
                  );
                  return matches.length > 0 ? (
                    <div
                      ref={supplierDropRef}
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        zIndex: 9999,
                        background: "#fff",
                        border: "2px solid #6366f1",
                        borderRadius: 6,
                        boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
                        minWidth: "clamp(180px,16vw,260px)",
                        maxHeight: 220,
                        overflowY: "auto",
                      }}
                    >
                      {matches.map((s, idx) => (
                        <div
                          key={s.id || idx}
                          onMouseDown={() => {
                            setSupplier(s.name);
                            setSupplierId(s.id || null);
                            setShowSupplierDrop(false);
                            setSupplierHighlight(-1);
                            setTimeout(() => barcodeRef.current?.focus(), 50);
                          }}
                          style={{
                            padding: "7px 14px",
                            cursor: "pointer",
                            fontSize: "clamp(12px,1.1vw,14px)",
                            fontWeight: 500,
                            borderBottom: "1px solid #f0f0f0",
                            background:
                              idx === supplierHighlight ? "#ede9fe" : "#fff",
                          }}
                          onMouseEnter={(e) => {
                            setSupplierHighlight(idx);
                          }}
                          onMouseLeave={(e) => {
                            setSupplierHighlight(-1);
                          }}
                        >
                          {s.name}
                        </div>
                      ))}
                    </div>
                  ) : null;
                })()}
            </div>
          </div>
        </div>

        {/* Testing Item info */}
        <div
          className="flex flex-col ml-2 shrink-0 justify-center"
          style={{ gap: 6 }}
        >
          {(() => {
            const cnt = medicines.filter((r) => r.isTesting && r.name).length;
            return cnt > 0 ? (
              <div
                style={{
                  background: "#f97316",
                  color: "#fff",
                  fontWeight: 900,
                  fontSize: "clamp(12px,1.1vw,14px)",
                  padding: "4px 10px",
                  borderRadius: 4,
                  border: "2px solid #c2410c",
                  whiteSpace: "nowrap",
                }}
              >
                ⚗ {cnt} Testing Item{cnt > 1 ? "s" : ""}
              </div>
            ) : (
              <div
                style={{
                  fontSize: "clamp(11px,1vw,13px)",
                  color: "#888",
                  fontStyle: "italic",
                  whiteSpace: "nowrap",
                }}
              >
                No testing items
              </div>
            );
          })()}
          <div style={{ fontSize: "clamp(10px,0.9vw,12px)", color: "#555" }}>
            Use ☑ in <strong style={{ color: "#111" }}>Test</strong> column
          </div>
        </div>

        {/* Right side buttons */}
        <div className="flex flex-col ml-4" style={{ gap: 3 }}>
          <button
            onClick={createNewInvoice}
            className="px-3 font-bold border-2 border-gray-600 whitespace-nowrap"
            style={{
              background: "#e8e8e8",
              fontSize: "clamp(12px,1.1vw,15px)",
              height: "clamp(28px,2.4vh,34px)",
            }}
          >
            Add New Invoice
          </button>
          <button
            onClick={showAllInvoices}
            className="px-3 font-bold border-2 border-gray-600 whitespace-nowrap"
            style={{
              background: "#e8e8e8",
              fontSize: "clamp(12px,1.1vw,15px)",
              height: "clamp(28px,2.4vh,34px)",
            }}
          >
            Show All Invoices
          </button>
          <div style={{ marginTop: 4 }}>
            <div
              style={{
                fontSize: "clamp(12px,1.1vw,14px)",
                fontWeight: 700,
                color: "#111",
                marginBottom: 2,
              }}
            >
              Search by P Inv No.
            </div>
            <input
              value={searchInvoice}
              onChange={(e) => setSearchInvoice(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  searchInvoices(searchInvoice);
                }
              }}
              style={{ ...HDR_INP, width: "clamp(100px,8vw,140px)" }}
            />
          </div>
        </div>
      </div>
      {/* ══════ BARCODE + STOCK ROW ══════ */}
      <div
        className="shrink-0 flex items-center gap-3 px-2 py-0.5"
        style={{ background: "#e8c840", borderBottom: "1px solid #b89800" }}
      >
        <span
          className="font-bold text-red-700 w-16"
          style={{ fontSize: "clamp(13px,1.2vw,16px)" }}
        >
          Barcode
        </span>
        <input
          ref={barcodeRef}
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              searchByBarcode();
              setTimeout(() => productNameRefs.current[0]?.focus(), 100);
            }
          }}
          style={{
            height: "clamp(26px,2.2vh,32px)",
            border: "1px solid #555",
            padding: "0 8px",
            fontSize: "clamp(13px,1.2vw,16px)",
            width: "clamp(200px,22vw,360px)",
            background: "#fff",
          }}
        />
        <span
          className="ml-auto font-bold"
          style={{ fontSize: "clamp(12px,1.1vw,15px)" }}
        >
          Stock
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: "clamp(12px,1.1vw,14px)", fontWeight: 700 }}>
            Packs
          </span>
          <input
            readOnly
            style={{
              ...HDR_INP,
              width: "clamp(50px,4vw,70px)",
              background: "#e0e0e0",
              fontWeight: 900,
              color: "#1a4d00",
            }}
            value={
              medicines.reduce((s, r) => s + (Number(r.quantity) || 0), 0) || ""
            }
          />
          <span style={{ fontSize: "clamp(12px,1.1vw,14px)", fontWeight: 700 }}>
            containing
          </span>
          <span style={{ fontSize: "clamp(12px,1.1vw,14px)", fontWeight: 700 }}>
            Pieces
          </span>
          <input
            readOnly
            style={{
              ...HDR_INP,
              width: "clamp(50px,4vw,70px)",
              background: "#e0e0e0",
              fontWeight: 900,
              color: "#1a4d00",
            }}
            value={
              medicines.reduce((s, r) => s + getTotals(r).totalPieces, 0) || ""
            }
          />
        </div>
      </div>
      {/* ══════ TABLE PANEL ══════ */}
      <div
        className="flex-1 min-h-0 flex flex-col px-3 pb-1"
        style={{ background: "#e8c840" }}
      >
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            border: "2px solid #444",
            background: "#fff",
          }}
        >
          {/* Scrollable table + X column */}
          <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
            {/* Scrollable table */}
            <div
              style={{
                flex: 1,
                minWidth: 0,
                overflowX: "auto",
                overflowY: "auto",
                backgroundImage:
                  "repeating-linear-gradient(to bottom, #fffde7 0px, #fffde7 33px, #edf5dc 33px, #edf5dc 66px)",
                backgroundAttachment: "local",
              }}
              ref={tableContainerRef}
            >
              <table
                className="w-full border-collapse"
                style={{
                  fontSize: "clamp(13px,1.15vw,15px)",
                  tableLayout: "fixed",
                  minWidth: 1150,
                }}
              >
                <colgroup>
                  <col style={{ width: "3.5%" }} />
                  <col style={{ width: "5%" }} />
                  <col style={{ width: "15%" }} />
                  <col style={{ width: "5%" }} />
                  <col style={{ width: "5%" }} />
                  <col style={{ width: "6.5%" }} />
                  <col style={{ width: "4.5%" }} />
                  <col style={{ width: "4.5%" }} />
                  <col style={{ width: "4%" }} />
                  <col style={{ width: "6.5%" }} />
                  <col style={{ width: "6.5%" }} />
                  <col style={{ width: "4.5%" }} />
                  <col style={{ width: "7.5%" }} />
                  <col style={{ width: "7.5%" }} />
                  <col style={{ width: "5.5%" }} />
                </colgroup>
                <thead className="sticky top-0 z-10">
                  <tr
                    style={{
                      background: "#1a3a1a",
                      borderBottom: "2px solid #0d2d0d",
                      color: "#fff",
                    }}
                  >
                    {[
                      "SNo.",
                      "ID(Auto)",
                      "Product",
                      "Pack",
                      "Pieces",
                      "Sale Price",
                      "Disc%",
                      "Extra%",
                      "GST",
                      "Pur Price",
                      "Batch",
                      "Bonus",
                      "Expiry",
                      "Gross Amt",
                      "Test",
                    ].map((h) => {
                      const req = [
                        "Product",
                        "Sale Price",
                        "Pur Price",
                        "Batch",
                        "Expiry",
                      ];
                      return (
                        <th
                          key={h}
                          className="py-1 px-1 border border-gray-700 text-center font-bold"
                          style={{
                            fontSize: "clamp(12px,1.1vw,14px)",
                            whiteSpace: "nowrap",
                            color: "#fff",
                            background:
                              h === "Test"
                                ? "#7c4a00"
                                : req.includes(h)
                                  ? "#2d5a1e"
                                  : undefined,
                          }}
                        >
                          {h}
                          {req.includes(h) && (
                            <span style={{ color: "#dc2626", fontWeight: 900 }}>
                              {" "}
                              *
                            </span>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {medicines.map((r, i) => {
                    const t = getTotals(r);
                    const autoPrice = (() => {
                      const sp = Number(r.sellingPrice) || 0;
                      if (sp > 0 && !r.purchaseRate) {
                        let p = sp * (1 - (Number(r.discount1) || 0) / 100);
                        p = p * (1 - (Number(r.discount2) || 0) / 100);
                        p = p * (1 + (Number(r.gst) || 0) / 100);
                        return p.toFixed(2);
                      }
                      return r.purchaseRate || "";
                    })();
                    const totalPieces =
                      (Number(r.quantity) || 0) * (Number(r.pack_size) || 1);
                    const rowName =
                      (typeof r.name === "object" ? r.name?.name : r.name) ||
                      "";
                    const isFilled = !!rowName.trim();
                    const hasAnyData =
                      isFilled ||
                      String(r.batch || "").trim() ||
                      String(r.expiry || "").trim() ||
                      Number(r.quantity) > 0 ||
                      Number(r.sellingPrice) > 0 ||
                      Number(r.purchaseRate) > 0;
                    const missingProduct = hasAnyData && !isFilled;
                    const missingSale =
                      isFilled && !(Number(r.sellingPrice) > 0);
                    const missingCost = isFilled && !(Number(autoPrice) > 0);
                    const missingBatch =
                      isFilled && !String(r.batch || "").trim();
                    const missingExpiry =
                      isFilled && !String(r.expiry || "").trim();
                    return (
                      <tr
                        key={i}
                        style={{
                          background: r.isTesting
                            ? "#ffe4b0"
                            : i % 2 === 0
                              ? "#fffde7"
                              : "#edf5dc",
                          height: "clamp(30px,2.8vh,36px)",
                          borderBottom: "1px solid #aaa",
                        }}
                      >
                        <td
                          style={{
                            padding: 0,
                            border: "1px solid #aaa",
                            textAlign: "center",
                            fontSize: "clamp(13px,1.1vw,15px)",
                            fontWeight: 700,
                          }}
                        >
                          {i + 1}
                        </td>
                        <td
                          style={{
                            padding: 0,
                            border: "1px solid #aaa",
                            textAlign: "center",
                            fontSize: "clamp(12px,1vw,14px)",
                            color: "#555",
                          }}
                        >
                          {r.product_id || ""}
                        </td>
                        <td
                          style={{
                            padding: 0,
                            border: missingProduct
                              ? "2px solid #dc2626"
                              : "1px solid #aaa",
                            background: missingProduct ? "#fff5f5" : undefined,
                          }}
                        >
                          <AutoComplete
                            value={{ id: r.product_id, name: r.name }}
                            ref={(el) => (productNameRefs.current[i] = el)}
                            onSelect={(val) =>
                              updateRow(
                                i,
                                {
                                  product_id: val?.id,
                                  name: val?.category
                                    ? `${val.category} ${val.name}`
                                    : val?.name,
                                  pack_size: val?.pack_size || 1,
                                  batch: val?.batch_no || "",
                                  expiry: val?.expiry_date
                                    ? val.expiry_date.split("T")[0]
                                    : "",
                                  discount1: val
                                    ? String(
                                        Number(val.purchase_percent) > 0
                                          ? val.purchase_percent
                                          : 14.5,
                                      )
                                    : "",
                                },
                                { checkAdd: true },
                              )
                            }
                            onEnter={() => packRefs.current[i]?.focus()}
                            supplierId={supplierId}
                            allItems={availableProducts}
                            placeholder=""
                            allowCreate={false}
                            fullScreenList={true}
                            stockData={stockData}
                            inputStyle={TBL_CELL}
                            inputClassName=""
                          />
                        </td>
                        <td style={{ padding: 0, border: "1px solid #aaa" }}>
                          <input
                            ref={(el) => (packRefs.current[i] = el)}
                            type="number"
                            value={r.quantity}
                            onChange={(e) =>
                              updateRow(i, { quantity: e.target.value })
                            }
                            onKeyDown={(e) => navigateCell(e, i, 1)}
                            style={TBL_CELL}
                          />
                        </td>
                        <td style={{ padding: 0, border: "1px solid #aaa" }}>
                          <input
                            readOnly
                            value={totalPieces || ""}
                            style={{ ...TBL_CELL, background: "transparent" }}
                          />
                        </td>
                        <td
                          style={{
                            padding: 0,
                            border: missingSale
                              ? "2px solid #dc2626"
                              : "1px solid #aaa",
                            background: missingSale ? "#fff5f5" : undefined,
                          }}
                        >
                          <input
                            ref={(el) => (salePriceRefs.current[i] = el)}
                            type="number"
                            value={r.sellingPrice}
                            onChange={(e) =>
                              updateRow(i, { sellingPrice: e.target.value })
                            }
                            onKeyDown={(e) => navigateCell(e, i, 2)}
                            style={TBL_CELL}
                          />
                        </td>
                        <td style={{ padding: 0, border: "1px solid #aaa" }}>
                          <input
                            ref={(el) => (disc1Refs.current[i] = el)}
                            type="number"
                            value={r.discount1}
                            onChange={(e) =>
                              updateRow(i, { discount1: e.target.value })
                            }
                            onKeyDown={(e) => navigateCell(e, i, 3)}
                            style={TBL_CELL}
                          />
                        </td>
                        <td style={{ padding: 0, border: "1px solid #aaa" }}>
                          <input
                            ref={(el) => (disc2Refs.current[i] = el)}
                            type="number"
                            value={r.discount2}
                            onChange={(e) =>
                              updateRow(i, { discount2: e.target.value })
                            }
                            onKeyDown={(e) => navigateCell(e, i, 4)}
                            style={TBL_CELL}
                          />
                        </td>
                        <td style={{ padding: 0, border: "1px solid #aaa" }}>
                          <input
                            ref={(el) => (gstRefs.current[i] = el)}
                            type="number"
                            value={r.gst}
                            onChange={(e) =>
                              updateRow(i, { gst: e.target.value })
                            }
                            onKeyDown={(e) => navigateCell(e, i, 5)}
                            style={TBL_CELL}
                          />
                        </td>
                        <td
                          style={{
                            padding: 0,
                            border: missingCost
                              ? "2px solid #dc2626"
                              : "1px solid #aaa",
                            background: missingCost ? "#fff5f5" : undefined,
                          }}
                        >
                          <input
                            ref={(el) => (purPriceRefs.current[i] = el)}
                            type="number"
                            value={autoPrice}
                            onChange={(e) =>
                              updateRow(i, { purchaseRate: e.target.value })
                            }
                            onKeyDown={(e) => navigateCell(e, i, 6)}
                            style={TBL_CELL}
                          />
                        </td>
                        <td
                          style={{
                            padding: 0,
                            border: missingBatch
                              ? "2px solid #dc2626"
                              : "1px solid #aaa",
                            background: missingBatch ? "#fff5f5" : undefined,
                          }}
                        >
                          <input
                            ref={(el) => (batchRefs.current[i] = el)}
                            value={r.batch}
                            onChange={(e) =>
                              updateRow(i, { batch: e.target.value })
                            }
                            onKeyDown={(e) => navigateCell(e, i, 7)}
                            style={TBL_CELL}
                          />
                        </td>
                        <td style={{ padding: 0, border: "1px solid #aaa" }}>
                          <input
                            ref={(el) => (bonusRefs.current[i] = el)}
                            type="number"
                            value={r.bonusQty}
                            onChange={(e) =>
                              updateRow(i, { bonusQty: e.target.value })
                            }
                            onKeyDown={(e) => navigateCell(e, i, 8)}
                            style={TBL_CELL}
                          />
                        </td>
                        <td
                          style={{
                            padding: 0,
                            border: missingExpiry
                              ? "2px solid #dc2626"
                              : "1px solid #aaa",
                            background: missingExpiry ? "#fff5f5" : undefined,
                          }}
                        >
                          <input
                            ref={(el) => (expiryRefs.current[i] = el)}
                            type="date"
                            value={r.expiry}
                            onChange={(e) =>
                              updateRow(i, { expiry: e.target.value })
                            }
                            onKeyDown={(e) => {
                              // For date inputs, only intercept Enter/Left/Right for navigation
                              // to avoid fighting browser's date picker on Up/Down
                              if (e.key === "Enter" || e.key === "ArrowRight") {
                                e.preventDefault();
                                // End of row → go directly to next row's product name
                                const nextRow = i + 1;
                                if (nextRow < medicines.length) {
                                  COLS[0].current[nextRow]?.focus();
                                } else {
                                  setMedicines((p) => [...p, emptyRow()]);
                                  setTimeout(
                                    () => COLS[0].current[i + 1]?.focus(),
                                    50,
                                  );
                                }
                              } else if (e.key === "ArrowLeft") {
                                e.preventDefault();
                                COLS[8].current[i]?.focus();
                              } else if (e.key === "ArrowDown") {
                                e.preventDefault();
                                if (i + 1 < medicines.length)
                                  COLS[9].current[i + 1]?.focus();
                              } else if (e.key === "ArrowUp") {
                                e.preventDefault();
                                if (i > 0) COLS[9].current[i - 1]?.focus();
                              }
                            }}
                            style={{
                              ...TBL_CELL,
                              fontSize: "clamp(12px,1vw,14px)",
                            }}
                          />
                        </td>
                        <td
                          style={{
                            padding: "0 5px",
                            border: "1px solid #aaa",
                            textAlign: "right",
                            fontSize: "clamp(13px,1.1vw,15px)",
                            fontWeight: 700,
                          }}
                        >
                          {t.finalAmt > 0 ? t.finalAmt.toFixed(2) : ""}
                        </td>
                        <td
                          style={{
                            padding: 0,
                            border: "1px solid #aaa",
                            textAlign: "center",
                            background: r.isTesting ? "#ea580c" : "transparent",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={!!r.isTesting}
                            onChange={(e) =>
                              updateRow(i, { isTesting: e.target.checked })
                            }
                            title={
                              r.isTesting
                                ? "Testing item — will be returned"
                                : "Mark as testing item"
                            }
                            style={{
                              width: 14,
                              height: 14,
                              accentColor: "#e05000",
                              cursor: "pointer",
                            }}
                          />
                          {r.isTesting && (
                            <span
                              style={{
                                display: "block",
                                fontSize: "clamp(8px,0.65vw,10px)",
                                fontWeight: 900,
                                color: "#fff",
                                lineHeight: 1,
                                letterSpacing: 0.5,
                              }}
                            >
                              TEST
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* X delete buttons column — fixed width outside scroll */}
            <div
              className="shrink-0 flex flex-col"
              style={{
                width: 26,
                background: "#e8e8e8",
                borderLeft: "1px solid #aaa",
              }}
            >
              <div
                style={{
                  height: "clamp(30px,2.8vh,36px)",
                  background: "#1a3a1a",
                  borderBottom: "2px solid #0d2d0d",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#fff",
                }}
              >
                ✕
              </div>
              {medicines.length === 0 && (
                <div style={{ height: "clamp(30px,2.8vh,36px)" }} />
              )}
              {medicines.map((r, i) => (
                <div
                  key={i}
                  style={{
                    height: "clamp(30px,2.8vh,36px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderBottom: "1px solid #ccc",
                    background: r.isTesting
                      ? "#ffe4b0"
                      : i % 2 === 0
                        ? "#f0f0f0"
                        : "#e8e8e8",
                  }}
                >
                  <button
                    onClick={() =>
                      setMedicines((p) => p.filter((_, j) => j !== i))
                    }
                    style={{
                      width: 18,
                      height: 18,
                      background: "#e53e3e",
                      color: "#fff",
                      fontSize: 11,
                      fontWeight: 900,
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>{" "}
          {/* closes inner table+X flex row */}
          {/* ══════ TOTAL ROW (inside white panel) ══════ */}
          <div
            className="shrink-0 flex"
            style={{ borderTop: "2px solid #444", background: "#e8f0e8" }}
          >
            <div style={{ flex: 1, overflowX: "hidden" }}>
              <table
                className="w-full border-collapse"
                style={{ tableLayout: "fixed", minWidth: 1150 }}
              >
                <colgroup>
                  <col style={{ width: "3.5%" }} />
                  <col style={{ width: "5%" }} />
                  <col style={{ width: "15%" }} />
                  <col style={{ width: "5%" }} />
                  <col style={{ width: "5%" }} />
                  <col style={{ width: "6.5%" }} />
                  <col style={{ width: "4.5%" }} />
                  <col style={{ width: "4.5%" }} />
                  <col style={{ width: "4%" }} />
                  <col style={{ width: "6.5%" }} />
                  <col style={{ width: "6.5%" }} />
                  <col style={{ width: "4.5%" }} />
                  <col style={{ width: "7.5%" }} />
                  <col style={{ width: "7.5%" }} />
                  <col style={{ width: "5.5%" }} />
                </colgroup>
                <tbody>
                  <tr>
                    <td
                      colSpan={4}
                      style={{
                        padding: "3px 6px",
                        fontWeight: 900,
                        fontSize: "clamp(13px,1.1vw,15px)",
                        textAlign: "right",
                        border: "1px solid #90a020",
                      }}
                    >
                      Total
                    </td>
                    <td
                      style={{
                        padding: "2px 4px",
                        border: "1px solid #90a020",
                        textAlign: "center",
                        fontWeight: 900,
                        fontSize: "clamp(13px,1.1vw,15px)",
                        background: "#80d8f0",
                      }}
                    >
                      {medicines.reduce(
                        (s, r) => s + getTotals(r).totalPieces,
                        0,
                      ) || ""}
                    </td>
                    <td
                      colSpan={7}
                      style={{
                        padding: "2px 8px",
                        border: "1px solid #6a9a6a",
                        textAlign: "right",
                        fontWeight: 700,
                        fontSize: "clamp(13px,1.1vw,15px)",
                        color: "#444",
                      }}
                    >
                      Gross Amount →
                    </td>
                    <td
                      colSpan={3}
                      style={{
                        padding: "2px 6px",
                        border: "1px solid #1a5c1a",
                        textAlign: "center",
                        fontWeight: 900,
                        fontSize: "clamp(14px,1.2vw,16px)",
                        background: "#1a5c1a",
                        color: "#fff",
                      }}
                    >
                      {medicines
                        .reduce((s, r) => s + getTotals(r).finalAmt, 0)
                        .toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div style={{ width: 26, flexShrink: 0, background: "#e8f0e8" }} />
          </div>{" "}
          {/* closes total row flex */}
        </div>{" "}
        {/* closes white panel */}
      </div>{" "}
      {/* closes yellow container */}
      {/* ══════ BOTTOM BAR ══════ */}
      <div
        className="shrink-0 flex items-center justify-center gap-3 py-2"
        style={{
          background: "#e8c840",
          borderTop: "2px solid #b89800",
          minHeight: "clamp(56px,6vh,72px)",
        }}
      >
        <button
          style={{
            background: "#e0e0e0",
            border: "2px solid #888",
            fontWeight: 700,
            fontSize: "clamp(13px,1.2vw,16px)",
            height: "clamp(32px,2.8vh,40px)",
            padding: "0 16px",
            cursor: "pointer",
          }}
        >
          Print BarCode 1x1
        </button>
        <button
          style={{
            background: "#e0e0e0",
            border: "2px solid #888",
            fontWeight: 700,
            fontSize: "clamp(13px,1.2vw,16px)",
            height: "clamp(32px,2.8vh,40px)",
            padding: "0 16px",
            cursor: "pointer",
          }}
        >
          Products
        </button>
        <button
          onClick={handleSubmit}
          style={{
            background: "linear-gradient(135deg,#1a6b1a,#22a022)",
            border: "2px solid #145214",
            fontWeight: 900,
            fontSize: "clamp(13px,1.2vw,16px)",
            height: "clamp(32px,2.8vh,40px)",
            padding: "0 28px",
            cursor: "pointer",
            color: "#fff",
            letterSpacing: 1,
          }}
        >
          Save
        </button>
        <button
          style={{
            background: "#e0e0e0",
            border: "2px solid #888",
            fontWeight: 700,
            fontSize: "clamp(13px,1.2vw,16px)",
            height: "clamp(32px,2.8vh,40px)",
            padding: "0 16px",
            cursor: "pointer",
          }}
        >
          Print Report
        </button>
      </div>
      {/* ══════ INVOICE LIST MODAL ══════ */}
      {showInvoiceList && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-[600px] max-h-[80vh] flex flex-col border-2 border-gray-400">
            <div
              className="p-3 border-b flex justify-between items-center"
              style={{ background: "#1a5c1a" }}
            >
              <span className="font-black text-[15px] text-white">
                Previous Invoices
              </span>
              <button
                onClick={() => setShowInvoiceList(false)}
                className="text-white font-bold text-xl leading-none"
              >
                ✕
              </button>
            </div>
            <div className="p-3 flex gap-2">
              <input
                value={searchInvoice}
                onChange={(e) => setSearchInvoice(e.target.value)}
                placeholder="Search invoice no..."
                className="flex-1 border border-gray-400 px-2 py-1 text-[12px]"
              />
              <button
                onClick={() => searchInvoices(searchInvoice)}
                className="px-3 py-1 bg-blue-600 text-white text-[12px] font-bold rounded"
              >
                Search
              </button>
              <button
                onClick={() => {
                  setSearchInvoice("");
                  showAllInvoices();
                }}
                className="px-3 py-1 bg-gray-500 text-white text-[12px] font-bold rounded"
              >
                All
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {invoiceList.length === 0 ? (
                <div className="p-6 text-center text-gray-400">
                  No invoices found.
                </div>
              ) : (
                invoiceList
                  .filter(
                    (inv) =>
                      !searchInvoice ||
                      String(inv.invoice_no).includes(searchInvoice),
                  )
                  .map((inv, i) => (
                    <div
                      key={i}
                      className="p-3 border-t hover:bg-gray-50 cursor-pointer flex justify-between items-center"
                      onClick={() => viewInvoiceDetails(inv)}
                    >
                      <div>
                        <div className="font-bold text-blue-700">
                          Invoice #{inv.invoice_no}
                        </div>
                        <div className="text-[12px] text-gray-600">
                          {inv.supplier_name} — {inv.purchase_date}
                        </div>
                        <div className="text-[12px] font-bold text-green-700">
                          Rs. {inv.total_amount || 0}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          reprintInvoice(inv);
                        }}
                        className="px-3 py-1 bg-green-500 text-white text-[11px] font-bold rounded"
                      >
                        Reprint
                      </button>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}
      {/* ══════ CONFIRM MODAL ══════ */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-80 text-center border-2 border-gray-400">
            <h2 className="text-[16px] font-black mb-4">Confirm Purchase</h2>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => savePurchase(false)}
                className="py-2 bg-green-600 text-white font-bold rounded"
              >
                Save Only
              </button>
              <button
                onClick={() => savePurchase(true)}
                className="py-2 bg-blue-600 text-white font-bold rounded"
              >
                Save &amp; Print
              </button>
              <button
                onClick={() => setShowConfirmation(false)}
                className="py-2 bg-gray-500 text-white font-bold rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ══════ INVOICE VIEWER MODAL ══════ */}
      {showInvoiceViewer && viewingInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-[700px] max-h-[85vh] flex flex-col border-2 border-gray-400">
            <div
              className="p-3 border-b flex justify-between items-center"
              style={{ background: "#1a5c1a" }}
            >
              <span className="font-black text-[15px] text-white">
                Invoice #{viewingInvoice.invoice_no} —{" "}
                {viewingInvoice.supplier_name}
              </span>
              <button
                onClick={() => {
                  setShowInvoiceViewer(false);
                  setViewingInvoice(null);
                  setSearchInvoice("");
                }}
                className="font-bold text-xl"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <table className="w-full border-collapse text-[12px]">
                <thead>
                  <tr style={{ background: "#c8d840" }}>
                    {["Product", "Qty", "Unit Price", "Total"].map((h) => (
                      <th
                        key={h}
                        className="p-2 border border-gray-400 font-bold"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {viewingInvoice.items.map((item, i) => (
                    <tr
                      key={i}
                      style={{ background: i % 2 === 0 ? "#fff" : "#f4fad0" }}
                    >
                      <td className="p-2 border border-gray-300">
                        {item.product_name}
                      </td>
                      <td className="p-2 border border-gray-300 text-center">
                        {item.qty}
                      </td>
                      <td className="p-2 border border-gray-300 text-right">
                        {Number(item.unit_price || 0).toFixed(2)}
                      </td>
                      <td className="p-2 border border-gray-300 text-right font-bold">
                        {(item.qty * (item.unit_price || 0)).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div
              className="p-3 border-t flex justify-between items-center"
              style={{ background: "#1a5c1a" }}
            >
              <span className="font-black text-white">
                Grand Total: Rs.{" "}
                {viewingInvoice.items
                  .reduce((s, it) => s + it.qty * (it.unit_price || 0), 0)
                  .toFixed(2)}
              </span>
              <button
                onClick={() => reprintInvoice(viewingInvoice)}
                className="px-4 py-1.5 bg-green-600 text-white font-bold rounded text-[12px]"
              >
                Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
