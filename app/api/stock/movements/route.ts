import { api } from '@/lib/api';
import { requireRole } from '@/lib/auth';
import { movements } from '@/lib/services/inventory';
export const dynamic = 'force-dynamic';
export const GET = api(async req => {
  await requireRole();
  const p = new URL(req.url).searchParams.get('product_id');
  return movements(p ? Number(p) : undefined);
});
