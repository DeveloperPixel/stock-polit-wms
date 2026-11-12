'use client';
import { useState } from 'react';
import LineItems, { Line } from '@/components/LineItems';
import EmptyState from '@/components/EmptyState';
import { useToast } from '@/components/Toast';
import { apiCall, date, useData } from '@/lib/client';

export default function Adjustments() {
  const { data: lk } = useData<any>('/api/lookups');
  const { data, reload } = useData<any[]>('/api/adjustments');
  const [f, setF] = useState<any>({ warehouse_id: '', reason: 'CYCLE_COUNT', notes: '' });
  const [lines, setLines] = useState<Line[]>([{ product_id: '', qty: '' }]);
  const [err, setErr] = useState('');
  const { success, error: toastErr } = useToast();

  async function submit() {
    setErr('');
    try {
      const a = await apiCall('/api/adjustments', 'POST', {
        ...f,
        items: lines
          .filter(l => l.product_id && l.qty)
          .map(l => ({
            product_id: l.product_id,
            qty_change: l.qty,
            unit_cost: l.unit_cost || 0
          }))
      });
      success(`Adjustment ${a.adj_number} posted successfully`);
      setLines([{ product_id: '', qty: '' }]);
      reload();
    } catch (e: any) {
      setErr(e.message);
      toastErr(e.message);
    }
  }

  return (
    <>
      <div className="topbar">
        <h1>Stock Adjustments</h1>
      </div>
      {err && <div className="err">{err}</div>}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>
          New adjustment{' '}
          <span className="muted" style={{ fontSize: 12 }}>
            (Manager/Admin only — use + to add stock, − to remove)
          </span>
        </h3>
        <div className="form">
          <div>
            <label>Warehouse</label>
            <select
              value={f.warehouse_id}
              onChange={e => setF({ ...f, warehouse_id: e.target.value })}
            >
              <option value="">— select —</option>
              {lk?.warehouses.map((w: any) => (
                <option key={w.id} value={w.id}>
                  {w.code} · {w.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Reason</label>
            <select value={f.reason} onChange={e => setF({ ...f, reason: e.target.value })}>
              {['CYCLE_COUNT', 'DAMAGE', 'EXPIRY', 'FOUND', 'OPENING', 'OTHER'].map(r => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Notes</label>
            <input
              value={f.notes}
              onChange={e => setF({ ...f, notes: e.target.value })}
              placeholder="e.g. Broken packaging audit"
            />
          </div>
        </div>
        <div style={{ height: 12 }} />
        <LineItems lines={lines} setLines={setLines} products={lk?.products ?? []} mode="adjust" />
        <button className="btn primary" onClick={submit}>
          Post adjustment
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        {data && data.length === 0 ? (
          <EmptyState
            title="No adjustments on file"
            description="Use the form above to record shrinkage, cycle count corrections, or damages."
            icon="⚖️"
          />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Adj #</th>
                <th>Date</th>
                <th>WH</th>
                <th>Reason</th>
                <th className="num">Lines</th>
                <th>By</th>
              </tr>
            </thead>
            <tbody>
              {data?.map(a => (
                <tr key={a.id}>
                  <td>{a.adj_number}</td>
                  <td>{date(a.created_at)}</td>
                  <td>{a.warehouse}</td>
                  <td>{a.reason}</td>
                  <td className="num">{a.lines}</td>
                  <td>{a.user_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
