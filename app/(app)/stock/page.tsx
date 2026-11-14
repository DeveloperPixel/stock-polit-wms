'use client';
import { useMemo, useState } from 'react';
import EmptyState from '@/components/EmptyState';
import { money, qty, useData } from '@/lib/client';

export default function Stock() {
  const [wh, setWh] = useState('');
  const [cat, setCat] = useState('');
  const [q, setQ] = useState('');
  const { data: lk } = useData<any>('/api/lookups');
  const { data } = useData<any[]>(
    `/api/stock?${new URLSearchParams({ ...(wh && { warehouse_id: wh }), ...(q && { q }) })}`
  );

  // Filter by category if selected
  const filteredData = useMemo(() => {
    if (!data) return [];
    if (!cat) return data;
    return data.filter(r => (r.category || 'Uncategorized') === cat);
  }, [data, cat]);

  // Group items by Warehouse -> Category
  const grouped = useMemo(() => {
    const map = new Map<string, { warehouseName: string; categories: Map<string, any[]> }>();

    for (const r of filteredData) {
      const whCode = r.warehouse_code || 'Unknown Warehouse';
      const whName = r.warehouse || whCode;
      const category = r.category || 'Uncategorized';

      if (!map.has(whCode)) {
        map.set(whCode, { warehouseName: whName, categories: new Map() });
      }

      const whGroup = map.get(whCode)!;
      if (!whGroup.categories.has(category)) {
        whGroup.categories.set(category, []);
      }
      whGroup.categories.get(category)!.push(r);
    }
    return map;
  }, [filteredData]);

  const total = filteredData.reduce((s, r) => s + Number(r.stock_value || 0), 0);

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Stock Levels</h1>
          <p className="muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
            Organized by Warehouse &amp; Category
          </p>
        </div>
        <div className="row">
          {/* Warehouse Filter */}
          <select value={wh} onChange={e => setWh(e.target.value)} style={{ width: 190 }}>
            <option value="">All Warehouses</option>
            {lk?.warehouses.map((w: any) => (
              <option key={w.id} value={w.id}>
                {w.code} · {w.name}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select value={cat} onChange={e => setCat(e.target.value)} style={{ width: 170 }}>
            <option value="">All Categories</option>
            {lk?.categories.map((c: any) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Search Box */}
          <input
            placeholder="Search SKU or name…"
            value={q}
            onChange={e => setQ(e.target.value)}
            style={{ width: 200 }}
          />
        </div>
      </div>

      {filteredData.length === 0 ? (
        <div className="card" style={{ padding: 0 }}>
          <EmptyState
            title="No inventory records found"
            description={
              q || wh || cat
                ? 'No items match your filter criteria. Try resetting the filters.'
                : 'No stock recorded in the system yet.'
            }
            icon="📦"
          />
        </div>
      ) : (
        Array.from(grouped.entries()).map(([whCode, whData]) => {
          const whTotalValue = Array.from(whData.categories.values())
            .flat()
            .reduce((s, item) => s + Number(item.stock_value || 0), 0);

          return (
            <div key={whCode} className="wh-stock-section" style={{ marginBottom: 28 }}>
              {/* Warehouse Section Header */}
              <div className="wh-header-bar">
                <div className="wh-title">
                  <span className="wh-badge">{whCode}</span>
                  <span className="wh-full-name">{whData.warehouseName}</span>
                </div>
                <div className="wh-value">
                  Total Value: <b>{money(whTotalValue)}</b>
                </div>
              </div>

              {/* Grouped by Category */}
              {Array.from(whData.categories.entries()).map(([categoryName, items]) => {
                const catTotalValue = items.reduce(
                  (s, item) => s + Number(item.stock_value || 0),
                  0
                );

                return (
                  <div key={categoryName} className="card cat-stock-card" style={{ padding: 0, marginBottom: 14 }}>
                    <div className="cat-header-row">
                      <div className="cat-name">
                        <span className="cat-icon-svg" aria-hidden="true">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                            <line x1="7" y1="7" x2="7.01" y2="7" />
                          </svg>
                        </span>
                        <b>{categoryName}</b>
                        <span className="cat-count">({items.length} {items.length === 1 ? 'item' : 'items'})</span>
                      </div>
                      <div className="cat-subtotal">
                        Subtotal: <b>{money(catTotalValue)}</b>
                      </div>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                      <table className="table-fixed table-stock">
                        <colgroup>
                          <col className="col-sku" />
                          <col className="col-product" />
                          <col className="col-qty" />
                          <col className="col-qty" />
                          <col className="col-qty" />
                          <col className="col-val" />
                          <col className="col-val" />
                        </colgroup>
                        <thead>
                          <tr>
                            <th>SKU</th>
                            <th>Product</th>
                            <th className="num">On hand</th>
                            <th className="num">Reserved</th>
                            <th className="num">Available</th>
                            <th className="num">Avg cost</th>
                            <th className="num">Total Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map(r => (
                            <tr key={`${r.product_id}-${r.warehouse_id}`}>
                              <td><b>{r.sku}</b></td>
                              <td title={r.name}>{r.name}</td>
                              <td className="num">
                                {qty(r.qty_on_hand)} <span className="muted" style={{ fontSize: 11 }}>{r.uom}</span>
                              </td>
                              <td className="num">{qty(r.qty_reserved)}</td>
                              <td
                                className={`num ${Number(r.qty_available) <= Number(r.reorder_level) ? 'low' : ''
                                  }`}
                              >
                                <b>{qty(r.qty_available)}</b>
                              </td>
                              <td className="num">{money(r.avg_cost)}</td>
                              <td className="num"><b>{money(r.stock_value)}</b></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })
      )}

      {/* Global Bottom Summary */}
      {filteredData.length > 0 && (
        <div className="card stock-total-card">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--muted)' }}>
              Total Inventory Valuation ({filteredData.length} records):
            </span>
            <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--indigo)' }}>
              {money(total)}
            </span>
          </div>
        </div>
      )}
    </>
  );
}
