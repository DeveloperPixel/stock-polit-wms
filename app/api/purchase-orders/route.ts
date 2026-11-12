import { api } from '@/lib/api';
import { requireRole } from '@/lib/auth';
import { poSchema } from '@/lib/validators';
import { createPO, listPOs } from '@/lib/services/purchasing';
export const dynamic = 'force-dynamic';
export const GET = api(async req => { await requireRole(); return listPOs(new URL(req.url).searchParams.get('status') ?? undefined); });
export const POST = api(async req => { const u = await requireRole(); return createPO(poSchema.parse(await req.json()), u.id); });
