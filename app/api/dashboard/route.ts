import { api } from '@/lib/api';
import { requireRole } from '@/lib/auth';
import { dashboard } from '@/lib/services/inventory';
export const dynamic = 'force-dynamic';
export const GET = api(async () => { await requireRole(); return dashboard(); });
