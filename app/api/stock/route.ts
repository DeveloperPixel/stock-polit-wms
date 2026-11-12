import { api } from '@/lib/api';
import { requireRole } from '@/lib/auth';
import { stockLevels } from '@/lib/services/inventory';
export const dynamic = 'force-dynamic';
export const GET = api(async req => {
  await requireRole();
  const sp = new URL(req.url).searchParams;
  return stockLevels(sp.get('warehouse_id') ? Number(sp.get('warehouse_id')) : undefined, sp.get('q') ?? undefined);
});
