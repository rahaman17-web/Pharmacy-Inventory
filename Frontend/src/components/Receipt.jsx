import { useEffect, useState, useRef } from "react";
import api from "../api";

export default function Receipt({ saleId, onClose, autoPrint = false }) {
  const [data, setData] = useState(null);
  const printableRef = useRef(null);
  const autoPrintedRef = useRef(false);

  const paperWidthMm = Number(localStorage.getItem("receipt_paper_mm") || "80") || 80;

  useEffect(() => {
    if (!saleId) return;
    autoPrintedRef.current = false;
    async function load() {
      try {
        const { data } = await api.get(`/sales/${saleId}`);
        setData(data);
      } catch (err) {
        console.error(err);
        alert("Failed to load receipt");
      }
    }
    load();
  }, [saleId]);

  function handlePrint() {
    if (!printableRef.current) return;
    const css = `
      @page{size:${paperWidthMm}mm auto;margin:3mm}
      html,body{width:${paperWidthMm}mm;margin:0;padding:8px}
      body{font-family:Arial,sans-serif;color:#111}
    `;
    const printWindow = window.open("", "_blank", "width=700,height=900");
    printWindow.document.write(`<html><head><title>Receipt</title><style>${css}</style></head><body>` + printableRef.current.innerHTML + `</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  useEffect(() => {
    if (!autoPrint) return;
    if (!data) return;
    if (autoPrintedRef.current) return;
    // Defer a tick so the printable ref is ready
    const t = setTimeout(() => {
      autoPrintedRef.current = true;
      handlePrint();
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPrint, data]);

  if (!data) return null;

  const { sale, items } = data;

  const addressLine = "Near Bacha Khan Medical Complex Shamansoor";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-11/12 max-w-3xl max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-center mb-4 pb-3 border-b-2">
          <div>
            <div className="text-xl font-semibold">Zam Zam Pharmacy</div>
            <div className="text-sm text-gray-500">Invoice: {sale.id}</div>
            <div className="text-sm text-gray-500">Date: {new Date(sale.created_at).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })}</div>
            {sale.user && (
              <div className="text-sm text-gray-500">Salesman: {sale.user.username} {sale.user.role ? `(${sale.user.role})` : ''}</div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button onClick={handlePrint} className="px-4 py-2 bg-green-600 text-white rounded font-semibold hover:bg-green-700">Print</button>
            <button onClick={onClose} className="px-4 py-2 bg-gray-300 rounded font-semibold hover:bg-gray-400">Close</button>
          </div>
        </div>

        <div ref={printableRef}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '800' }}>Zam Zam Pharmacy</div>
              <div style={{ fontSize: '12px', color: '#666' }}>{addressLine}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '14px', fontWeight: '800' }}>INVOICE #{sale.id}</div>
              <div style={{ fontSize: '11px', color: '#666' }}>{new Date(sale.created_at).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })}</div>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #333', marginTop: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6' }}>
                <th style={{ border: '1px solid #333', padding: '10px 8px', textAlign: 'left', fontSize: '13px', fontWeight: '700' }}>Item</th>
                <th style={{ border: '1px solid #333', padding: '10px 8px', textAlign: 'left', fontSize: '13px', fontWeight: '700' }}>Batch</th>
                <th style={{ border: '1px solid #333', padding: '10px 8px', textAlign: 'right', fontSize: '13px', fontWeight: '700' }}>Qty</th>
                <th style={{ border: '1px solid #333', padding: '10px 8px', textAlign: 'right', fontSize: '13px', fontWeight: '700' }}>Unit (Rs)</th>
                <th style={{ border: '1px solid #333', padding: '10px 8px', textAlign: 'right', fontSize: '13px', fontWeight: '700' }}>Total (Rs)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#f9fafb' }}>
                  <td style={{ border: '1px solid #333', padding: '8px', fontSize: '12px' }}>{it.product_name}</td>
                  <td style={{ border: '1px solid #333', padding: '8px', fontSize: '12px' }}>{it.batch_no || "-"}</td>
                  <td style={{ border: '1px solid #333', padding: '8px', textAlign: 'right', fontSize: '12px' }}>{it.qty}</td>
                  <td style={{ border: '1px solid #333', padding: '8px', textAlign: 'right', fontSize: '12px' }}>{Number(it.unit_price).toFixed(2)}</td>
                  <td style={{ border: '1px solid #333', padding: '8px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>{(it.qty * it.unit_price).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                <td colSpan={4} style={{ border: '1px solid #333', padding: '8px', textAlign: 'right', fontSize: '13px', fontWeight: '600' }}>Subtotal</td>
                <td style={{ border: '1px solid #333', padding: '8px', textAlign: 'right', fontSize: '13px', fontWeight: '600' }}>Rs. {Number(sale.total).toFixed(2)}</td>
              </tr>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                <td colSpan={4} style={{ border: '1px solid #333', padding: '8px', textAlign: 'right', fontSize: '13px', fontWeight: '600' }}>Discount</td>
                <td style={{ border: '1px solid #333', padding: '8px', textAlign: 'right', fontSize: '13px', fontWeight: '600' }}>- Rs. {Number(sale.discount).toFixed(2)}</td>
              </tr>
              <tr style={{ backgroundColor: '#e5e7eb' }}>
                <td colSpan={4} style={{ border: '2px solid #333', padding: '10px 8px', textAlign: 'right', fontSize: '14px', fontWeight: '800' }}>Net Total</td>
                <td style={{ border: '2px solid #333', padding: '10px 8px', textAlign: 'right', fontSize: '14px', fontWeight: '800' }}>Rs. {Number(sale.net_total).toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>

          <div style={{ marginTop: '16px', borderTop: '1px dashed #999', paddingTop: '10px', fontSize: '12px', color: '#555' }}>
            <p style={{ margin: 0 }}>Note: Fridge items are not returnable after 3 hours.</p>
          </div>

          <div style={{ marginTop: '10px', fontSize: '14px', fontWeight: '800', textAlign: 'center', color: '#222' }}>
            Thanks For Visiting Us
          </div>
        </div>
      </div>
    </div>
  );
}
