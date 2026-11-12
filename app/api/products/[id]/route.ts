import { api } from '@/lib/api';
import { requireRole, HttpError } from '@/lib/auth';
import { products } from '@/lib/crud';
import { productSchema } from '@/lib/validators';

export const GET = api(async (_req, { params }) => {
  await requireRole();
  const row = await products.get(Number(params.id));
  if (!row) throw new HttpError(404, 'Not found');
  return row;
});
export const PUT = api(async (req, { params }) => {
  await requireRole('ADMIN','MANAGER');
  return products.update(Number(params.id), productSchema.partial().parse(await req.json()));
});
