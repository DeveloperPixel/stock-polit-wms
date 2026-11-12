'use client';
import { useState } from 'react';
import { apiCall, useData } from '@/lib/client';
import EmptyState from '@/components/EmptyState';
import { useToast } from '@/components/Toast';

export type Field = {
  name: string;
  label: string;
  type?: 'text' | 'number' | 'select' | 'checkbox' | 'textarea' | 'password' | 'email';
  options?: { value: string | number; label: string }[];
  required?: boolean;
};

export type Column = {
  key: string;
  label: string;
  num?: boolean;
  render?: (row: any) => React.ReactNode;
};

/** Generic list + create/edit screen for master data */
export default function MasterPage({
  title,
  endpoint,
  fields,
  columns,
  canEdit = true,
  defaults = {}
}: {
  title: string;
  endpoint: string;
  fields: Field[];
  columns: Column[];
  canEdit?: boolean;
  defaults?: Record<string, any>;
}) {
  const [q, setQ] = useState('');
  const { data, error, reload } = useData<any[]>(`${endpoint}${q ? `?q=${encodeURIComponent(q)}` : ''}`);
  const [editing, setEditing] = useState<Record<string, any> | null>(null);
  const [formErr, setFormErr] = useState('');
  const { success, error: toastErr } = useToast();

  const singular = title.replace(/s$/, '');

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setFormErr('');
    const body: Record<string, any> = {};
    for (const f of fields) {
      const v = editing![f.name];
      if (f.type === 'checkbox') body[f.name] = !!v;
      else if (v !== undefined && v !== '') body[f.name] = v;
    }
    try {
      if (editing!.id) {
        await apiCall(`${endpoint}/${editing!.id}`, 'PUT', body);
        success(`${singular} updated successfully`);
      } else {
        await apiCall(endpoint, 'POST', body);
        success(`${singular} created successfully`);
      }
      setEditing(null);
      reload();
    } catch (err: any) {
      setFormErr(err.message);
      toastErr(err.message);
    }
  }

  return (
    <>
      <div className="topbar">
        <h1>{title}</h1>
        <div className="row">
          <input
            placeholder="Search…"
            value={q}
            onChange={e => setQ(e.target.value)}
            style={{ width: 220 }}
          />
          {canEdit && (
            <button className="btn primary" onClick={() => setEditing({ ...defaults })}>
              + New
            </button>
          )}
        </div>
      </div>

      {error && <div className="err">{error}</div>}

      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        {data && data.length === 0 ? (
          <EmptyState
            title={`No ${title.toLowerCase()} found`}
            description={q ? `No ${title.toLowerCase()} matching "${q}". Try clearing the search filter.` : `You haven't added any ${title.toLowerCase()} yet.`}
            actionText={canEdit ? `+ Create First ${singular}` : undefined}
            onAction={canEdit ? () => setEditing({ ...defaults }) : undefined}
            icon={title === 'Warehouses' ? '🏢' : title === 'Vendors' ? '🤝' : title === 'Products' ? '📦' : '📋'}
          />
        ) : (
          <table>
            <thead>
              <tr>
                {columns.map(c => (
                  <th key={c.key} className={c.num ? 'num' : ''}>
                    {c.label}
                  </th>
                ))}
                {canEdit && <th />}
              </tr>
            </thead>
            <tbody>
              {data?.map(r => (
                <tr key={r.id}>
                  {columns.map(c => (
                    <td key={c.key} className={c.num ? 'num' : ''}>
                      {c.render ? c.render(r) : String(r[c.key] ?? '—')}
                    </td>
                  ))}
                  {canEdit && (
                    <td className="right">
                      <button className="btn sm" onClick={() => setEditing({ ...r })}>
                        Edit
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <div className="modal-bg" onClick={() => setEditing(null)}>
          <form className="modal" onClick={e => e.stopPropagation()} onSubmit={save}>
            <h3 style={{ marginTop: 0 }}>
              {editing.id ? 'Edit' : 'New'} {singular}
            </h3>
            {formErr && <div className="err">{formErr}</div>}
            <div className="form">
              {fields.map(f => (
                <div key={f.name} style={f.type === 'textarea' ? { gridColumn: '1/-1' } : undefined}>
                  <label>
                    {f.label}
                    {f.required && ' *'}
                  </label>
                  {f.type === 'select' ? (
                    <select
                      value={editing[f.name] ?? ''}
                      required={f.required}
                      onChange={e => setEditing({ ...editing, [f.name]: e.target.value })}
                    >
                      <option value="">— select —</option>
                      {f.options?.map(o => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  ) : f.type === 'checkbox' ? (
                    <input
                      type="checkbox"
                      style={{ width: 'auto' }}
                      checked={!!editing[f.name]}
                      onChange={e => setEditing({ ...editing, [f.name]: e.target.checked })}
                    />
                  ) : f.type === 'textarea' ? (
                    <textarea
                      rows={2}
                      value={editing[f.name] ?? ''}
                      onChange={e => setEditing({ ...editing, [f.name]: e.target.value })}
                    />
                  ) : (
                    <input
                      type={f.type ?? 'text'}
                      step="any"
                      required={f.required}
                      value={editing[f.name] ?? ''}
                      onChange={e => setEditing({ ...editing, [f.name]: e.target.value })}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="row" style={{ marginTop: 16, justifyContent: 'flex-end' }}>
              <button type="button" className="btn" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button className="btn primary">Save</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
