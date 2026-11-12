import { api } from '@/lib/api';
import { requireRole } from '@/lib/auth';
import { adjustmentSchema } from '@/lib/validators';
import { createAdjustment, listAdjustments } from '@/lib/services/inventory';
export const dynamic = 'force-dynamic';
export const GET = api(async () => { await requireRole(); return listAdjustments(); });
// Adjustments change stock value directly, so only managers/admins may post them
export const POST = api(async req => { const u = await requireRole('ADMIN', 'MANAGER'); return createAdjustment(adjustmentSchema.parse(await req.json()), u.id); });
