'use client';
import Link from 'next/link';
import { useState } from 'react';
import Status from '@/components/Status';
import { apiCall, date, money, qty, useData } from '@/lib/client';

export default function SODetail({ params }: { params: { id: string } }) {
  const { data: so, reload } = useData<any>(`/api/sales-orders/${params.id}`);
  const [err, setErr] = useState(''); const [ok, setOk] = useState('');
  const act = async (a: string, msg: string) => {
    setErr(''); setOk('');
    try { await apiCall(`/api/sales-orders/${params.id}/${a}`, 'POST'); setOk(msg); reload(); } catch (e: any) { setErr(e.message); }
  };
  if (!so) return <p>Loading…</p>;
  return (<>
    <div className="topbar"><h1>{so.so_number} <Status s={so.status} /></h1>
      <div className="row"><Link className="btn" href="/sales-orders">← Back</Link>
        <button className="btn" onClick={() => window.print()}>Print challan</button>
        {so.status === 'DRAFT' && <button className="btn primary" onClick={() => act('confirm', 'Order confirmed — stock reserved')}>Confirm & reserve</button>}
        {so.status === 'CONFIRMED' && <button className="btn success" onClick={() => act('dispatch', 'Dispatched — stock deducted')}>Dispatch</button>}
        {['DRAFT', 'CONFIRMED'].includes(so.status) && <button className="btn danger" onClick={() => act('cancel', 'Order cancelled')}>Cancel</button>}
      </div></div>
    {err && <div className="err">{err}</div>}{ok && <div className="ok">{ok}</div>}
    <div className="grid g4">
      <div className="card"><div className="muted">Customer</div><b>{so.customer}</b><div className="muted">{so.customer_address}</div></div>
      <div className="card"><div className="muted">Warehouse</div><b>{so.warehouse}</b></div>
      <div className="card"><div className="muted">Order date</div><b>{date(so.order_date)}</b></div>
      <div className="card"><div className="muted">Dispatched</div><b>{so.dispatched_at ? new Date(so.dispatched_at).toLocaleString('en-IN') : '—'}</b></div>
    </div>
    <div className="card" style={{ padding: 0 }}><table><thead><tr><th>SKU</th><th>Product</th><th className="num">Qty</th><th className="num">Available</th><th className="num">Price</th><th className="num">Tax%</th><th className="num">Amount</th></tr></thead>
      <tbody>{so.items.map((i: any) => <tr key={i.id}><td>{i.sku}</td><td>{i.name}</td><td className="num">{qty(i.qty)} {i.uom}</td>
        <td className={`num ${so.status === 'DRAFT' && Number(i.available) < Number(i.qty) ? 'low' : ''}`}>{qty(i.available)}</td>
        <td className="num">{money(i.unit_price)}</td><td className="num">{Number(i.tax_rate)}</td><td className="num">{money(i.qty * i.unit_price * (1 + i.tax_rate / 100))}</td></tr>)}</tbody>
      <tfoot><tr><th colSpan={6} className="right">Total</th><th className="num">{money(so.total)}</th></tr></tfoot></table></div>
  </>);
}
