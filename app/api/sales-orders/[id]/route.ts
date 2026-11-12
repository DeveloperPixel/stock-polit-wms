import { api } from '@/lib/api';
import { requireRole, HttpError } from '@/lib/auth';
import { getSO } from '@/lib/services/sales';
export const GET = api(async (_r, { params }) => {
  await requireRole();
  const so = await getSO(Number(params.id));
  if (!so) throw new HttpError(404, 'Not found');
  return so;
});
