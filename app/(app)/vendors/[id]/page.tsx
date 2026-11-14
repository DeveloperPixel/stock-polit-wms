'use client';

import Link from 'next/link';
import { useState } from 'react';
import Status from '@/components/Status';
import LoadingSpinner from '@/components/LoadingSpinner';
import { apiCall, date, money, useData } from '@/lib/client';
import { useToast } from '@/components/Toast';

export default function VendorDetail({ params }: { params: { id: string } }) {
  const id = params.id;
  const { data: v, reload: reloadV } = useData<any>(`/api/vendors/${id}`);
  const { data: items, reload: reloadItems } = useData<any[]>(`/api/vendors/${id}/products`);
  const { data: pos } = useData<any[]>(`/api/purchase-orders`);
  const { data: pays, reload: reloadPays } = useData<any[]>(`/api/vendor-payments?vendor_id=${id}`);
  const { data: lk } = useData<any>('/api/lookups');

  // Interactive inline editing row
  const [editingRow, setEditingRow] = useState<any | null>(null);
  const [newLink, setNewLink] = useState<any>({ product_id: '', unit_price: '', lead_time_days: 7, preferred: false });
  const [pay, setPay] = useState<any>({ amount: '', mode: 'BANK', reference: '' });
  const { success, error: toastErr } = useToast();

  const vpos = (pos ?? []).filter(p => String(p.vendor_id) === id);

  async function savePriceLink(payload: any) {
    try {
      await apiCall(`/api/vendors/${id}/products`, 'POST', payload);
      success('Price list updated successfully');
      setEditingRow(null);
      setNewLink({ product_id: '', unit_price: '', lead_time_days: 7, preferred: false });
      reloadItems();
    } catch (e: any) {
      toastErr(e.message);
    }
  }

  async function recordPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!pay.amount) return;
    try {
      await apiCall('/api/vendor-payments', 'POST', { ...pay, vendor_id: Number(id) });
      success('Payment recorded successfully');
      setPay({ amount: '', mode: 'BANK', reference: '' });
      reloadPays();
      reloadV();
    } catch (e: any) {
      toastErr(e.message);
    }
  }

  if (!v) {
    return (
      <div className="card" style={{ padding: 0 }}>
        <LoadingSpinner message="Loading vendor details…" minHeight={320} />
      </div>
    );
  }

  return (
    <>
      <div className="topbar">
        <div>
          <h1>
            {v.name} <span className="muted" style={{ fontSize: 14 }}>({v.code})</span>
          </h1>
          <p className="muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
            GSTIN: <b>{v.gstin || '—'}</b> | Contact: <b>{v.contact_person || '—'}</b> ({v.email || '—'}, {v.phone || '—'})
          </p>
        </div>
        <Link className="btn" href="/vendors">← Back to Vendors</Link>
      </div>

      <div className="grid g4">
        <div className="card kpi">
          <div className="label">Purchase Orders</div>
          <div className="val">{vpos.length}</div>
        </div>
        <div className="card kpi">
          <div className="label">Goods Received (GRN Value)</div>
          <div className="val">{money(v.total_received_value)}</div>
        </div>
        <div className="card kpi">
          <div className="label">Total Paid</div>
          <div className="val">{money(v.total_paid)}</div>
        </div>
        <div className="card kpi">
          <div className="label">Net Balance Due ({v.payment_terms_days}d terms)</div>
          <div className="val" style={{ color: Number(v.balance_due) > 0 ? '#b91c1c' : '#047857' }}>
            {money(v.balance_due)}
          </div>
        </div>
      </div>

      <div className="grid g2">
        {/* Interactive Vendor Price List Editor */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 15 }}>Vendor Price List & Lead Times</h3>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>
              {items?.length || 0} catalog {items?.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ fontSize: 13 }}>
              <thead>
                <tr>
                  <th>SKU / Product</th>
                  <th className="num">Unit Price</th>
                  <th className="num">Lead Days</th>
                  <th>Preferred</th>
                  <th style={{ width: 80, textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {(!items || items.length === 0) ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)', padding: 20 }}>
                      No products linked to this vendor yet. Add one below.
                    </td>
                  </tr>
                ) : (
                  items.map(i => {
                    const isEditing = editingRow?.product_id === i.product_id;

                    if (isEditing) {
                      return (
                        <tr key={i.product_id} style={{ background: '#f8fafc' }}>
                          <td>
                            <b>{i.sku}</b> <span className="muted" style={{ fontSize: 12 }}>{i.name}</span>
                          </td>
                          <td className="num">
                            <input
                              type="number"
                              step="any"
                              style={{ width: 90, textAlign: 'right', padding: '4px 6px', fontSize: 12 }}
                              value={editingRow.unit_price}
                              onChange={e => setEditingRow({ ...editingRow, unit_price: e.target.value })}
                            />
                          </td>
                          <td className="num">
                            <input
                              type="number"
                              style={{ width: 65, textAlign: 'right', padding: '4px 6px', fontSize: 12 }}
                              value={editingRow.lead_time_days}
                              onChange={e => setEditingRow({ ...editingRow, lead_time_days: e.target.value })}
                            />
                          </td>
                          <td>
                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, margin: 0, cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                style={{ width: 'auto' }}
                                checked={editingRow.preferred}
                                onChange={e => setEditingRow({ ...editingRow, preferred: e.target.checked })}
                              />
                              <span style={{ fontSize: 11 }}>Primary</span>
                            </label>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div className="row" style={{ justifyContent: 'flex-end', gap: 4 }}>
                              <button
                                type="button"
                                className="btn sm primary"
                                style={{ padding: '2px 7px', fontSize: 11 }}
                                onClick={() => savePriceLink(editingRow)}
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                className="btn sm"
                                style={{ padding: '2px 6px', fontSize: 11 }}
                                onClick={() => setEditingRow(null)}
                              >
                                ✕
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={i.product_id}>
                        <td>
                          <b>{i.sku}</b> <span className="muted" style={{ fontSize: 12 }}>{i.name}</span>
                        </td>
                        <td className="num"><b>{money(i.unit_price)}</b></td>
                        <td className="num">{i.lead_time_days}d</td>
                        <td>
                          {i.preferred ? (
                            <span className="badge b-APPROVED" style={{ fontSize: 11 }}>★ Primary</span>
                          ) : (
                            <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="btn sm"
                            style={{ padding: '2px 8px', fontSize: 11 }}
                            onClick={() => setEditingRow({ ...i })}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Add New Product to Vendor Link Form */}
          <div style={{ padding: '14px 18px', background: '#fafbfe', borderTop: '1px solid var(--line)' }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>
              + Link New Product to Price List
            </div>
            <div className="form">
              <select
                value={newLink.product_id}
                onChange={e => setNewLink({ ...newLink, product_id: e.target.value })}
              >
                <option value="">— select product to link —</option>
                {lk?.products.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.sku} · {p.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                step="any"
                placeholder="Negotiated Unit price (₹)"
                value={newLink.unit_price}
                onChange={e => setNewLink({ ...newLink, unit_price: e.target.value })}
              />
              <input
                type="number"
                placeholder="Lead time (days)"
                value={newLink.lead_time_days}
                onChange={e => setNewLink({ ...newLink, lead_time_days: e.target.value })}
              />
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <label className="row" style={{ cursor: 'pointer', margin: 0, fontWeight: 500 }}>
                  <input
                    type="checkbox"
                    style={{ width: 'auto' }}
                    checked={newLink.preferred}
                    onChange={e => setNewLink({ ...newLink, preferred: e.target.checked })}
                  />
                  <span>Mark as Preferred Supplier</span>
                </label>
              </div>
              <button
                type="button"
                className="btn primary"
                disabled={!newLink.product_id || !newLink.unit_price}
                onClick={() => savePriceLink(newLink)}
              >
                Add to Price List
              </button>
            </div>
          </div>
        </div>

        {/* Payments Recording & History */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)' }}>
            <h3 style={{ margin: 0, fontSize: 15 }}>Payment History</h3>
          </div>
          <div style={{ overflowX: 'auto', maxHeight: 220 }}>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Mode</th>
                  <th>Reference</th>
                  <th className="num">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(!pays || pays.length === 0) ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)', padding: 18 }}>
                      No payments recorded yet.
                    </td>
                  </tr>
                ) : (
                  pays.map(p => (
                    <tr key={p.id}>
                      <td>{date(p.paid_on)}</td>
                      <td><span className="badge">{p.mode}</span></td>
                      <td>{p.reference ?? '—'}</td>
                      <td className="num"><b>{money(p.amount)}</b></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <form onSubmit={recordPayment} style={{ padding: '14px 18px', background: '#fafbfe', borderTop: '1px solid var(--line)' }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>
              Record Payment to Vendor
            </div>
            <div className="form">
              <input
                required
                type="number"
                step="any"
                placeholder="Amount (₹)"
                value={pay.amount}
                onChange={e => setPay({ ...pay, amount: e.target.value })}
              />
              <select value={pay.mode} onChange={e => setPay({ ...pay, mode: e.target.value })}>
                {['BANK', 'UPI', 'CHEQUE', 'CASH'].map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <input
                placeholder="UTR / Cheque # / Ref"
                value={pay.reference}
                onChange={e => setPay({ ...pay, reference: e.target.value })}
              />
              <button type="submit" className="btn success">
                Record Payment
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Purchase Orders List */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)' }}>
          <h3 style={{ margin: 0, fontSize: 15 }}>Related Purchase Orders</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>PO #</th>
                <th>Order Date</th>
                <th>Status</th>
                <th className="num">Total Amount</th>
              </tr>
            </thead>
            <tbody>
              {vpos.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)', padding: 20 }}>
                    No purchase orders placed with this vendor.
                  </td>
                </tr>
              ) : (
                vpos.map(p => (
                  <tr key={p.id}>
                    <td><Link href={`/purchase-orders/${p.id}`}><b>{p.po_number}</b></Link></td>
                    <td>{date(p.order_date)}</td>
                    <td><Status s={p.status} /></td>
                    <td className="num"><b>{money(p.total)}</b></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
