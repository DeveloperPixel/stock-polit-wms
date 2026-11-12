import { api } from '@/lib/api';
import { requireRole, HttpError } from '@/lib/auth';
import { vendors } from '@/lib/crud';
import { one } from '@/lib/db';
import { vendorSchema } from '@/lib/validators';

export const GET = api(async (_req, { params }) => {
  await requireRole();
  const row = await vendors.get(Number(params.id));
  if (!row) throw new HttpError(404, 'Not found');
  const bal = await one(`SELECT total_received_value, total_paid, balance_due, open_pos FROM v_vendor_balance WHERE vendor_id=$1`, [row.id]);
  return { ...row, ...bal };
});
export const PUT = api(async (req, { params }) => {
  await requireRole('ADMIN', 'MANAGER');
  return vendors.update(Number(params.id), vendorSchema.partial().parse(await req.json()));
});
