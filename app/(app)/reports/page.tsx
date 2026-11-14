'use client';

import { useState } from 'react';
import EmptyState from '@/components/EmptyState';
import { money, qty, useData } from '@/lib/client';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'valuation' | 'low_stock' | 'vendor_payables' | 'movements'>('valuation');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);
  const { data: lookups } = useData<any>('/api/lookups');

  const { data: reportData, isValidating } = useData<any[]>(
    `/api/reports?type=${activeTab}${warehouseFilter ? `&warehouse_id=${warehouseFilter}` : ''}`
  );

  const warehouses = lookups?.warehouses ?? [];

  const exportFileName = `stockpilot-report-${activeTab}-${new Date().toISOString().slice(0, 10)}.csv`;

  // Download CSV file
  function downloadCSV() {
    if (!reportData || reportData.length === 0) return;
    const headers = Object.keys(reportData[0]);
    const csvContent = [
      headers.join(','),
      ...reportData.map(row =>
        headers
          .map(h => {
            const val = row[h];
            if (val === null || val === undefined) return '""';
            return `"${String(val).replace(/"/g, '""')}"`;
          })
          .join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', exportFileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportModal(false);
  }

  // Calculate summary totals
  const totalValuation = activeTab === 'valuation' && reportData
    ? reportData.reduce((s, r) => s + Number(r.stock_value || 0), 0)
    : 0;

  const totalPayables = activeTab === 'vendor_payables' && reportData
    ? reportData.reduce((s, r) => s + Number(r.balance_due || 0), 0)
    : 0;

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Inventory & Business Reports</h1>
          <p className="muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
            Live analytics derived from PostgreSQL views, ledger transactions, and vendor aging balances
          </p>
        </div>

        <div className="row">
          {activeTab === 'valuation' && (
            <select
              value={warehouseFilter}
              onChange={e => setWarehouseFilter(e.target.value)}
              style={{ width: 190 }}
            >
              <option value="">All Warehouses</option>
              {warehouses.map((w: any) => (
                <option key={w.id} value={w.id}>
                  {w.code} — {w.name}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            className="btn"
            onClick={() => setShowExportModal(true)}
            disabled={!reportData || reportData.length === 0}
            style={{
              background: '#0B1F4B',
              color: '#fff',
              borderColor: '#0B1F4B'
            }}
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          borderBottom: '1px solid var(--line)',
          marginBottom: 20,
          overflowX: 'auto'
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('valuation')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'valuation' ? '2px solid var(--indigo)' : '2px solid transparent',
            color: activeTab === 'valuation' ? 'var(--indigo)' : 'var(--muted)',
            fontWeight: activeTab === 'valuation' ? 700 : 500,
            cursor: 'pointer',
            fontSize: 13.5
          }}
        >
          Stock Valuation
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('low_stock')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'low_stock' ? '2px solid var(--indigo)' : '2px solid transparent',
            color: activeTab === 'low_stock' ? 'var(--indigo)' : 'var(--muted)',
            fontWeight: activeTab === 'low_stock' ? 700 : 500,
            cursor: 'pointer',
            fontSize: 13.5
          }}
        >
          Reorder & Low Stock Alerts
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('vendor_payables')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'vendor_payables' ? '2px solid var(--indigo)' : '2px solid transparent',
            color: activeTab === 'vendor_payables' ? 'var(--indigo)' : 'var(--muted)',
            fontWeight: activeTab === 'vendor_payables' ? 700 : 500,
            cursor: 'pointer',
            fontSize: 13.5
          }}
        >
          Vendor Payables & Balance
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('movements')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'movements' ? '2px solid var(--indigo)' : '2px solid transparent',
            color: activeTab === 'movements' ? 'var(--indigo)' : 'var(--muted)',
            fontWeight: activeTab === 'movements' ? 700 : 500,
            cursor: 'pointer',
            fontSize: 13.5
          }}
        >
          Movement Ledger Summary
        </button>
      </div>

      {/* KPI Highlight Strip */}
      {activeTab === 'valuation' && (
        <div className="card" style={{ padding: '14px 20px', marginBottom: 18, background: '#f8fafc' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>Total Filtered Stock Value: </span>
              <b style={{ fontSize: 18, color: 'var(--indigo)' }}>{money(totalValuation)}</b>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>
              Computed on live weighted average cost from append-only movement ledger
            </div>
          </div>
        </div>
      )}

      {activeTab === 'vendor_payables' && (
        <div className="card" style={{ padding: '14px 20px', marginBottom: 18, background: '#f8fafc' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>Total Outstanding Vendor Payables: </span>
              <b style={{ fontSize: 18, color: '#b91c1c' }}>{money(totalPayables)}</b>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>
              Net Due = Received GRN Value − Vendor Payments Made
            </div>
          </div>
        </div>
      )}

      {/* Report Tables */}
      <div className="card" style={{ padding: 0 }}>
        {!reportData && isValidating ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)' }}>Loading report data…</div>
        ) : !reportData || reportData.length === 0 ? (
          <EmptyState
            title="No records found"
            description="No data matches the selected report criteria."
            icon="📊"
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            {activeTab === 'valuation' && (
              <table>
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Warehouse</th>
                    <th className="num">On Hand</th>
                    <th className="num">Reserved</th>
                    <th className="num">Available</th>
                    <th className="num">Avg Cost</th>
                    <th className="num">Total Valuation</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((r, i) => (
                    <tr key={i}>
                      <td><b>{r.sku}</b></td>
                      <td>{r.product_name}</td>
                      <td>{r.category}</td>
                      <td>
                        <span className="badge">{r.warehouse_code}</span> {r.warehouse_name}
                      </td>
                      <td className="num">{qty(r.qty_on_hand)} {r.uom}</td>
                      <td className="num">{qty(r.qty_reserved)}</td>
                      <td className="num"><b>{qty(r.qty_available)}</b></td>
                      <td className="num">{money(r.avg_cost)}</td>
                      <td className="num"><b>{money(r.stock_value)}</b></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'low_stock' && (
              <table>
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Product</th>
                    <th className="num">Current Available</th>
                    <th className="num">Reorder Threshold</th>
                    <th className="num">Suggested Reorder Qty</th>
                    <th>Preferred Supplier</th>
                    <th>Supplier Contact</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((r, i) => (
                    <tr key={i}>
                      <td><b>{r.sku}</b></td>
                      <td>{r.product_name}</td>
                      <td className="num" style={{ color: '#b91c1c', fontWeight: 700 }}>
                        {qty(r.qty_available)}
                      </td>
                      <td className="num">{qty(r.reorder_level)}</td>
                      <td className="num"><b>{qty(r.reorder_qty)}</b></td>
                      <td><b>{r.preferred_vendor || '—'}</b></td>
                      <td>{r.vendor_email || '—'}</td>
                      <td>
                        <span className="badge b-CANCELLED">BELOW MINIMUM</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'vendor_payables' && (
              <table>
                <thead>
                  <tr>
                    <th>Vendor Code</th>
                    <th>Vendor Name</th>
                    <th className="num">Credit Terms</th>
                    <th className="num">Total Received (GRN)</th>
                    <th className="num">Total Paid</th>
                    <th className="num">Net Balance Due</th>
                    <th className="num">Open POs</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((r, i) => (
                    <tr key={i}>
                      <td><b>{r.vendor_code}</b></td>
                      <td>{r.vendor_name}</td>
                      <td className="num">{r.payment_terms_days} days</td>
                      <td className="num">{money(r.total_received_value)}</td>
                      <td className="num">{money(r.total_paid)}</td>
                      <td className="num" style={{ color: Number(r.balance_due) > 0 ? '#b91c1c' : '#047857', fontWeight: 700 }}>
                        {money(r.balance_due)}
                      </td>
                      <td className="num">{r.open_pos}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'movements' && (
              <table>
                <thead>
                  <tr>
                    <th>Movement Type</th>
                    <th className="num">Transactions Count</th>
                    <th className="num">Total In Qty</th>
                    <th className="num">Total Out Qty</th>
                    <th className="num">Total Transaction Value</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((r, i) => (
                    <tr key={i}>
                      <td>
                        <span className="badge" style={{ fontWeight: 700 }}>
                          {r.movement}
                        </span>
                      </td>
                      <td className="num">{r.total_transactions}</td>
                      <td className="num" style={{ color: '#047857' }}>+{qty(r.total_in_qty)}</td>
                      <td className="num" style={{ color: '#b91c1c' }}>-{qty(r.total_out_qty)}</td>
                      <td className="num"><b>{money(r.total_movement_value)}</b></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* CSV Preview & Download Modal */}
      {showExportModal && reportData && reportData.length > 0 && (
        <div
          className="modal-bg"
          onClick={() => setShowExportModal(false)}
        >
          <div
            className="modal"
            style={{ maxWidth: 780, padding: 24 }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid var(--line)', paddingBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18 }}>Export CSV Preview</h3>
                <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>
                  Showing sample rows from {reportData.length} records ready to download as <b>{exportFileName}</b>
                </div>
              </div>
              <button
                type="button"
                className="btn sm"
                style={{ padding: '4px 8px', fontSize: 16, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--muted)' }}
                onClick={() => setShowExportModal(false)}
              >
                ✕
              </button>
            </div>

            {/* Formatted CSV Preview Table */}
            <div style={{ border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden', marginBottom: 16, background: '#fafbfe' }}>
              <div style={{ overflowX: 'auto', maxHeight: 260 }}>
                <table style={{ margin: 0, fontSize: 12 }}>
                  <thead>
                    <tr>
                      {Object.keys(reportData[0]).map(k => (
                        <th key={k} style={{ padding: '8px 12px', background: '#f1f5f9' }}>
                          {k}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.slice(0, 5).map((row, idx) => (
                      <tr key={idx}>
                        {Object.keys(reportData[0]).map(k => (
                          <td key={k} style={{ padding: '7px 12px', whiteSpace: 'nowrap' }}>
                            {row[k] !== null && row[k] !== undefined ? String(row[k]) : '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {reportData.length > 5 && (
                <div style={{ padding: '6px 12px', fontSize: 11.5, color: 'var(--muted)', background: '#fff', borderTop: '1px solid var(--line)' }}>
                  + {reportData.length - 5} more records included in the full export file.
                </div>
              )}
            </div>

            <div className="row" style={{ justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="btn"
                onClick={() => setShowExportModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={downloadCSV}
                style={{
                  background: '#0B1F4B',
                  borderColor: '#0B1F4B'
                }}
              >
                Download CSV ({reportData.length} rows)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
