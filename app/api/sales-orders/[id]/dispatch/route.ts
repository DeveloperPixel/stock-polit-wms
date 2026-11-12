import { api } from '@/lib/api';
import { requireRole } from '@/lib/auth';
import { dispatchSO } from '@/lib/services/sales';
export const POST = api(async (_r, { params }) => { const u = await requireRole(); return dispatchSO(Number(params.id), u.id); });
