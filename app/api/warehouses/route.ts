import { api } from '@/lib/api';
import { requireRole } from '@/lib/auth';
import { warehouses } from '@/lib/crud';
import { warehouseSchema } from '@/lib/validators';

export const dynamic = 'force-dynamic';
export const GET = api(async req => {
  await requireRole();
  return warehouses.list(new URL(req.url).searchParams.get('q') ?? undefined);
});
export const POST = api(async req => {
  await requireRole('ADMIN');
  return warehouses.create(warehouseSchema.parse(await req.json()));
});
