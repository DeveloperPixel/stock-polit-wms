import { api } from '@/lib/api';
import { requireRole } from '@/lib/auth';
import { customers } from '@/lib/crud';
import { customerSchema } from '@/lib/validators';

export const dynamic = 'force-dynamic';
export const GET = api(async req => {
  await requireRole();
  return customers.list(new URL(req.url).searchParams.get('q') ?? undefined);
});
export const POST = api(async req => {
  await requireRole('ADMIN','MANAGER','STAFF');
  return customers.create(customerSchema.parse(await req.json()));
});
