import { api } from '@/lib/api';
import { requireRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { paymentSchema } from '@/lib/validators';
import { recordPayment } from '@/lib/services/purchasing';
export const dynamic = 'force-dynamic';
export const GET = api(async req => {
  await requireRole();
  const v = new URL(req.url).searchParams.get('vendor_id');
  return query(`SELECT vp.*, v.name AS vendor, po.po_number FROM vendor_payments vp JOIN vendors v ON v.id=vp.vendor_id
                LEFT JOIN purchase_orders po ON po.id=vp.po_id WHERE ($1::int IS NULL OR vp.vendor_id=$1) ORDER BY vp.id DESC`, [v ? Number(v) : null]);
});
export const POST = api(async req => { const u = await requireRole('ADMIN', 'MANAGER'); return recordPayment(paymentSchema.parse(await req.json()), u.id); });
