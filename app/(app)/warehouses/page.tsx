'use client';

import { useState } from 'react';
import MasterPage from '@/components/MasterPage';
import { apiCall, useData } from '@/lib/client';
import { useToast } from '@/components/Toast';

export default function Warehouses() {
  const [selectedWh, setSelectedWh] = useState<any | null>(null);
  const [newBinCode, setNewBinCode] = useState('');
  const [newBinDesc, setNewBinDesc] = useState('');
  const [savingBin, setSavingBin] = useState(false);

  const { data: bins, reload: reloadBins } = useData<any[]>(
    selectedWh ? `/api/bins?warehouse_id=${selectedWh.id}` : null
  );
  const { success, error: toastErr } = useToast();

  async function addBin(e: React.FormEvent) {
    e.preventDefault();
    if (!newBinCode.trim() || !selectedWh) return;
    setSavingBin(true);
    try {
      await apiCall('/api/bins', 'POST', {
        warehouse_id: selectedWh.id,
        code: newBinCode.trim(),
        description: newBinDesc.trim() || null
      });
      setNewBinCode('');
      setNewBinDesc('');
      success('Bin location added successfully');
      reloadBins();
    } catch (err: any) {
      toastErr(err.message);
    } finally {
      setSavingBin(false);
    }
  }

  async function deleteBin(binId: number) {
    if (!confirm('Are you sure you want to delete this bin location?')) return;
    try {
      await apiCall(`/api/bins/${binId}`, 'DELETE');
      success('Bin location deleted');
      reloadBins();
    } catch (err: any) {
      toastErr(err.message);
    }
  }

  return (
    <>
      <MasterPage
        title="Warehouses"
        endpoint="/api/warehouses"
        defaults={{ active: true }}
        columns={[
          { key: 'code', label: 'Code' },
          { key: 'name', label: 'Name' },
          { key: 'city', label: 'City' },
          { key: 'manager', label: 'Manager' },
          { key: 'active', label: 'Active', render: r => (r.active ? 'Yes' : 'No') },
          {
            key: 'bins',
            label: 'Shelf Bins',
            render: r => (
              <button
                type="button"
                className="btn sm"
                style={{ padding: '3px 8px', fontSize: 11.5 }}
                onClick={e => {
                  e.stopPropagation();
                  setSelectedWh(r);
                }}
              >
                Manage Bins
              </button>
            )
          }
        ]}
        fields={[
          { name: 'code', label: 'Code', required: true },
          { name: 'name', label: 'Name', required: true },
          { name: 'city', label: 'City' },
          { name: 'manager', label: 'Manager' },
          { name: 'address', label: 'Address', type: 'textarea' },
          { name: 'active', label: 'Active', type: 'checkbox' }
        ]}
      />

      {/* Bin Locations Modal */}
      {selectedWh && (
        <div className="modal-bg" onClick={() => setSelectedWh(null)}>
          <div className="modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid var(--line)', paddingBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18 }}>
                  Bin Locations — {selectedWh.code}
                </h3>
                <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>
                  {selectedWh.name} ({selectedWh.city || 'No City'})
                </div>
              </div>
              <button
                type="button"
                className="btn sm"
                style={{ padding: '4px 8px', fontSize: 16, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--muted)' }}
                onClick={() => setSelectedWh(null)}
              >
                ✕
              </button>
            </div>

            {/* Existing Bins Table */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>
                Current Bins ({bins?.length || 0})
              </div>
              {!bins || bins.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--muted)', background: '#f8fafc', borderRadius: 8 }}>
                  No bin locations configured for this warehouse yet.
                </div>
              ) : (
                <table style={{ fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th>Bin Code</th>
                      <th>Description</th>
                      <th style={{ width: 60 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {bins.map(b => (
                      <tr key={b.id}>
                        <td><b>{b.code}</b></td>
                        <td>{b.description || '—'}</td>
                        <td className="right">
                          <button
                            type="button"
                            className="btn sm danger"
                            style={{ padding: '2px 6px', fontSize: 11 }}
                            onClick={() => deleteBin(b.id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Add New Bin Form */}
            <form onSubmit={addBin} style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid var(--line)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>
                + Add New Bin Location
              </div>
              <div className="prod-grid-2">
                <div>
                  <label style={{ fontWeight: 600 }}>Bin Code (e.g. A-01-01) *</label>
                  <input
                    required
                    placeholder="e.g. A-01-02"
                    value={newBinCode}
                    onChange={e => setNewBinCode(e.target.value)}
                  />
                </div>
                <div>
                  <label>Description / Usage</label>
                  <input
                    placeholder="e.g. Fast movers / Top shelf"
                    value={newBinDesc}
                    onChange={e => setNewBinDesc(e.target.value)}
                  />
                </div>
              </div>
              <div className="row" style={{ marginTop: 12, justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  className={`btn primary sm ${savingBin ? 'loading' : ''}`}
                  disabled={savingBin || !newBinCode.trim()}
                >
                  {savingBin ? 'Adding…' : 'Add Bin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
