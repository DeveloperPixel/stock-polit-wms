import { api } from '@/lib/api';
import { requireRole } from '@/lib/auth';
import { cancelSO } from '@/lib/services/sales';
export const POST = api(async (_r, { params }) => { const u = await requireRole(); return cancelSO(Number(params.id)); });
