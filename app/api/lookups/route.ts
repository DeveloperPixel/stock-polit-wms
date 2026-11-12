// Dropdown data for forms in one call
import { api } from '@/lib/api';
import { requireRole } from '@/lib/auth';
import { query } from '@/lib/db';
export const dynamic = 'force-dynamic';
export const GET = api(async () => {
  await requireRole();
  const [products, vendors, warehouses, customers, categories] = await Promise.all([
    query(`SELECT id, sku, name, uom, cost_price, sale_price, tax_rate FROM products WHERE active ORDER BY sku`),
    query(`SELECT id, code, name FROM vendors WHERE active ORDER BY name`),
    query(`SELECT id, code, name FROM warehouses WHERE active ORDER BY code`),
    query(`SELECT id, name FROM customers ORDER BY name`),
    query(`SELECT id, name FROM categories ORDER BY name`),
  ]);
  const vendorPrices = await query(`SELECT product_id, vendor_id, unit_price FROM product_vendors`);
  return { products, vendors, warehouses, customers, categories, vendorPrices };
});
