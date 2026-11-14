'use client';
import Link from 'next/link';
import { useState } from 'react';
import Status from '@/components/Status';
import EmptyState from '@/components/EmptyState';
import LoadingSpinner from '@/components/LoadingSpinner';
import { date, money, useData } from '@/lib/client';

export default function POList() {
  const [st, setSt] = useState('');
  const { data } = useData<any[]>(`/api/purchase-orders${st ? `?status=${st}` : ''}`);

  return (
    <>
      <div className="topbar">
        <h1>Purchase Orders</h1>
        <div className="row">
          <select value={st} onChange={e => setSt(e.target.value)} style={{ width: 170 }}>
            <option value="">All statuses</option>
            {['DRAFT', 'APPROVED', 'PARTIAL', 'RECEIVED', 'CANCELLED'].map(s => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <Link className="btn primary" href="/purchase-orders/new">
            + New PO
          </Link>
        </div>
      </div>
      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        {!data ? (
          <LoadingSpinner message="Loading purchase orders…" minHeight={260} />
        ) : data.length === 0 ? (
          <EmptyState
            title="No purchase orders found"
            description={st ? `No purchase orders found with status "${st}".` : "You haven't created any purchase orders yet."}
            actionText="+ Create Purchase Order"
            onAction={() => { window.location.href = '/purchase-orders/new'; }}
            icon="📑"
          />
        ) : (
          <table>
            <thead>
              <tr>
                <th>PO #</th>
                <th>Date</th>
                <th>Vendor</th>
                <th>Warehouse</th>
                <th>Expected</th>
                <th>Status</th>
                <th className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {data?.map(p => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/purchase-orders/${p.id}`}>{p.po_number}</Link>
                  </td>
                  <td>{date(p.order_date)}</td>
                  <td>{p.vendor}</td>
                  <td>{p.warehouse}</td>
                  <td>{date(p.expected_date)}</td>
                  <td>
                    <Status s={p.status} />
                  </td>
                  <td className="num">{money(p.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
