'use client';
import { useState } from 'react';
import LineItems, { Line } from '@/components/LineItems';
import EmptyState from '@/components/EmptyState';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useToast } from '@/components/Toast';
import { apiCall, date, useData } from '@/lib/client';

export default function Transfers() {
  const { data: lk } = useData<any>('/api/lookups');
  const { data, reload } = useData<any[]>('/api/transfers');
  const [f, setF] = useState<any>({ from_warehouse_id: '', to_warehouse_id: '', notes: '' });
  const [lines, setLines] = useState<Line[]>([{ product_id: '', qty: '' }]);
  const [err, setErr] = useState('');
  const { success, error: toastErr } = useToast();

  async function submit() {
    setErr('');
    try {
      const t = await apiCall('/api/transfers', 'POST', {
        ...f,
        items: lines.filter(l => l.product_id && l.qty)
      });
      success(`Transfer ${t.transfer_number} posted successfully`);
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
        <h1>Stock Transfers</h1>
      </div>
      {err && <div className="err">{err}</div>}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>New inter-warehouse transfer</h3>
        <div className="form">
          <div>
            <label>From warehouse</label>
            <select
              value={f.from_warehouse_id}
              onChange={e => setF({ ...f, from_warehouse_id: e.target.value })}
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
            <label>To warehouse</label>
            <select
              value={f.to_warehouse_id}
              onChange={e => setF({ ...f, to_warehouse_id: e.target.value })}
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
            <label>Notes</label>
            <input
              value={f.notes}
              onChange={e => setF({ ...f, notes: e.target.value })}
              placeholder="e.g. Replenishment transfer"
            />
          </div>
        </div>
        <div style={{ height: 12 }} />
        <LineItems lines={lines} setLines={setLines} products={lk?.products ?? []} mode="qty" />
        <button className="btn primary" onClick={submit}>
          Post transfer
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        {!data ? (
          <LoadingSpinner message="Loading stock transfers…" minHeight={220} />
        ) : data.length === 0 ? (
          <EmptyState
            title="No past transfers recorded"
            description="Use the form above to post your first inter-warehouse stock transfer."
            icon="🔄"
          />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Transfer #</th>
                <th>Date</th>
                <th>From</th>
                <th>To</th>
                <th className="num">Lines</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {data?.map(t => (
                <tr key={t.id}>
                  <td>{t.transfer_number}</td>
                  <td>{date(t.created_at)}</td>
                  <td>{t.from_wh}</td>
                  <td>{t.to_wh}</td>
                  <td className="num">{t.lines}</td>
                  <td>{t.notes ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
