'use client';
import { useMemo, useState } from 'react';
import BarcodePreview from '@/components/BarcodePreview';
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
  const [duplicateProduct, setDuplicateProduct] = useState<any | null>(null);
  const [viewBarcodeProduct, setViewBarcodeProduct] = useState<any | null>(null);
  const { success, error: toastErr } = useToast();

  const categories = lk?.categories ?? [];

  const UOM_OPTIONS = [
    { value: 'PCS', label: 'PCS — Pieces' },
    { value: 'BOX', label: 'BOX — Boxes' },
    { value: 'PKG', label: 'PKG — Packages / Packets' },
    { value: 'SET', label: 'SET — Sets' },
    { value: 'NOS', label: 'NOS — Numbers' },
    { value: 'KGS', label: 'KGS — Kilograms' },
    { value: 'GMS', label: 'GMS — Grams' },
    { value: 'MTR', label: 'MTR — Meters' },
    { value: 'LTR', label: 'LTR — Liters' },
    { value: 'ML', label: 'ML — Milliliters' },
    { value: 'ROLL', label: 'ROLL — Rolls' },
    { value: 'PAIR', label: 'PAIR — Pairs' },
    { value: 'DOZ', label: 'DOZ — Dozen' },
  ];

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

  // EAN-13 style standard Barcode Generator
  function generateBarcode(skuText: string) {
    const chars = skuText.replace(/[^A-Z0-9]/g, '');
    let hash = 890000000000; // Standard 890 GS1 prefix
    for (let i = 0; i < chars.length; i++) {
      hash = (hash * 31 + chars.charCodeAt(i)) % 999999999999;
    }
    const base12 = String(hash).padStart(12, '8');
    // Compute EAN-13 check digit
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(base12[i]) * (i % 2 === 0 ? 1 : 3);
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return `${base12}${checkDigit}`;
  }

  // Generate SKU & Barcode, and check for existing SKU collisions
  function generateSKU() {
    if (!editing) return;
    setDuplicateProduct(null);

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
    const barcode = generateBarcode(sku);

    // Check if generated SKU already exists
    const existing = products?.find(p => p.sku === sku && p.id !== editing.id);
    if (existing) {
      setDuplicateProduct(existing);
    }

    setEditing({ ...editing, sku, barcode });
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
      setDuplicateProduct(null);
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
            onClick={() => {
              setDuplicateProduct(null);
              setEditing({
                uom: 'PCS',
                tax_rate: 18,
                active: true,
                category_id: categories[0]?.id || ''
              });
            }}
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
            onAction={() => {
              setDuplicateProduct(null);
              setEditing({
                uom: 'PCS',
                tax_rate: 18,
                active: true,
                category_id: categories[0]?.id || ''
              });
            }}
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
              <table className="table-fixed table-products">
                <colgroup>
                  <col className="col-sku" />
                  <col className="col-name" />
                  <col className="col-uom" />
                  <col className="col-barcode" />
                  <col className="col-cost" />
                  <col className="col-price" />
                  <col className="col-reorder" />
                  <col className="col-status" />
                  <col className="col-actions" />
                </colgroup>
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Name</th>
                    <th>UOM</th>
                    <th>Barcode</th>
                    <th className="num">Cost</th>
                    <th className="num">Price</th>
                    <th className="num">Reorder lvl</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(r => (
                    <tr key={r.id}>
                      <td>
                        <b>{r.sku}</b>
                      </td>
                      <td title={r.name}>{r.name}</td>
                      <td>{r.uom}</td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            fontFamily: 'monospace',
                            letterSpacing: '0.05em',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            cursor: r.barcode ? 'pointer' : 'default',
                            padding: '3px 8px'
                          }}
                          onClick={() => {
                            if (r.barcode) setViewBarcodeProduct(r);
                          }}
                          title={r.barcode ? 'Click to view & download barcode' : undefined}
                        >
                          {r.barcode || '—'}
                          {r.barcode && (
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.75 }}>
                              <path d="M3 5v14M8 5v14M12 5v14M17 5v14M21 5v14" />
                            </svg>
                          )}
                        </span>
                      </td>
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
                        <button
                          className="btn sm"
                          onClick={() => {
                            setDuplicateProduct(null);
                            setEditing({ ...r });
                          }}
                        >
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
        <div
          className="modal-bg"
          onClick={() => {
            setEditing(null);
            setDuplicateProduct(null);
          }}
        >
          <form className="modal" style={{ maxWidth: 720 }} onClick={e => e.stopPropagation()} onSubmit={save}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid var(--line)', paddingBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18 }}>
                  {editing.id ? 'Edit Product' : 'New Product'}
                </h3>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                  {editing.id ? `Update product details for ${editing.sku}` : 'Fill in the details below to add a new item to your catalog'}
                </div>
              </div>
              <button
                type="button"
                className="btn sm"
                style={{ padding: '4px 8px', fontSize: 16, lineHeight: 1, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--muted)' }}
                onClick={() => {
                  setEditing(null);
                  setDuplicateProduct(null);
                }}
              >
                ✕
              </button>
            </div>

            {formErr && <div className="err">{formErr}</div>}

            {/* Section 1: Basic Identification */}
            <div className="prod-form-section">
              <div className="prod-form-section-title">
                Basic Identification
              </div>
              <div className="prod-grid-2">
                <div>
                  <label style={{ marginBottom: 6, fontWeight: 600 }}>SKU (Auto-Generated) *</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
                    <input
                      required
                      readOnly
                      tabIndex={-1}
                      value={editing.sku ?? ''}
                      placeholder="Auto-generated from Name & Category"
                      style={{
                        background: '#f1f5f9',
                        color: '#475569',
                        cursor: 'default',
                        fontWeight: 700,
                        pointerEvents: 'none',
                        userSelect: 'none',
                        fontFamily: 'monospace',
                        flex: 1
                      }}
                    />
                    {!editing.id && (
                      <button
                        type="button"
                        className="btn"
                        style={{
                          whiteSpace: 'nowrap',
                          padding: '0 14px',
                          fontSize: 12.5,
                          fontWeight: 600,
                          background: '#f8fafc',
                          borderColor: '#cbd5e1',
                          color: 'var(--text)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        onClick={generateSKU}
                      >
                        Regenerate
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label style={{ fontWeight: 600 }}>Barcode (Auto-Generated)</label>
                  <input
                    readOnly
                    tabIndex={-1}
                    value={editing.barcode ?? ''}
                    placeholder="Generated with SKU"
                    style={{
                      background: '#f1f5f9',
                      color: '#475569',
                      cursor: 'default',
                      pointerEvents: 'none',
                      userSelect: 'none',
                      fontFamily: 'monospace',
                      letterSpacing: '0.04em'
                    }}
                  />
                </div>
              </div>

              {/* Barcode Visual Preview & Image Download */}
              {editing.barcode && (
                <div style={{ marginTop: 12 }}>
                  <BarcodePreview
                    value={editing.barcode}
                    sku={editing.sku}
                    productName={editing.name}
                  />
                </div>
              )}

              <div className="prod-grid-2" style={{ marginTop: 12 }}>
                <div>
                  <label style={{ fontWeight: 600 }}>Product Name *</label>
                  <input
                    required
                    value={editing.name ?? ''}
                    onChange={e => setEditing({ ...editing, name: e.target.value })}
                    placeholder="e.g. ESP32 Dev Board"
                  />
                </div>

                <div>
                  <label style={{ fontWeight: 600 }}>Category *</label>
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
              </div>

              <div className="prod-grid-2" style={{ marginTop: 12 }}>
                <div>
                  <label style={{ fontWeight: 600 }}>Unit of Measure (UOM) *</label>
                  <select
                    required
                    value={editing.uom ?? 'PCS'}
                    onChange={e => setEditing({ ...editing, uom: e.target.value })}
                  >
                    {UOM_OPTIONS.map(u => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label>HSN / SAC Code</label>
                  <input
                    value={editing.hsn_code ?? ''}
                    onChange={e => setEditing({ ...editing, hsn_code: e.target.value })}
                    placeholder="e.g. 85423100"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Pricing & Taxation */}
            <div className="prod-form-section">
              <div className="prod-form-section-title">
                Pricing & Taxation
              </div>
              <div className="prod-grid-3">
                <div>
                  <label>Cost Price (₹)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={editing.cost_price ?? 0}
                    onChange={e => setEditing({ ...editing, cost_price: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ fontWeight: 600 }}>Sale Price (₹) *</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={editing.sale_price ?? 0}
                    onChange={e => setEditing({ ...editing, sale_price: e.target.value })}
                  />
                </div>

                <div>
                  <label>GST Rate (%)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    max="100"
                    value={editing.tax_rate ?? 18}
                    onChange={e => setEditing({ ...editing, tax_rate: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Inventory Reorder & Status */}
            <div className="prod-form-section" style={{ marginBottom: 8 }}>
              <div className="prod-form-section-title">
                Inventory Planning & Status
              </div>
              <div className="prod-grid-3">
                <div>
                  <label>Reorder Level (Alert threshold)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={editing.reorder_level ?? 0}
                    onChange={e => setEditing({ ...editing, reorder_level: e.target.value })}
                  />
                </div>

                <div>
                  <label>Reorder Quantity</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={editing.reorder_qty ?? 0}
                    onChange={e => setEditing({ ...editing, reorder_qty: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', paddingTop: 20 }}>
                  <label className="row" style={{ cursor: 'pointer', margin: 0, fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      checked={editing.active !== false}
                      onChange={e => setEditing({ ...editing, active: e.target.checked })}
                    />
                    <span style={{ fontSize: 13, color: editing.active !== false ? 'var(--text)' : 'var(--muted)' }}>
                      Active in Catalog
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Bottom Alert Popup for Duplicate SKU Collision */}
            {duplicateProduct && (
              <div
                style={{
                  marginTop: 16,
                  padding: '12px 16px',
                  background: '#fef2f2',
                  border: '1px solid #f87171',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 12
                }}
              >
                <div>
                  <div style={{ color: '#991b1b', fontWeight: 700, fontSize: 13, marginBottom: 2 }}>
                    ⚠️ Existing SKU Collision Detected!
                  </div>
                  <div style={{ color: '#7f1d1d', fontSize: 12.5, lineHeight: 1.4 }}>
                    An existing product already uses SKU <b>{duplicateProduct.sku}</b>:
                    <br />
                    • <b>Name:</b> {duplicateProduct.name} | <b>Price:</b> {money(duplicateProduct.sale_price)} | <b>UOM:</b> {duplicateProduct.uom}
                    <br />
                    <span style={{ fontSize: 11.5, color: '#b91c1c' }}>
                      Click "Generate SKU" again to produce a new unique code.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn sm"
                  style={{ background: '#fff', borderColor: '#fca5a5', color: '#991b1b', flexShrink: 0 }}
                  onClick={() => setDuplicateProduct(null)}
                >
                  Dismiss
                </button>
              </div>
            )}

            <div className="row" style={{ marginTop: 20, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn"
                disabled={saving}
                onClick={() => {
                  setEditing(null);
                  setDuplicateProduct(null);
                }}
              >
                Cancel
              </button>
              <button
                className={`btn primary ${saving ? 'loading' : ''}`}
                disabled={saving || !!duplicateProduct}
              >
                {saving && <span className="btn-spinner" />}
                {saving ? 'Saving…' : 'Save Product'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Barcode View & Download Modal */}
      {viewBarcodeProduct && (
        <div
          className="modal-bg"
          onClick={() => setViewBarcodeProduct(null)}
        >
          <div
            className="modal"
            style={{ maxWidth: 440, padding: 24 }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, borderBottom: '1px solid var(--line)', paddingBottom: 10 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17 }}>Barcode</h3>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                  {viewBarcodeProduct.sku} — {viewBarcodeProduct.name}
                </div>
              </div>
              <button
                type="button"
                className="btn sm"
                style={{ padding: '4px 8px', fontSize: 16, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--muted)' }}
                onClick={() => setViewBarcodeProduct(null)}
              >
                ✕
              </button>
            </div>

            <BarcodePreview
              value={viewBarcodeProduct.barcode}
              sku={viewBarcodeProduct.sku}
              productName={viewBarcodeProduct.name}
            />

            <div className="row" style={{ marginTop: 18, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn"
                onClick={() => setViewBarcodeProduct(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
