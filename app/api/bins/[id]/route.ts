import { api } from '@/lib/api';
import { requireRole } from '@/lib/auth';
import { query, one } from '@/lib/db';

export const dynamic = 'force-dynamic';

export const DELETE = api(async (_req, { params }) => {
  await requireRole('ADMIN', 'MANAGER');
  await query(`DELETE FROM bin_locations WHERE id = $1`, [params.id]);
  return { ok: true };
});

export const PUT = api(async (req, { params }) => {
  await requireRole('ADMIN', 'MANAGER');
  const body = await req.json();
  return one(
    `UPDATE bin_locations SET code = $1, description = $2 WHERE id = $3 RETURNING *`,
    [body.code.toUpperCase(), body.description || null, params.id]
  );
});

