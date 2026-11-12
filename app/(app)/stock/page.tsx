'use client';
import { useState } from 'react';
import { money, qty, useData } from '@/lib/client';

export default function Stock() {
  const [wh, setWh] = useState(''); const [q, setQ] = useState('');
  const { data: lk } = useData<any>('/api/lookups');
  const { data } = useData<any[]>(`/api/stock?${new URLSearchParams({ ...(wh && { warehouse_id: wh }), ...(q && { q }) })}`);
  const total = (data ?? []).reduce((s, r) => s + Number(r.stock_value), 0);
  return (
    <>
      <div className="topbar"><h1>Stock Levels</h1>
        <div className="row">
          <select value={wh} onChange={e => setWh(e.target.value)} style={{ width: 200 }}><option value="">All warehouses</option>{lk?.warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.code} · {w.name}</option>)}</select>
          <input placeholder="Search SKU / name" value={q} onChange={e => setQ(e.target.value)} style={{ width: 200 }} />
        </div></div>
      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        <table><thead><tr><th>SKU</th><th>Product</th><th>Category</th><th>Warehouse</th><th className="num">On hand</th><th className="num">Reserved</th><th className="num">Available</th><th className="num">Avg cost</th><th className="num">Value</th></tr></thead>
          <tbody>{data?.map(r => <tr key={`${r.product_id}-${r.warehouse_id}`}>
            <td>{r.sku}</td><td>{r.name}</td><td>{r.category ?? '—'}</td><td>{r.warehouse_code}</td>
            <td className="num">{qty(r.qty_on_hand)} {r.uom}</td><td className="num">{qty(r.qty_reserved)}</td>
            <td className={`num ${Number(r.qty_available) <= Number(r.reorder_level) ? 'low' : ''}`}>{qty(r.qty_available)}</td>
            <td className="num">{money(r.avg_cost)}</td><td className="num">{money(r.stock_value)}</td></tr>)}</tbody>
          <tfoot><tr><th colSpan={8} className="right">Total value</th><th className="num">{money(total)}</th></tr></tfoot>
        </table>
      </div>
    </>
  );
}
