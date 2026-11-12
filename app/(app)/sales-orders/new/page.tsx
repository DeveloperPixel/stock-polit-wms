'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import LineItems, { Line } from '@/components/LineItems';
import { useToast } from '@/components/Toast';
import { apiCall, useData } from '@/lib/client';

export default function NewSO() {
  const router = useRouter();
  const { data: lk } = useData<any>('/api/lookups');
  const [f, setF] = useState<any>({ customer_id: '', warehouse_id: '', notes: '' });
  const [lines, setLines] = useState<Line[]>([{ product_id: '', qty: '' }]);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const { success, error: toastErr } = useToast();

  async function save() {
    setErr('');
    const validLines = lines.filter(l => l.product_id && l.qty);
    if (!f.customer_id) {
      setErr('Please select a customer');
      toastErr('Please select a customer');
      return;
    }
    if (!f.warehouse_id) {
      setErr('Please select a warehouse');
      toastErr('Please select a warehouse');
      return;
    }
    if (validLines.length === 0) {
      setErr('Please add at least one line item with product and quantity');
      toastErr('Add at least one line item');
      return;
    }

    setSaving(true);
    try {
      const so = await apiCall('/api/sales-orders', 'POST', { ...f, items: validLines });
      success(`Sales Order ${so.so_number || ''} created successfully! Redirecting…`);
      router.push(`/sales-orders/${so.id}`);
    } catch (e: any) {
      setErr(e.message);
      toastErr(e.message);
      setSaving(false);
    }
  }

  return (
    <>
      <div className="topbar">
        <h1>New Sales Order</h1>
      </div>
      {err && <div className="err">{err}</div>}
      <div className="card form">
        <div>
          <label>Customer *</label>
          <select
            value={f.customer_id}
            disabled={saving}
            onChange={e => setF({ ...f, customer_id: e.target.value })}
          >
            <option value="">— select customer —</option>
            {lk?.customers.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Ship from warehouse *</label>
          <select
            value={f.warehouse_id}
            disabled={saving}
            onChange={e => setF({ ...f, warehouse_id: e.target.value })}
          >
            <option value="">— select warehouse —</option>
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
            disabled={saving}
            placeholder="e.g. Standard ground delivery"
            onChange={e => setF({ ...f, notes: e.target.value })}
          />
        </div>
      </div>
      <LineItems lines={lines} setLines={setLines} products={lk?.products ?? []} mode="sale" />
      <button
        className={`btn primary ${saving ? 'loading' : ''}`}
        disabled={saving}
        onClick={save}
        style={{ minWidth: 160 }}
      >
        {saving && <span className="btn-spinner" />}
        {saving ? 'Creating Order…' : 'Save as draft'}
      </button>
    </>
  );
}
