'use client';
import MasterPage from '@/components/MasterPage';
export default function Warehouses() {
  return <MasterPage title="Warehouses" endpoint="/api/warehouses" defaults={{ active: true }}
    columns={[{ key: 'code', label: 'Code' }, { key: 'name', label: 'Name' }, { key: 'city', label: 'City' },
      { key: 'manager', label: 'Manager' }, { key: 'active', label: 'Active', render: r => (r.active ? 'Yes' : 'No') }]}
    fields={[{ name: 'code', label: 'Code', required: true }, { name: 'name', label: 'Name', required: true },
      { name: 'city', label: 'City' }, { name: 'manager', label: 'Manager' },
      { name: 'address', label: 'Address', type: 'textarea' }, { name: 'active', label: 'Active', type: 'checkbox' }]} />;
}
