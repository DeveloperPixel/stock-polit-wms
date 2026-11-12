import { api } from '@/lib/api';
import { requireRole } from '@/lib/auth';
export const GET = api(async () => requireRole());
export const dynamic = 'force-dynamic';
