'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import Status from '@/components/Status';
import { apiCall, date, money, qty, useData } from '@/lib/client';

export default function PODetail({ params }: { params: { id: string } }) {
  const { data: po, reload } = useData<any>(`/api/purchase-orders/${params.id}`);
  const { data: user } = useData<any>('/api/auth/me');
  const [rcv, setRcv] = useState<Record<number, { r: string; x: string }>>({});
  const [inv, setInv] = useState('');
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  useEffect(() => {
    setRcv({});
  }, [po?.status]);

  const act = async (path: string, body?: any, msg = 'Done') => {
    setErr('');
    setOk('');
    try {
      const r = await apiCall(`/api/purchase-orders/${params.id}/${path}`, 'POST', body);
      setOk(r.grn_number ? `GRN ${r.grn_number} posted — stock updated` : msg);
      reload();
    } catch (e: any) {
      setErr(e.message);
    }
  };

  if (!po) return <p>Loading…</p>;

  const isManagerOrAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const canReceive = ['APPROVED', 'PARTIAL'].includes(po.status);

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
              className="btn primary"
              onClick={() => act('approve', undefined, 'PO approved')}
            >
              Approve
            </button>
          )}
          {['DRAFT', 'APPROVED'].includes(po.status) && isManagerOrAdmin && (
            <button
              className="btn danger"
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
                              [i.id]: { r: rcv[i.id]?.r ?? '', x: e.target.value }
                            })
                          }
                          disabled={pend <= 0}
                        />
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
              {canReceive && <th colSpan={2} />}
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
                  qty_rejected: Number(v.x || 0)
                }))
              })
            }
          >
            Post Goods Receipt (GRN)
          </button>
        </div>
      )}
      {po.grns.length > 0 && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Goods receipts</h3>
          <table>
            <thead>
              <tr>
                <th>GRN #</th>
                <th>Date</th>
                <th>Invoice</th>
                <th className="num">Value</th>
              </tr>
            </thead>
            <tbody>
              {po.grns.map((g: any) => (
                <tr key={g.id}>
                  <td>{g.grn_number}</td>
                  <td>{date(g.received_date)}</td>
                  <td>{g.invoice_no ?? '—'}</td>
                  <td className="num">{money(g.total_value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
