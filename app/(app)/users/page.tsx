'use client';
import MasterPage from '@/components/MasterPage';
const roles = ['ADMIN', 'MANAGER', 'STAFF'].map(r => ({ value: r, label: r }));
export default function Users() {
  return <MasterPage title="Users" endpoint="/api/users" defaults={{ role: 'STAFF', active: true }}
    columns={[{ key: 'name', label: 'Name' }, { key: 'email', label: 'Email' }, { key: 'role', label: 'Role' },
      { key: 'active', label: 'Active', render: r => (r.active ? 'Yes' : 'No') }]}
    fields={[{ name: 'name', label: 'Name', required: true }, { name: 'email', label: 'Email', type: 'email', required: true },
      { name: 'password', label: 'Password (leave blank to keep)', type: 'password' },
      { name: 'role', label: 'Role', type: 'select', options: roles, required: true }, { name: 'active', label: 'Active', type: 'checkbox' }]} />;
}
