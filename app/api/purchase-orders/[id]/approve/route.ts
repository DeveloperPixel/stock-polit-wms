import { api } from '@/lib/api';
import { requireRole } from '@/lib/auth';
import { approvePO } from '@/lib/services/purchasing';
export const POST = api(async (_r, { params }) => { const u = await requireRole('ADMIN', 'MANAGER'); return approvePO(Number(params.id), u.id); });
