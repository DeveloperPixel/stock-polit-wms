'use client';
import MasterPage from '@/components/MasterPage';
import { money, qty, useData } from '@/lib/client';

export default function Products() {
  const { data: lk } = useData<any>('/api/lookups');
  const cats = (lk?.categories ?? []).map((c: any) => ({ value: c.id, label: c.name }));
  return <MasterPage title="Products" endpoint="/api/products" defaults={{ uom: 'PCS', tax_rate: 18, active: true }}
    columns={[
      { key: 'sku', label: 'SKU' }, { key: 'name', label: 'Name' },
      { key: 'category_id', label: 'Category', render: r => cats.find((c: any) => c.value === r.category_id)?.label ?? '—' },
      { key: 'uom', label: 'UOM' },
      { key: 'cost_price', label: 'Cost', num: true, render: r => money(r.cost_price) },
      { key: 'sale_price', label: 'Price', num: true, render: r => money(r.sale_price) },
      { key: 'reorder_level', label: 'Reorder lvl', num: true, render: r => qty(r.reorder_level) },
      { key: 'active', label: 'Active', render: r => (r.active ? 'Yes' : 'No') },
    ]}
    fields={[
      { name: 'sku', label: 'SKU', required: true }, { name: 'name', label: 'Name', required: true },
      { name: 'category_id', label: 'Category', type: 'select', options: cats },
      { name: 'uom', label: 'Unit of measure' }, { name: 'barcode', label: 'Barcode' }, { name: 'hsn_code', label: 'HSN code' },
      { name: 'cost_price', label: 'Cost price', type: 'number' }, { name: 'sale_price', label: 'Sale price', type: 'number' },
      { name: 'tax_rate', label: 'GST %', type: 'number' },
      { name: 'reorder_level', label: 'Reorder level', type: 'number' }, { name: 'reorder_qty', label: 'Reorder qty', type: 'number' },
      { name: 'active', label: 'Active', type: 'checkbox' },
    ]} />;
}
