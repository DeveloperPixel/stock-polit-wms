import { api } from '@/lib/api';
import { requireRole } from '@/lib/auth';
import { products } from '@/lib/crud';
import { productSchema } from '@/lib/validators';

export const dynamic = 'force-dynamic';
export const GET = api(async req => {
  await requireRole();
  return products.list(new URL(req.url).searchParams.get('q') ?? undefined);
});
export const POST = api(async req => {
  await requireRole('ADMIN','MANAGER');
  return products.create(productSchema.parse(await req.json()));
});
