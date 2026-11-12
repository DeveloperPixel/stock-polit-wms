import { api } from '@/lib/api';
import { requireRole } from '@/lib/auth';
import { confirmSO } from '@/lib/services/sales';
export const POST = api(async (_r, { params }) => { const u = await requireRole(); return confirmSO(Number(params.id)); });
