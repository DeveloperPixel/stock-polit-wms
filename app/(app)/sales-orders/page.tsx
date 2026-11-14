'use client';
import Link from 'next/link';
import Status from '@/components/Status';
import EmptyState from '@/components/EmptyState';
import LoadingSpinner from '@/components/LoadingSpinner';
import { date, money, useData } from '@/lib/client';

export default function SOList() {
  const { data } = useData<any[]>('/api/sales-orders');

  return (
    <>
      <div className="topbar">
        <h1>Sales Orders / Dispatch</h1>
        <Link className="btn primary" href="/sales-orders/new">
          + New order
        </Link>
      </div>
      <div className="card" style={{ padding: 0, overflow: 'auto' }}>
        {!data ? (
          <LoadingSpinner message="Loading sales orders…" minHeight={260} />
        ) : data.length === 0 ? (
          <EmptyState
            title="No sales orders found"
            description="You haven't created any sales orders for fulfillment yet."
            actionText="+ Create Sales Order"
            onAction={() => { window.location.href = '/sales-orders/new'; }}
            icon="🚚"
          />
        ) : (
          <table>
            <thead>
              <tr>
                <th>SO #</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Warehouse</th>
                <th>Status</th>
                <th className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {data?.map(s => (
                <tr key={s.id}>
                  <td>
                    <Link href={`/sales-orders/${s.id}`}>{s.so_number}</Link>
                  </td>
                  <td>{date(s.order_date)}</td>
                  <td>{s.customer}</td>
                  <td>{s.warehouse}</td>
                  <td>
                    <Status s={s.status} />
                  </td>
                  <td className="num">{money(s.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
