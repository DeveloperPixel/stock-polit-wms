'use client';
import MasterPage from '@/components/MasterPage';
export default function Customers() {
  return <MasterPage title="Customers" endpoint="/api/customers"
    columns={[{ key: 'name', label: 'Name' }, { key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone' }, { key: 'gstin', label: 'GSTIN' }]}
    fields={[{ name: 'name', label: 'Name', required: true }, { name: 'email', label: 'Email', type: 'email' },
      { name: 'phone', label: 'Phone' }, { name: 'gstin', label: 'GSTIN' }, { name: 'address', label: 'Address', type: 'textarea' }]} />;
}
