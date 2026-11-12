import { api } from '@/lib/api';
import { requireRole } from '@/lib/auth';
import { categories } from '@/lib/crud';
import { categorySchema } from '@/lib/validators';
export const dynamic = 'force-dynamic';
export const GET = api(async () => { await requireRole(); return categories.list(); });
export const POST = api(async req => { await requireRole('ADMIN','MANAGER'); return categories.create(categorySchema.parse(await req.json())); });
