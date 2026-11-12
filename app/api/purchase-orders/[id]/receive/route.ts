import { api } from '@/lib/api';
import { requireRole } from '@/lib/auth';
import { grnSchema } from '@/lib/validators';
import { receivePO } from '@/lib/services/purchasing';
export const POST = api(async (req, { params }) => {
  const u = await requireRole();
  return receivePO(Number(params.id), grnSchema.parse(await req.json()), u.id);
});
