import { api } from '@/lib/api';
import { requireRole, HttpError } from '@/lib/auth';
import { customers } from '@/lib/crud';
import { customerSchema } from '@/lib/validators';

export const GET = api(async (_req, { params }) => {
  await requireRole();
  const row = await customers.get(Number(params.id));
  if (!row) throw new HttpError(404, 'Not found');
  return row;
});
export const PUT = api(async (req, { params }) => {
  await requireRole('ADMIN','MANAGER','STAFF');
  return customers.update(Number(params.id), customerSchema.partial().parse(await req.json()));
});
