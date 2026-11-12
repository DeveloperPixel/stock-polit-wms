import { api } from '@/lib/api';
import { requireRole } from '@/lib/auth';
import { vendors } from '@/lib/crud';
import { vendorSchema } from '@/lib/validators';

export const dynamic = 'force-dynamic';
export const GET = api(async req => {
  await requireRole();
  return vendors.list(new URL(req.url).searchParams.get('q') ?? undefined);
});
export const POST = api(async req => {
  await requireRole('ADMIN','MANAGER');
  return vendors.create(vendorSchema.parse(await req.json()));
});
