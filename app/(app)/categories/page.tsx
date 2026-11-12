'use client';
import MasterPage from '@/components/MasterPage';
export default function Categories() {
  return <MasterPage title="Categories" endpoint="/api/categories" canEdit
    columns={[{ key: 'id', label: 'ID' }, { key: 'name', label: 'Name' }]}
    fields={[{ name: 'name', label: 'Name', required: true }]} />;
}
