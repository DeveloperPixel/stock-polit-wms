'use client';
import { useMemo, useState } from 'react';
import BarcodePreview from '@/components/BarcodePreview';
import BarcodeScannerModal from '@/components/BarcodeScannerModal';
import EmptyState from '@/components/EmptyState';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useToast } from '@/components/Toast';
import { apiCall, money, qty, useData } from '@/lib/client';
import { HSN_MASTER_DATABASE, searchHsnDatabase } from '@/lib/hsnMaster';

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
  const [scannerOpen, setScannerOpen] = useState(false);
  const [hsnFocused, setHsnFocused] = useState(false);
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

  // Standard Category-to-HSN defaults & GST tax slabs
  const CATEGORY_HSN_DEFAULTS: Record<string, { hsn: string; gst: number }> = {
    electronics: { hsn: '85423100', gst: 18 },  // Integrated circuits / Microcontrollers
    batteries: { hsn: '85076000', gst: 18 },    // Lithium-ion batteries
    packaging: { hsn: '48191010', gst: 12 },    // Corrugated cartons / boxes
    spares: { hsn: '85369090', gst: 18 },       // Electrical connectors / plugs
    hardware: { hsn: '73181500', gst: 18 },     // Screws, bolts, fasteners
    textiles: { hsn: '52081100', gst: 5 },      // Fabrics / apparel
    chemicals: { hsn: '38249900', gst: 18 },    // Chemical preparations
    food: { hsn: '21069099', gst: 12 },         // Packaged food preparations
  };

  const HSN_COMMON_OPTIONS = [
    { code: '85423100', label: '85423100 — Microcontrollers & Integrated Circuits (18% GST)', gst: 18 },
    { code: '85076000', label: '85076000 — Lithium-ion Batteries & Battery Packs (18% GST)', gst: 18 },
    { code: '48191010', label: '48191010 — Corrugated Cartons & Packing Boxes (12% GST)', gst: 12 },
    { code: '85369090', label: '85369090 — Electrical Connectors, Plugs & Sockets (18% GST)', gst: 18 },
    { code: '73181500', label: '73181500 — Screws, Bolts, Nuts & Fasteners (18% GST)', gst: 18 },
    { code: '84713010', label: '84713010 — Computers & Embedded Processing Modules (18% GST)', gst: 18 },
    { code: '85176290', label: '85176290 — Network, Wi-Fi & Communication Devices (18% GST)', gst: 18 },
    { code: '39231090', label: '39231090 — Plastic Crates, Trays & Packaging Articles (18% GST)', gst: 18 },
    { code: '85044090', label: '85044090 — SMPS, Power Adapters & Chargers (18% GST)', gst: 18 },
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

  // Generate SKU & Barcode only when both Product Name and Category are provided
  function computeSkuAndBarcode(currentEditing: Record<string, any>) {
    const name = (currentEditing.name || '').trim();
    const catId = currentEditing.category_id;

    // Only generate if both Category and Product Name are present
    if (!name || !catId) {
      return { sku: currentEditing.sku || '', barcode: currentEditing.barcode || '' };
    }

    let prefix = 'PRD';
    const match = categories.find((c: any) => String(c.id) === String(catId));
    if (match && match.name) {
      prefix = match.name.substring(0, 3).toUpperCase();
    }

    const namePart = name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 5);

    const randomNum = Math.floor(100 + Math.random() * 900);
    const sku = namePart ? `${prefix}-${namePart}-${randomNum}` : `${prefix}-${randomNum}`;
    const barcode = generateBarcode(sku);

    return { sku, barcode };
  }

  // User manually triggers regeneration
  function generateSKU() {
    if (!editing) return;
    setDuplicateProduct(null);

    const name = (editing.name || '').trim();
    if (!name || !editing.category_id) {
      toastErr('Please select a Category and enter a Product Name first');
      return;
    }

    const { sku, barcode } = computeSkuAndBarcode(editing);

    // Check if generated SKU already exists
    const existing = products?.find(p => p.sku === sku && p.id !== editing.id);
    if (existing) {
      setDuplicateProduct(existing);
    }

    setEditing({ ...editing, sku, barcode });
  }

  // Handle Name or Category changes to auto-derive SKU, Barcode, and Category HSN defaults
  function handleNameOrCategoryChange(patch: Partial<Record<string, any>>) {
    if (!editing) return;
    const next = { ...editing, ...patch };

    // When category is changed for a new product, auto-fill recommended HSN and GST rate if empty
    if (patch.category_id && !editing.id) {
      const matchCat = categories.find((c: any) => String(c.id) === String(patch.category_id));
      if (matchCat && matchCat.name) {
        const catKey = matchCat.name.toLowerCase().trim();
        const def = CATEGORY_HSN_DEFAULTS[catKey];
        if (def) {
          if (!next.hsn_code) next.hsn_code = def.hsn;
          if (next.tax_rate === 18 || !next.tax_rate) next.tax_rate = def.gst;
        }
      }
    }

    // For existing product being edited, preserve original SKU/barcode unless empty
    if (editing.id && editing.sku && editing.barcode) {
      setEditing(next);
      return;
    }

    const name = (next.name || '').trim();
    const catId = next.category_id;

    if (name && catId) {
      // Both are present: generate barcode and sku
      if (!next.sku || !next.barcode || patch.category_id !== undefined) {
        const { sku, barcode } = computeSkuAndBarcode(next);
        setEditing({ ...next, sku, barcode });
        return;
      }
    } else {
      // Clear auto-generated barcode and SKU if one of them is missing (for new products)
      if (!editing.id) {
        setEditing({ ...next, sku: '', barcode: '' });
        setDuplicateProduct(null);
        return;
      }
    }

    setEditing(next);
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
            placeholder="Search SKU, name, or barcode…"
            value={q}
            onChange={e => setQ(e.target.value)}
            style={{ width: 230 }}
          />

          <button
            type="button"
            className="btn"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            onClick={() => setScannerOpen(true)}
            title="Scan product barcode with camera"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 5v14M8 5v14M12 5v14M17 5v14M21 5v14" />
            </svg>
            Scan Barcode
          </button>

          <button
            className="btn primary"
            onClick={() => {
              setDuplicateProduct(null);
              setEditing({
                name: '',
                category_id: '',
                sku: '',
                barcode: '',
                uom: 'PCS',
                tax_rate: 18,
                active: true
              });
            }}
          >
            + New Product
          </button>
        </div>
      </div>

      {!products ? (
        <div className="card" style={{ padding: 0 }}>
          <LoadingSpinner message="Loading products catalog…" minHeight={300} />
        </div>
      ) : grouped.size === 0 ? (
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
                  <label style={{ fontWeight: 600 }}>Product Name *</label>
                  <input
                    required
                    value={editing.name ?? ''}
                    onChange={e => handleNameOrCategoryChange({ name: e.target.value })}
                    placeholder="e.g. ESP32 Dev Board"
                  />
                </div>

                <div>
                  <label style={{ fontWeight: 600 }}>Category *</label>
                  <select
                    value={editing.category_id ?? ''}
                    onChange={e => handleNameOrCategoryChange({ category_id: e.target.value })}
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
                  <label style={{ marginBottom: 6, fontWeight: 600 }}>SKU (Auto-Generated) *</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
                    <input
                      required
                      readOnly
                      tabIndex={-1}
                      value={editing.sku ?? ''}
                      placeholder={editing.name && editing.category_id ? 'Auto-generated' : 'Enter Name & Category to generate'}
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
                        disabled={!editing.name?.trim() || !editing.category_id}
                        title={!editing.name?.trim() || !editing.category_id ? 'Enter Name and Category first' : undefined}
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
                    placeholder={editing.name && editing.category_id ? 'Generated with SKU' : 'Awaiting Name & Category'}
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

              {/* Barcode Visual Preview only when both Name and Category are provided */}
              {editing.barcode && editing.name?.trim() && editing.category_id && (
                <div style={{ marginTop: 12 }}>
                  <BarcodePreview
                    value={editing.barcode}
                    sku={editing.sku}
                    productName={editing.name}
                    showDownload={false}
                  />
                </div>
              )}

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

                <div style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label style={{ margin: 0 }}>HSN / SAC Code</label>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                      Auto-suggested or search code
                    </span>
                  </div>
                  <input
                    style={{ fontFamily: 'monospace' }}
                    value={editing.hsn_code ?? ''}
                    onChange={e => setEditing({ ...editing, hsn_code: e.target.value })}
                    onFocus={() => setHsnFocused(true)}
                    onBlur={() => setTimeout(() => setHsnFocused(false), 200)}
                    placeholder="Type or select e.g. 85423100"
                  />

                  {/* Single-input live suggestions dropdown (White bg & Blue branding) */}
                  {hsnFocused && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        marginTop: 4,
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: 8,
                        boxShadow: '0 10px 25px -5px rgba(11, 31, 75, 0.15), 0 8px 10px -6px rgba(11, 31, 75, 0.1)',
                        zIndex: 60,
                        maxHeight: 250,
                        overflowY: 'auto'
                      }}
                    >
                      <div
                        style={{
                          padding: '6px 12px',
                          fontSize: 11,
                          fontWeight: 700,
                          color: 'var(--muted)',
                          background: '#f8fafc',
                          borderBottom: '1px solid var(--line)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <span>HSN / SAC Code &amp; Rates</span>
                        <span>Auto-sets GST</span>
                      </div>
                      {searchHsnDatabase(editing.hsn_code || '').length === 0 ? (
                        <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--muted)' }}>
                          No matching standard HSN codes found. You can keep your custom code.
                        </div>
                      ) : (
                        searchHsnDatabase(editing.hsn_code || '').map(opt => (
                          <div
                            key={opt.code}
                            onMouseDown={() => {
                              setEditing({
                                ...editing,
                                hsn_code: opt.code,
                                tax_rate: opt.gst
                              });
                              setHsnFocused(false);
                            }}
                            style={{
                              padding: '8px 12px',
                              cursor: 'pointer',
                              fontSize: 12.5,
                              borderBottom: '1px solid #f1f5f9',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              background: '#ffffff',
                              transition: 'background 0.12s ease'
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.background = '#eef2ff';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.background = '#ffffff';
                            }}
                          >
                            <div>
                              <span style={{ fontWeight: 700, color: 'var(--indigo)', fontFamily: 'monospace', marginRight: 8 }}>
                                {opt.code}
                              </span>
                              <span style={{ color: 'var(--text)' }}>
                                {opt.label.split('—')[1]?.trim() || opt.label}
                              </span>
                              <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--muted)', background: '#f1f5f9', padding: '1px 5px', borderRadius: 4 }}>
                                {opt.category}
                              </span>
                            </div>
                            <span className="badge b-CONFIRMED" style={{ fontSize: 11, padding: '2px 6px', whiteSpace: 'nowrap', marginLeft: 8 }}>
                              {opt.gst}% GST
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
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

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={(code: string) => {
          setQ(code);
          success(`Scanned: ${code}`);
        }}
      />
    </>
  );
}
