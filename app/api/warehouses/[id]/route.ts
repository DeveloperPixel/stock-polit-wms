import { api } from '@/lib/api';
import { requireRole, HttpError } from '@/lib/auth';
import { warehouses } from '@/lib/crud';
import { warehouseSchema } from '@/lib/validators';

export const GET = api(async (_req, { params }) => {
  await requireRole();
  const row = await warehouses.get(Number(params.id));
  if (!row) throw new HttpError(404, 'Not found');
  return row;
});
export const PUT = api(async (req, { params }) => {
  await requireRole('ADMIN');
  return warehouses.update(Number(params.id), warehouseSchema.partial().parse(await req.json()));
});
