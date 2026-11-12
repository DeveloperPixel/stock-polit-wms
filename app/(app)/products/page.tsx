'use client';
import { useMemo, useState } from 'react';
import EmptyState from '@/components/EmptyState';
import { useToast } from '@/components/Toast';
import { apiCall, money, qty, useData } from '@/lib/client';

export default function Products() {
  const [q, setQ] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const { data: lk } = useData<any>('/api/lookups');
  const { data: products, reload } = useData<any[]>(
    `/api/products${q ? `?q=${encodeURIComponent(q)}` : ''}`
  );

  const [editing, setEditing] = useState<Record<string, any> | null>(null);
  const [formErr, setFormErr] = useState('');
  const [saving, setSaving] = useState(false);
  const { success, error: toastErr } = useToast();

  const categories = lk?.categories ?? [];

  // Group products by Category Name
  const grouped = useMemo(() => {
    if (!products) return new Map<string, any[]>();
    const map = new Map<string, any[]>();

    const filtered = catFilter
      ? products.filter(p => {
          const cat = categories.find((c: any) => c.id === p.category_id);
          return (cat ? cat.name : 'Uncategorized') === catFilter;
        })
      : products;

    for (const p of filtered) {
      const cat = categories.find((c: any) => c.id === p.category_id);
      const catName = cat ? cat.name : 'Uncategorized';
      if (!map.has(catName)) {
        map.set(catName, []);
      }
      map.get(catName)!.push(p);
    }
    return map;
  }, [products, catFilter, categories]);

  // Helper to generate SKU: [PREFIX]-[NAME_CLEANED]-[RANDOM_INT]
  function generateSKU() {
    if (!editing) return;
    let prefix = 'PRD';
    if (editing.category_id) {
      const match = categories.find((c: any) => String(c.id) === String(editing.category_id));
      if (match && match.name) {
        prefix = match.name.substring(0, 3).toUpperCase();
      }
    }

    const namePart = (editing.name || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 5);

    const randomNum = Math.floor(100 + Math.random() * 900);
    const sku = namePart ? `${prefix}-${namePart}-${randomNum}` : `${prefix}-${randomNum}`;
    setEditing({ ...editing, sku });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setFormErr('');
    setSaving(true);
    try {
      if (editing!.id) {
        await apiCall(`/api/products/${editing!.id}`, 'PUT', editing);
        success('Product updated successfully');
      } else {
        await apiCall('/api/products', 'POST', editing);
        success('Product created successfully');
      }
      setEditing(null);
      reload();
    } catch (err: any) {
      setFormErr(err.message);
      toastErr(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Products Catalog</h1>
          <p className="muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
            Grouped by Category
          </p>
        </div>
        <div className="row">
          <select
            value={catFilter}
            onChange={e => setCatFilter(e.target.value)}
            style={{ width: 180 }}
          >
            <option value="">All Categories</option>
            {categories.map((c: any) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>

          <input
            placeholder="Search SKU or name…"
            value={q}
            onChange={e => setQ(e.target.value)}
            style={{ width: 200 }}
          />

          <button
            className="btn primary"
            onClick={() =>
              setEditing({
                uom: 'PCS',
                tax_rate: 18,
                active: true,
                category_id: categories[0]?.id || ''
              })
            }
          >
            + New Product
          </button>
        </div>
      </div>

      {grouped.size === 0 ? (
        <div className="card" style={{ padding: 0 }}>
          <EmptyState
            title="No products found"
            description={
              q || catFilter
                ? 'No products match your search or category filter.'
                : 'No products added yet. Click "+ New Product" to add your first product.'
            }
            actionText="+ New Product"
            onAction={() =>
              setEditing({
                uom: 'PCS',
                tax_rate: 18,
                active: true,
                category_id: categories[0]?.id || ''
              })
            }
            icon="🏷️"
          />
        </div>
      ) : (
        Array.from(grouped.entries()).map(([categoryName, items]) => (
          <div key={categoryName} className="card" style={{ padding: 0, marginBottom: 20 }}>
            {/* Category Header Row */}
            <div className="cat-header-row" style={{ padding: '12px 16px' }}>
              <div className="cat-name">
                <span className="cat-icon-svg" aria-hidden="true">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  </svg>
                </span>
                <b style={{ fontSize: 14 }}>{categoryName}</b>
                <span className="cat-count">
                  ({items.length} {items.length === 1 ? 'product' : 'products'})
                </span>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Name</th>
                    <th>UOM</th>
                    <th className="num">Cost</th>
                    <th className="num">Price</th>
                    <th className="num">Reorder lvl</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {items.map(r => (
                    <tr key={r.id}>
                      <td>
                        <b>{r.sku}</b>
                      </td>
                      <td>{r.name}</td>
                      <td>{r.uom}</td>
                      <td className="num">{money(r.cost_price)}</td>
                      <td className="num">
                        <b>{money(r.sale_price)}</b>
                      </td>
                      <td className="num">{qty(r.reorder_level)}</td>
                      <td>
                        <span className={`badge ${r.active ? 'b-RECEIVED' : 'b-DRAFT'}`}>
                          {r.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="right">
                        <button className="btn sm" onClick={() => setEditing({ ...r })}>
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}

      {/* Product Create / Edit Modal */}
      {editing && (
        <div className="modal-bg" onClick={() => setEditing(null)}>
          <form className="modal" onClick={e => e.stopPropagation()} onSubmit={save}>
            <h3 style={{ marginTop: 0 }}>
              {editing.id ? 'Edit Product' : 'New Product'}
            </h3>
            {formErr && <div className="err">{formErr}</div>}
            <div className="form">
              <div>
                <div className="row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
                  <label style={{ margin: 0 }}>SKU *</label>
                  {!editing.id && (
                    <button
                      type="button"
                      className="btn sm"
                      style={{ padding: '2px 7px', fontSize: 11 }}
                      onClick={generateSKU}
                    >
                      ⚡ Auto-generate
                    </button>
                  )}
                </div>
                <input
                  required
                  value={editing.sku ?? ''}
                  onChange={e => setEditing({ ...editing, sku: e.target.value })}
                  placeholder="e.g. ELE-ESP32"
                />
              </div>

              <div>
                <label>Name *</label>
                <input
                  required
                  value={editing.name ?? ''}
                  onChange={e => setEditing({ ...editing, name: e.target.value })}
                  placeholder="e.g. ESP32 Dev Board"
                />
              </div>

              <div>
                <label>Category</label>
                <select
                  value={editing.category_id ?? ''}
                  onChange={e => setEditing({ ...editing, category_id: e.target.value })}
                >
                  <option value="">— select category —</option>
                  {categories.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label>Unit of measure</label>
                <input
                  value={editing.uom ?? 'PCS'}
                  onChange={e => setEditing({ ...editing, uom: e.target.value })}
                />
              </div>

              <div>
                <label>Barcode</label>
                <input
                  value={editing.barcode ?? ''}
                  onChange={e => setEditing({ ...editing, barcode: e.target.value })}
                />
              </div>

              <div>
                <label>HSN code</label>
                <input
                  value={editing.hsn_code ?? ''}
                  onChange={e => setEditing({ ...editing, hsn_code: e.target.value })}
                />
              </div>

              <div>
                <label>Cost price</label>
                <input
                  type="number"
                  step="any"
                  value={editing.cost_price ?? 0}
                  onChange={e => setEditing({ ...editing, cost_price: e.target.value })}
                />
              </div>

              <div>
                <label>Sale price</label>
                <input
                  type="number"
                  step="any"
                  value={editing.sale_price ?? 0}
                  onChange={e => setEditing({ ...editing, sale_price: e.target.value })}
                />
              </div>

              <div>
                <label>GST %</label>
                <input
                  type="number"
                  step="any"
                  value={editing.tax_rate ?? 18}
                  onChange={e => setEditing({ ...editing, tax_rate: e.target.value })}
                />
              </div>

              <div>
                <label>Reorder level</label>
                <input
                  type="number"
                  step="any"
                  value={editing.reorder_level ?? 0}
                  onChange={e => setEditing({ ...editing, reorder_level: e.target.value })}
                />
              </div>

              <div>
                <label>Reorder qty</label>
                <input
                  type="number"
                  step="any"
                  value={editing.reorder_qty ?? 0}
                  onChange={e => setEditing({ ...editing, reorder_qty: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', paddingTop: 20 }}>
                <label className="row" style={{ cursor: 'pointer', margin: 0 }}>
                  <input
                    type="checkbox"
                    style={{ width: 'auto' }}
                    checked={editing.active !== false}
                    onChange={e => setEditing({ ...editing, active: e.target.checked })}
                  />
                  <span>Active</span>
                </label>
              </div>
            </div>

            <div className="row" style={{ marginTop: 20, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn"
                disabled={saving}
                onClick={() => setEditing(null)}
              >
                Cancel
              </button>
              <button className={`btn primary ${saving ? 'loading' : ''}`} disabled={saving}>
                {saving && <span className="btn-spinner" />}
                {saving ? 'Saving…' : 'Save Product'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
