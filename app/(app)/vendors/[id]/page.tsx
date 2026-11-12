'use client';
import Link from 'next/link';
import { useState } from 'react';
import Status from '@/components/Status';
import { apiCall, date, money, useData } from '@/lib/client';

export default function VendorDetail({ params }: { params: { id: string } }) {
  const id = params.id;
  const { data: v, reload: reloadV } = useData<any>(`/api/vendors/${id}`);
  const { data: items, reload: reloadItems } = useData<any[]>(`/api/vendors/${id}/products`);
  const { data: pos } = useData<any[]>(`/api/purchase-orders`);
  const { data: pays, reload: reloadPays } = useData<any[]>(`/api/vendor-payments?vendor_id=${id}`);
  const { data: lk } = useData<any>('/api/lookups');
  const [link, setLink] = useState<any>({ product_id: '', unit_price: '', lead_time_days: 7, preferred: false });
  const [pay, setPay] = useState<any>({ amount: '', mode: 'BANK', reference: '' });
  const [msg, setMsg] = useState(''); const [err, setErr] = useState('');
  const vpos = (pos ?? []).filter(p => String(p.vendor_id) === id);

  const act = async (fn: () => Promise<any>, ok: string) => {
    setErr(''); setMsg('');
    try { await fn(); setMsg(ok); } catch (e: any) { setErr(e.message); }
  };
  if (!v) return <p>Loading…</p>;
  return (
    <>
      <div className="topbar"><h1>{v.name} <span className="muted" style={{ fontSize: 14 }}>{v.code}</span></h1><Link className="btn" href="/vendors">← Vendors</Link></div>
      {err && <div className="err">{err}</div>}{msg && <div className="ok">{msg}</div>}
      <div className="grid g4">
        <div className="card kpi"><div className="label">Purchase orders</div><div className="val">{vpos.length}</div></div>
        <div className="card kpi"><div className="label">Goods received (incl. tax)</div><div className="val">{money(v.total_received_value)}</div></div>
        <div className="card kpi"><div className="label">Paid</div><div className="val">{money(v.total_paid)}</div></div>
        <div className="card kpi"><div className="label">Balance due · terms {v.payment_terms_days}d</div><div className="val">{money(v.balance_due)}</div></div>
      </div>
      <div className="grid g2">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Products supplied</h3>
          <table><thead><tr><th>SKU</th><th>Name</th><th className="num">Price</th><th className="num">Lead days</th><th>Preferred</th></tr></thead>
            <tbody>{items?.map(i => <tr key={i.product_id}><td>{i.sku}</td><td>{i.name}</td><td className="num">{money(i.unit_price)}</td><td className="num">{i.lead_time_days}</td><td>{i.preferred ? '★' : ''}</td></tr>)}</tbody></table>
          <div className="form" style={{ marginTop: 12 }}>
            <select value={link.product_id} onChange={e => setLink({ ...link, product_id: e.target.value })}>
              <option value="">— link product —</option>{lk?.products.map((p: any) => <option key={p.id} value={p.id}>{p.sku}</option>)}
            </select>
            <input type="number" placeholder="Unit price" value={link.unit_price} onChange={e => setLink({ ...link, unit_price: e.target.value })} />
            <input type="number" placeholder="Lead days" value={link.lead_time_days} onChange={e => setLink({ ...link, lead_time_days: e.target.value })} />
            <label className="row"><input type="checkbox" style={{ width: 'auto' }} checked={link.preferred} onChange={e => setLink({ ...link, preferred: e.target.checked })} /> Preferred</label>
            <button className="btn" onClick={() => act(async () => { await apiCall(`/api/vendors/${id}/products`, 'POST', link); reloadItems(); }, 'Product linked')}>Save link</button>
          </div>
        </div>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Payments</h3>
          <table><thead><tr><th>Date</th><th>Mode</th><th>Ref</th><th className="num">Amount</th></tr></thead>
            <tbody>{pays?.map(p => <tr key={p.id}><td>{date(p.paid_on)}</td><td>{p.mode}</td><td>{p.reference ?? '—'}</td><td className="num">{money(p.amount)}</td></tr>)}</tbody></table>
          <div className="form" style={{ marginTop: 12 }}>
            <input type="number" placeholder="Amount" value={pay.amount} onChange={e => setPay({ ...pay, amount: e.target.value })} />
            <select value={pay.mode} onChange={e => setPay({ ...pay, mode: e.target.value })}>{['BANK', 'UPI', 'CHEQUE', 'CASH'].map(m => <option key={m}>{m}</option>)}</select>
            <input placeholder="Reference / UTR" value={pay.reference} onChange={e => setPay({ ...pay, reference: e.target.value })} />
            <button className="btn success" onClick={() => act(async () => { await apiCall('/api/vendor-payments', 'POST', { ...pay, vendor_id: Number(id) }); setPay({ amount: '', mode: 'BANK', reference: '' }); reloadPays(); reloadV(); }, 'Payment recorded')}>Record payment</button>
          </div>
        </div>
      </div>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Purchase orders</h3>
        <table><thead><tr><th>PO #</th><th>Date</th><th>Status</th><th className="num">Total</th></tr></thead>
          <tbody>{vpos.map(p => <tr key={p.id}><td><Link href={`/purchase-orders/${p.id}`}>{p.po_number}</Link></td><td>{date(p.order_date)}</td><td><Status s={p.status} /></td><td className="num">{money(p.total)}</td></tr>)}</tbody></table>
      </div>
    </>
  );
}
