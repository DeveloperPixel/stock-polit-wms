'use client';
import Link from 'next/link';
import MasterPage from '@/components/MasterPage';

export default function Vendors() {
  return <MasterPage title="Vendors" endpoint="/api/vendors" defaults={{ payment_terms_days: 30, active: true }}
    columns={[
      { key: 'code', label: 'Code', render: r => <Link href={`/vendors/${r.id}`}>{r.code}</Link> },
      { key: 'name', label: 'Name', render: r => <Link href={`/vendors/${r.id}`}>{r.name}</Link> },
      { key: 'contact_person', label: 'Contact' }, { key: 'phone', label: 'Phone' }, { key: 'gstin', label: 'GSTIN' },
      { key: 'payment_terms_days', label: 'Terms (days)', num: true },
      { key: 'rating', label: 'Rating', num: true, render: r => (r.rating ? `★ ${r.rating}` : '—') },
    ]}
    fields={[
      { name: 'code', label: 'Vendor code', required: true }, { name: 'name', label: 'Name', required: true },
      { name: 'contact_person', label: 'Contact person' }, { name: 'email', label: 'Email', type: 'email' },
      { name: 'phone', label: 'Phone' }, { name: 'gstin', label: 'GSTIN' },
      { name: 'payment_terms_days', label: 'Payment terms (days)', type: 'number' },
      { name: 'rating', label: 'Rating (0-5)', type: 'number' },
      { name: 'address', label: 'Address', type: 'textarea' }, { name: 'active', label: 'Active', type: 'checkbox' },
    ]} />;
}
