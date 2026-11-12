import { api } from '@/lib/api';
import { requireRole } from '@/lib/auth';
import { transferSchema } from '@/lib/validators';
import { createTransfer, listTransfers } from '@/lib/services/inventory';
export const dynamic = 'force-dynamic';
export const GET = api(async () => { await requireRole(); return listTransfers(); });
export const POST = api(async req => { const u = await requireRole(); return createTransfer(transferSchema.parse(await req.json()), u.id); });
