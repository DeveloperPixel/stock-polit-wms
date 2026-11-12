'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import LineItems, { Line } from '@/components/LineItems';
import { apiCall, useData } from '@/lib/client';

export default function NewPO() {
  const router = useRouter();
  const { data: lk } = useData<any>('/api/lookups');
  const [f, setF] = useState<any>({ vendor_id: '', warehouse_id: '', expected_date: '', notes: '' });
  const [lines, setLines] = useState<Line[]>([{ product_id: '', qty: '' }]);
  const [err, setErr] = useState('');
  // Vendor-specific price from product_vendors when available
  const priceFor = (pid: number) => lk?.vendorPrices.find((x: any) => x.product_id === pid && String(x.vendor_id) === String(f.vendor_id))?.unit_price;
  const todayStr = new Date().toISOString().split('T')[0];

  async function save() {
    setErr('');
    if (f.expected_date && f.expected_date < todayStr) {
      setErr('Expected delivery date cannot be in the past');
      return;
    }
    try {
      const po = await apiCall('/api/purchase-orders', 'POST', { ...f, items: lines.filter(l => l.product_id && l.qty) });
      router.push(`/purchase-orders/${po.id}`);
    } catch (e: any) { setErr(e.message); }
  }
  return (<>
    <div className="topbar"><h1>New Purchase Order</h1></div>
    {err && <div className="err">{err}</div>}
    <div className="card form">
      <div><label>Vendor *</label><select value={f.vendor_id} onChange={e => setF({ ...f, vendor_id: e.target.value })}><option value="">—</option>{lk?.vendors.map((v: any) => <option key={v.id} value={v.id}>{v.code} · {v.name}</option>)}</select></div>
      <div><label>Deliver to warehouse *</label><select value={f.warehouse_id} onChange={e => setF({ ...f, warehouse_id: e.target.value })}><option value="">—</option>{lk?.warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.code} · {w.name}</option>)}</select></div>
      <div>
        <label>Expected date</label>
        <input
          type="date"
          min={todayStr}
          value={f.expected_date}
          onChange={e => setF({ ...f, expected_date: e.target.value })}
        />
      </div>
      <div><label>Notes</label><input value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} /></div>
    </div>
    <LineItems lines={lines} setLines={setLines} products={lk?.products ?? []} mode="purchase" priceFor={p => { const v = priceFor(p); return v ? Number(v) : undefined; }} />
    <button className="btn primary" onClick={save}>Save as draft</button>
  </>);
}
