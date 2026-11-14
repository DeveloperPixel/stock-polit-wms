'use client';

import { date, money, qty } from '@/lib/client';

export default function GRNPrintModal({
  po,
  grn,
  onClose
}: {
  po: any;
  grn: any;
  onClose: () => void;
}) {
  if (!grn) return null;

  return (
    <div className="modal-bg" onClick={onClose} style={{ zIndex: 120 }}>
      <div
        className="modal grn-printable-sheet"
        style={{ maxWidth: 740, padding: 30 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Action Controls (hidden in print) */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid var(--line)', paddingBottom: 14 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18 }}>Goods Receipt Note</h3>
            <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
              Receipt voucher for Purchase Order {po.po_number}
            </span>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button
              type="button"
              className="btn primary"
              onClick={() => window.print()}
              style={{ background: '#0B1F4B', borderColor: '#0B1F4B' }}
            >
              Print Receipt (PDF)
            </button>
            <button
              type="button"
              className="btn"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>

        {/* Printable Formal GRN Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0B1F4B', paddingBottom: 16, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#0B1F4B', letterSpacing: '-0.02em' }}>
              STOCKPILOT WMS
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              Warehouse Inbound Receiving & Quality Inspection
            </div>
            <div style={{ fontSize: 13, marginTop: 8 }}>
              <b>Warehouse:</b> {po.warehouse}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#0B1F4B' }}>
              {grn.grn_number}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>
              <b>Date:</b> {date(grn.received_date || grn.created_at)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              <b>PO Ref:</b> {po.po_number}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              <b>Vendor Invoice:</b> {grn.invoice_no || '—'}
            </div>
          </div>
        </div>

        {/* Vendor & Receiver Meta Boxes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
          <div style={{ border: '1px solid var(--line)', borderRadius: 8, padding: 12, background: '#f8fafc' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4 }}>
              Supplier / Vendor
            </div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{po.vendor}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              GSTIN: {po.vendor_gstin || '—'} | Email: {po.vendor_email || '—'}
            </div>
          </div>

          <div style={{ border: '1px solid var(--line)', borderRadius: 8, padding: 12, background: '#f8fafc' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4 }}>
              Receiving Inspector
            </div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{grn.received_by_name || 'Store Keeper'}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              Notes: {grn.notes || 'Goods received and inspected in sound condition.'}
            </div>
          </div>
        </div>

        {/* Itemized Table */}
        <div style={{ border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden', marginBottom: 20 }}>
          <table style={{ margin: 0, width: '100%', fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th style={{ padding: '8px 12px' }}>SKU</th>
                <th style={{ padding: '8px 12px' }}>Product Description</th>
                <th style={{ padding: '8px 12px' }}>Batch / Lot</th>
                <th style={{ padding: '8px 12px' }}>Bin Location</th>
                <th className="num" style={{ padding: '8px 12px' }}>Accepted</th>
                <th className="num" style={{ padding: '8px 12px' }}>Rejected</th>
                <th className="num" style={{ padding: '8px 12px' }}>Unit Cost</th>
                <th className="num" style={{ padding: '8px 12px' }}>Line Total</th>
              </tr>
            </thead>
            <tbody>
              {(grn.items || []).map((item: any, idx: number) => {
                const lineVal = Number(item.qty_received || 0) * Number(item.unit_cost || 0);
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td style={{ padding: '8px 12px' }}><b>{item.sku}</b></td>
                    <td style={{ padding: '8px 12px' }}>{item.name}</td>
                    <td style={{ padding: '8px 12px' }}>{item.batch_no || '—'}</td>
                    <td style={{ padding: '8px 12px' }}>
                      {item.bin_code ? <span className="badge">{item.bin_code}</span> : '—'}
                    </td>
                    <td className="num" style={{ padding: '8px 12px', color: '#047857', fontWeight: 700 }}>
                      {qty(item.qty_received)} {item.uom}
                    </td>
                    <td className="num" style={{ padding: '8px 12px', color: Number(item.qty_rejected) > 0 ? '#b91c1c' : 'var(--muted)' }}>
                      {qty(item.qty_rejected)}
                    </td>
                    <td className="num" style={{ padding: '8px 12px' }}>{money(item.unit_cost)}</td>
                    <td className="num" style={{ padding: '8px 12px' }}><b>{money(lineVal)}</b></td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: '#fafbfe', fontWeight: 700 }}>
                <td colSpan={7} style={{ textAlign: 'right', padding: '10px 12px' }}>
                  Total Received Valuation (excl. GST):
                </td>
                <td className="num" style={{ padding: '10px 12px', fontSize: 14, color: '#0B1F4B' }}>
                  {money(grn.total_value)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Verification Signatures Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginTop: 40, paddingTop: 10 }}>
          <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: 6, textAlign: 'center', fontSize: 12, color: 'var(--muted)' }}>
            Warehouse Store Keeper (Received By)
          </div>
          <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: 6, textAlign: 'center', fontSize: 12, color: 'var(--muted)' }}>
            Inventory Quality In-charge (Verified By)
          </div>
        </div>
      </div>
    </div>
  );
}
