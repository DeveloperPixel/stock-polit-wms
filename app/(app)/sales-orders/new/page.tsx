'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import LineItems, { Line } from '@/components/LineItems';
import { apiCall, useData } from '@/lib/client';

export default function NewSO() {
  const router = useRouter();
  const { data: lk } = useData<any>('/api/lookups');
  const [f, setF] = useState<any>({ customer_id: '', warehouse_id: '', notes: '' });
  const [lines, setLines] = useState<Line[]>([{ product_id: '', qty: '' }]);
  const [err, setErr] = useState('');
  async function save() {
    setErr('');
    try { const so = await apiCall('/api/sales-orders', 'POST', { ...f, items: lines.filter(l => l.product_id && l.qty) }); router.push(`/sales-orders/${so.id}`); }
    catch (e: any) { setErr(e.message); }
  }
  return (<>
    <div className="topbar"><h1>New Sales Order</h1></div>
    {err && <div className="err">{err}</div>}
    <div className="card form">
      <div><label>Customer *</label><select value={f.customer_id} onChange={e => setF({ ...f, customer_id: e.target.value })}><option value="">—</option>{lk?.customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
      <div><label>Ship from warehouse *</label><select value={f.warehouse_id} onChange={e => setF({ ...f, warehouse_id: e.target.value })}><option value="">—</option>{lk?.warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.code} · {w.name}</option>)}</select></div>
      <div><label>Notes</label><input value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} /></div>
    </div>
    <LineItems lines={lines} setLines={setLines} products={lk?.products ?? []} mode="sale" />
    <button className="btn primary" onClick={save}>Save as draft</button>
  </>);
}
