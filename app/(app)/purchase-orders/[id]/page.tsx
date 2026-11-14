'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import Status from '@/components/Status';
import LoadingSpinner from '@/components/LoadingSpinner';
import GRNPrintModal from '@/components/GRNPrintModal';
import { apiCall, date, money, qty, useData } from '@/lib/client';

export default function PODetail({ params }: { params: { id: string } }) {
  const { data: po, reload } = useData<any>(`/api/purchase-orders/${params.id}`);
  const { data: user } = useData<any>('/api/auth/me');
  const { data: lookups } = useData<any>('/api/lookups');
  const [rcv, setRcv] = useState<Record<number, { r: string; x: string; batch?: string; expiry?: string; bin_id?: string }>>({});
  const [inv, setInv] = useState('');
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  const [selectedGrnForPrint, setSelectedGrnForPrint] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setRcv({});
  }, [po?.status]);

  const act = async (path: string, body?: any, msg = 'Done') => {
    setErr('');
    setOk('');
    setBusy(true);
    try {
      const r = await apiCall(`/api/purchase-orders/${params.id}/${path}`, 'POST', body);
      setOk(r.grn_number ? `GRN ${r.grn_number} posted — stock updated` : msg);
      reload();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!po) {
    return (
      <div className="card" style={{ padding: 0 }}>
        <LoadingSpinner message="Loading purchase order details…" minHeight={320} />
      </div>
    );
  }

  const isManagerOrAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const canReceive = ['APPROVED', 'PARTIAL'].includes(po.status);
  const whBins = (lookups?.bins || []).filter((b: any) => String(b.warehouse_id) === String(po.warehouse_id));

  return (
    <>
      <div className="topbar">
        <h1>
          {po.po_number} <Status s={po.status} />
        </h1>
        <div className="row">
          <Link className="btn" href="/purchase-orders">
            ← Back
          </Link>
          <button className="btn" onClick={() => window.print()}>
            Print
          </button>
          {po.status === 'DRAFT' && isManagerOrAdmin && (
            <button
              className={`btn primary ${busy ? 'loading' : ''}`}
              disabled={busy}
              onClick={() => act('approve', undefined, 'PO approved')}
            >
              {busy && <span className="btn-spinner" />}
              {busy ? 'Approving…' : 'Approve'}
            </button>
          )}
          {['DRAFT', 'APPROVED'].includes(po.status) && isManagerOrAdmin && (
            <button
              className="btn danger"
              disabled={busy}
              onClick={() => act('cancel', undefined, 'PO cancelled')}
            >
              Cancel
            </button>
          )}
        </div>
      </div>
      {err && <div className="err">{err}</div>}
      {ok && <div className="ok">{ok}</div>}
      <div className="grid g4">
        <div className="card">
          <div className="muted">Vendor</div>
          <b>{po.vendor}</b>
          <div className="muted">{po.vendor_gstin}</div>
        </div>
        <div className="card">
          <div className="muted">Warehouse</div>
          <b>{po.warehouse}</b>
        </div>
        <div className="card">
          <div className="muted">Order / Expected</div>
          <b>
            {date(po.order_date)} → {date(po.expected_date)}
          </b>
        </div>
        <div className="card">
          <div className="muted">Created / Approved by</div>
          <b>
            {po.created_by_name ?? '—'} / {po.approved_by_name ?? '—'}
          </b>
        </div>
      </div>
      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Product</th>
              <th className="num">Ordered</th>
              <th className="num">Received</th>
              <th className="num">Pending</th>
              <th className="num">Price</th>
              <th className="num">Tax%</th>
              <th className="num">Amount</th>
              {canReceive && (
                <>
                  <th className="num">Receive now</th>
                  <th className="num">Rejected</th>
                  <th>Batch / Lot #</th>
                  <th>Expiry Date</th>
                  <th>Put-away Bin</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {po.items.map((i: any) => {
              const pend = Number(i.qty_ordered) - Number(i.qty_received);
              return (
                <tr key={i.id}>
                  <td>{i.sku}</td>
                  <td>{i.name}</td>
                  <td className="num">{qty(i.qty_ordered)}</td>
                  <td className="num">{qty(i.qty_received)}</td>
                  <td className="num">{qty(pend)}</td>
                  <td className="num">{money(i.unit_price)}</td>
                  <td className="num">{Number(i.tax_rate)}</td>
                  <td className="num">
                    {money(i.qty_ordered * i.unit_price * (1 + i.tax_rate / 100))}
                  </td>
                  {canReceive && (
                    <>
                      <td style={{ width: 110 }}>
                        <input
                          type="number"
                          step="any"
                          max={pend}
                          placeholder={String(pend)}
                          value={rcv[i.id]?.r ?? ''}
                          onChange={e =>
                            setRcv({
                              ...rcv,
                              [i.id]: { r: e.target.value, x: rcv[i.id]?.x ?? '' }
                            })
                          }
                          disabled={pend <= 0}
                        />
                      </td>
                      <td style={{ width: 90 }}>
                        <input
                          type="number"
                          step="any"
                          value={rcv[i.id]?.x ?? ''}
                          onChange={e =>
                            setRcv({
                              ...rcv,
                              [i.id]: {
                                ...rcv[i.id],
                                r: rcv[i.id]?.r ?? '',
                                x: e.target.value
                              }
                            })
                          }
                          disabled={pend <= 0}
                        />
                      </td>
                      <td style={{ width: 130 }}>
                        <input
                          placeholder="e.g. B-2026-01"
                          value={rcv[i.id]?.batch ?? ''}
                          onChange={e =>
                            setRcv({
                              ...rcv,
                              [i.id]: {
                                ...rcv[i.id],
                                r: rcv[i.id]?.r ?? '',
                                x: rcv[i.id]?.x ?? '',
                                batch: e.target.value
                              }
                            })
                          }
                          disabled={pend <= 0}
                        />
                      </td>
                      <td style={{ width: 140 }}>
                        <input
                          type="date"
                          value={rcv[i.id]?.expiry ?? ''}
                          onChange={e =>
                            setRcv({
                              ...rcv,
                              [i.id]: {
                                ...rcv[i.id],
                                r: rcv[i.id]?.r ?? '',
                                x: rcv[i.id]?.x ?? '',
                                expiry: e.target.value
                              }
                            })
                          }
                          disabled={pend <= 0}
                        />
                      </td>
                      <td style={{ width: 130 }}>
                        <select
                          value={rcv[i.id]?.bin_id ?? ''}
                          onChange={e =>
                            setRcv({
                              ...rcv,
                              [i.id]: {
                                ...rcv[i.id],
                                r: rcv[i.id]?.r ?? '',
                                x: rcv[i.id]?.x ?? '',
                                bin_id: e.target.value
                              }
                            })
                          }
                          disabled={pend <= 0}
                        >
                          <option value="">— bin —</option>
                          {whBins.map((b: any) => (
                            <option key={b.id} value={b.id}>
                              {b.code} ({b.description || 'General'})
                            </option>
                          ))}
                        </select>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <th colSpan={7} className="right">
                Subtotal / Tax / Total
              </th>
              <th className="num">
                {money(po.subtotal)} / {money(po.tax_total)} / <b>{money(po.total)}</b>
              </th>
              {canReceive && <th colSpan={5} />}
            </tr>
          </tfoot>
        </table>
      </div>
      {canReceive && (
        <div className="card row">
          <input
            placeholder="Vendor invoice no."
            value={inv}
            onChange={e => setInv(e.target.value)}
            style={{ width: 240 }}
          />
          <button
            className="btn"
            onClick={() =>
              setRcv(
                Object.fromEntries(
                  po.items.map((i: any) => [
                    i.id,
                    {
                      r: String(Number(i.qty_ordered) - Number(i.qty_received)),
                      x: ''
                    }
                  ])
                )
              )
            }
          >
            Fill all pending
          </button>
          <div className="spacer" />
          <button
            className="btn success"
            onClick={() =>
              act('receive', {
                invoice_no: inv,
                items: Object.entries(rcv).map(([k, v]) => ({
                  po_item_id: Number(k),
                  qty_received: Number(v.r || 0),
                  qty_rejected: Number(v.x || 0),
                  batch_no: v.batch || null,
                  expiry_date: v.expiry || null,
                  bin_id: v.bin_id ? Number(v.bin_id) : null
                }))
              })
            }
          >
            Post Goods Receipt (GRN)
          </button>
        </div>
      )}
      {po.grns.length > 0 && (
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>Goods Receipts (GRNs)</h3>
            <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
              {po.grns.length} receipt voucher{po.grns.length === 1 ? '' : 's'} on record
            </span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>GRN #</th>
                  <th>Received Date</th>
                  <th>Vendor Invoice</th>
                  <th>Received By</th>
                  <th>Items Count</th>
                  <th className="num">GRN Value</th>
                  <th style={{ width: 140, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {po.grns.map((g: any) => (
                  <tr key={g.id}>
                    <td><b>{g.grn_number}</b></td>
                    <td>{date(g.received_date || g.created_at)}</td>
                    <td>{g.invoice_no ? <span className="badge">{g.invoice_no}</span> : '—'}</td>
                    <td>{g.received_by_name || 'Store Keeper'}</td>
                    <td>{g.items?.length || 0} line{g.items?.length === 1 ? '' : 's'}</td>
                    <td className="num"><b>{money(g.total_value)}</b></td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn sm"
                        style={{ padding: '3px 9px', fontSize: 12, fontWeight: 600 }}
                        onClick={() => setSelectedGrnForPrint(g)}
                      >
                        View & Print Receipt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Printable Receipt Voucher Modal */}
      {selectedGrnForPrint && (
        <GRNPrintModal
          po={po}
          grn={selectedGrnForPrint}
          onClose={() => setSelectedGrnForPrint(null)}
        />
      )}
    </>
  );
}
