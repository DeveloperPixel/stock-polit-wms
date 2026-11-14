'use client';
import Link from 'next/link';
import EmptyState from '@/components/EmptyState';
import LoadingSpinner from '@/components/LoadingSpinner';
import { date, money, useData } from '@/lib/client';

export default function Payments() {
  const { data } = useData<any[]>('/api/vendor-payments');

  return (
    <>
      <div className="topbar">
        <h1>Vendor Payments</h1>
        <span className="muted">Record payments from a vendor’s profile</span>
      </div>
      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        {!data ? (
          <LoadingSpinner message="Loading payments ledger…" minHeight={240} />
        ) : data.length === 0 ? (
          <EmptyState
            title="No payments recorded"
            description="Payments are recorded directly from individual vendor profile pages."
            actionText="Browse Vendors"
            onAction={() => { window.location.href = '/vendors'; }}
            icon="💳"
          />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Vendor</th>
                <th>PO</th>
                <th>Mode</th>
                <th>Reference</th>
                <th className="num">Amount</th>
              </tr>
            </thead>
            <tbody>
              {data?.map(p => (
                <tr key={p.id}>
                  <td>{date(p.paid_on)}</td>
                  <td>
                    <Link href={`/vendors/${p.vendor_id}`}>{p.vendor}</Link>
                  </td>
                  <td>{p.po_number ?? '—'}</td>
                  <td>{p.mode}</td>
                  <td>{p.reference ?? '—'}</td>
                  <td className="num">{money(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
