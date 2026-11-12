import { z } from 'zod';
import { api } from '@/lib/api';
import { requireRole } from '@/lib/auth';
import { query, one } from '@/lib/db';

export const GET = api(async (_r, { params }) => {
  await requireRole();
  return query(`SELECT pv.*, p.sku, p.name FROM product_vendors pv JOIN products p ON p.id=pv.product_id
                 WHERE vendor_id=$1 ORDER BY p.sku`, [Number(params.id)]);
});
// Link / update a product supplied by this vendor
export const POST = api(async (req, { params }) => {
  await requireRole('ADMIN', 'MANAGER');
  const d = z.object({
    product_id: z.coerce.number().int(), vendor_sku: z.string().optional().nullable(),
    unit_price: z.coerce.number().min(0), lead_time_days: z.coerce.number().int().min(0).default(7),
    preferred: z.coerce.boolean().default(false),
  }).parse(await req.json());
  return one(
    `INSERT INTO product_vendors(product_id,vendor_id,vendor_sku,unit_price,lead_time_days,preferred)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (product_id,vendor_id) DO UPDATE SET vendor_sku=EXCLUDED.vendor_sku, unit_price=EXCLUDED.unit_price,
       lead_time_days=EXCLUDED.lead_time_days, preferred=EXCLUDED.preferred RETURNING *`,
    [d.product_id, Number(params.id), d.vendor_sku ?? null, d.unit_price, d.lead_time_days, d.preferred]);
});
