import { api } from '@/lib/api';
import { requireRole } from '@/lib/auth';
import { query, one } from '@/lib/db';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const binSchema = z.object({
  warehouse_id: z.coerce.number().int(),
  code: z.string().trim().min(1),
  description: z.string().trim().optional().nullable(),
});

export const GET = api(async req => {
  await requireRole();
  const { searchParams } = new URL(req.url);
  const warehouseId = searchParams.get('warehouse_id');

  let sql = `
    SELECT b.*, w.code AS warehouse_code, w.name AS warehouse_name
    FROM bin_locations b
    JOIN warehouses w ON w.id = b.warehouse_id
  `;
  const params: any[] = [];
  if (warehouseId) {
    params.push(warehouseId);
    sql += ` WHERE b.warehouse_id = $1`;
  }
  sql += ` ORDER BY w.code, b.code`;
  return query(sql, params);
});

export const POST = api(async req => {
  await requireRole('ADMIN', 'MANAGER');
  const d = binSchema.parse(await req.json());
  return one(
    `INSERT INTO bin_locations(warehouse_id, code, description) VALUES ($1, $2, $3) RETURNING *`,
    [d.warehouse_id, d.code.toUpperCase(), d.description || null]
  );
});

