import { api } from '@/lib/api';
import { requireRole, HttpError } from '@/lib/auth';
import { getPO } from '@/lib/services/purchasing';
export const GET = api(async (_r, { params }) => {
  await requireRole();
  const po = await getPO(Number(params.id));
  if (!po) throw new HttpError(404, 'Not found');
  return po;
});
