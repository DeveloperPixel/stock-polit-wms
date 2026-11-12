import { api } from '@/lib/api';
import { requireRole } from '@/lib/auth';
import { cancelPO } from '@/lib/services/purchasing';
export const POST = api(async (_r, { params }) => { await requireRole('ADMIN', 'MANAGER'); return cancelPO(Number(params.id)); });
