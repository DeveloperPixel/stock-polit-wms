'use client';
import { useState } from 'react';
import { money, qty, useData } from '@/lib/client';

export default function Ledger() {
  const [p, setP] = useState('');
  const { data: lk } = useData<any>('/api/lookups');
  const { data } = useData<any[]>(`/api/stock/movements${p ? `?product_id=${p}` : ''}`);
  return (
    <>
      <div className="topbar"><h1>Stock Ledger</h1>
        <select value={p} onChange={e => setP(e.target.value)} style={{ width: 260 }}><option value="">All products</option>{lk?.products.map((x: any) => <option key={x.id} value={x.id}>{x.sku} · {x.name}</option>)}</select></div>
      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        <table><thead><tr><th>#</th><th>Date</th><th>Type</th><th>Reference</th><th>SKU</th><th>WH</th><th>Bin</th><th>Batch / Expiry</th><th className="num">Qty</th><th className="num">Unit cost</th><th className="num">Balance</th><th>By</th><th>Note</th></tr></thead>
          <tbody>{data?.map(m => <tr key={m.id}><td>{m.id}</td><td>{new Date(m.created_at).toLocaleString('en-IN')}</td><td><span className="badge">{m.movement}</span></td><td>{m.ref_no ?? '—'}</td><td><b>{m.sku}</b></td><td>{m.warehouse}</td>
            <td>{m.bin_code ? <span className="badge">{m.bin_code}</span> : '—'}</td>
            <td>
              {m.batch_no ? (
                <div style={{ fontSize: 12 }}>
                  <b>{m.batch_no}</b>
                  {m.expiry_date && <div style={{ fontSize: 11, color: 'var(--muted)' }}>Exp: {new Date(m.expiry_date).toLocaleDateString('en-IN')}</div>}
                </div>
              ) : '—'}
            </td>
            <td className="num" style={{ color: Number(m.qty) < 0 ? 'var(--danger)' : 'var(--teal)' }}>{Number(m.qty) > 0 ? '+' : ''}{qty(m.qty)}</td>
            <td className="num">{money(m.unit_cost)}</td><td className="num">{qty(m.balance_after)}</td><td>{m.user_name ?? '—'}</td><td>{m.note ?? ''}</td></tr>)}</tbody></table>
      </div>
    </>
  );
}
