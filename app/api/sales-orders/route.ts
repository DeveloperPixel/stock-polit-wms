import { api } from '@/lib/api';
import { requireRole } from '@/lib/auth';
import { soSchema } from '@/lib/validators';
import { createSO, listSOs } from '@/lib/services/sales';
export const dynamic = 'force-dynamic';
export const GET = api(async () => { await requireRole(); return listSOs(); });
export const POST = api(async req => { const u = await requireRole(); return createSO(soSchema.parse(await req.json()), u.id); });
