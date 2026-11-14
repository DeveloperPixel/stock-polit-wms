'use client';
import Link from 'next/link';
import { useState } from 'react';
import Status from '@/components/Status';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useToast } from '@/components/Toast';
import { apiCall, date, money, qty, useData } from '@/lib/client';

export default function SODetail({ params }: { params: { id: string } }) {
  const { data: so, reload } = useData<any>(`/api/sales-orders/${params.id}`);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);
  const { success, error: toastErr } = useToast();

  const act = async (a: string, msg: string) => {
    setErr('');
    setOk('');
    setBusy(true);
    try {
      await apiCall(`/api/sales-orders/${params.id}/${a}`, 'POST');
      setOk(msg);
      success(msg);
      reload();
    } catch (e: any) {
      setErr(e.message);
      toastErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!so) {
    return (
      <div className="card" style={{ padding: 0 }}>
        <LoadingSpinner message="Loading sales order details…" minHeight={320} />
      </div>
    );
  }

  return (
    <>
      {/* On-screen Header & Controls (Hidden when printing) */}
      <div className="topbar no-print">
        <h1>
          {so.so_number} <Status s={so.status} />
        </h1>
        <div className="row">
          <Link className="btn" href="/sales-orders">
            ← Back
          </Link>
          <button className="btn" onClick={() => window.print()}>
            Print challan
          </button>
          {so.status === 'DRAFT' && (
            <button
              className={`btn primary ${busy ? 'loading' : ''}`}
              disabled={busy}
              onClick={() => act('confirm', 'Order confirmed — stock reserved')}
            >
              {busy && <span className="btn-spinner" />}
              {busy ? 'Reserving…' : 'Confirm & reserve'}
            </button>
          )}
          {so.status === 'CONFIRMED' && (
            <button
              className={`btn success ${busy ? 'loading' : ''}`}
              disabled={busy}
              onClick={() => act('dispatch', 'Dispatched — stock deducted')}
            >
              {busy && <span className="btn-spinner" />}
              {busy ? 'Dispatching…' : 'Dispatch'}
            </button>
          )}
          {['DRAFT', 'CONFIRMED'].includes(so.status) && (
            <button
              className="btn danger"
              disabled={busy}
              onClick={() => act('cancel', 'Order cancelled')}
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {err && <div className="err no-print">{err}</div>}
      {ok && <div className="ok no-print">{ok}</div>}

      {/* On-Screen Information Cards (Hidden when printing) */}
      <div className="grid g4 no-print">
        <div className="card">
          <div className="muted">Customer</div>
          <b>{so.customer}</b>
          <div className="muted">{so.customer_address}</div>
        </div>
        <div className="card">
          <div className="muted">Warehouse</div>
          <b>{so.warehouse}</b>
        </div>
        <div className="card">
          <div className="muted">Order date</div>
          <b>{date(so.order_date)}</b>
        </div>
        <div className="card">
          <div className="muted">Dispatched</div>
          <b>
            {so.dispatched_at ? new Date(so.dispatched_at).toLocaleString('en-IN') : '—'}
          </b>
        </div>
      </div>

      {/* ========================================================= */}
      {/* FORMAL DELIVERY CHALLAN (Visible ONLY when printing)     */}
      {/* ========================================================= */}
      <div className="formal-challan-print print-only">
        {/* Header with Company Logo & Challan Title */}
        <div className="challan-header">
          <div>
            <h2 className="challan-company">StockPilot WMS</h2>
            <div className="challan-sub">Warehouse &amp; Supply Chain Logistics</div>
          </div>
          <div className="challan-title-block">
            <h1 className="challan-main-title">DELIVERY CHALLAN</h1>
            <div className="challan-meta-item">
              <span>Challan / SO #:</span> <b>{so.so_number}</b>
            </div>
            <div className="challan-meta-item">
              <span>Date:</span> <b>{date(so.order_date)}</b>
            </div>
            <div className="challan-meta-item">
              <span>Status:</span> <b>{so.status}</b>
            </div>
          </div>
        </div>

        <hr className="challan-divider" />

        {/* Addresses: Dispatch From & Deliver To */}
        <div className="challan-address-grid">
          <div className="challan-box">
            <div className="challan-box-title">DISPATCHED FROM (WAREHOUSE):</div>
            <div className="challan-box-content">
              <b>{so.warehouse}</b>
              <div>StockPilot Logistics Facility</div>
              {so.dispatched_at && (
                <div style={{ marginTop: 4, fontSize: 11 }}>
                  Dispatched at: {new Date(so.dispatched_at).toLocaleString('en-IN')}
                </div>
              )}
            </div>
          </div>
          <div className="challan-box">
            <div className="challan-box-title">DELIVER TO (CONSIGNEE):</div>
            <div className="challan-box-content">
              <b>{so.customer}</b>
              <div>{so.customer_address || 'Address on file'}</div>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <table className="challan-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}>#</th>
              <th>SKU / Item Code</th>
              <th>Description of Goods</th>
              <th className="num">Quantity</th>
              <th className="num">Rate</th>
              <th className="num">Tax %</th>
              <th className="num">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {so.items.map((i: any, idx: number) => (
              <tr key={i.id}>
                <td>{idx + 1}</td>
                <td><b>{i.sku}</b></td>
                <td>{i.name}</td>
                <td className="num">
                  <b>{qty(i.qty)}</b> {i.uom}
                </td>
                <td className="num">{money(i.unit_price)}</td>
                <td className="num">{Number(i.tax_rate)}%</td>
                <td className="num">
                  {money(i.qty * i.unit_price * (1 + i.tax_rate / 100))}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5} className="challan-total-note">
                Goods dispatched in good condition. Subject to local jurisdiction.
              </td>
              <th className="right">Grand Total:</th>
              <th className="num">{money(so.total)}</th>
            </tr>
          </tfoot>
        </table>

        {/* Signatures section */}
        <div className="challan-signatures">
          <div className="challan-sig-block">
            <div className="challan-sig-line" />
            <div>Prepared By (Store Staff)</div>
          </div>
          <div className="challan-sig-block">
            <div className="challan-sig-line" />
            <div>Dispatched / Verified By</div>
          </div>
          <div className="challan-sig-block">
            <div className="challan-sig-line" />
            <div>Receiver's Signature &amp; Stamp</div>
          </div>
        </div>
      </div>

      {/* On-Screen Table View (Hidden when printing) */}
      <div className="card no-print" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Product</th>
              <th className="num">Qty</th>
              <th className="num">Available</th>
              <th className="num">Price</th>
              <th className="num">Tax%</th>
              <th className="num">Amount</th>
            </tr>
          </thead>
          <tbody>
            {so.items.map((i: any) => (
              <tr key={i.id}>
                <td>{i.sku}</td>
                <td>{i.name}</td>
                <td className="num">
                  {qty(i.qty)} {i.uom}
                </td>
                <td
                  className={`num ${
                    so.status === 'DRAFT' && Number(i.available) < Number(i.qty) ? 'low' : ''
                  }`}
                >
                  {qty(i.available)}
                </td>
                <td className="num">{money(i.unit_price)}</td>
                <td className="num">{Number(i.tax_rate)}</td>
                <td className="num">
                  {money(i.qty * i.unit_price * (1 + i.tax_rate / 100))}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th colSpan={6} className="right">
                Total
              </th>
              <th className="num">{money(so.total)}</th>
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
}
