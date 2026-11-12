import bcrypt from 'bcryptjs';
import { api } from '@/lib/api';
import { requireRole } from '@/lib/auth';
import { one } from '@/lib/db';
import { userSchema } from '@/lib/validators';
export const PUT = api(async (req, { params }) => {
  await requireRole('ADMIN');
  const d = userSchema.partial().parse(await req.json());
  const hash = d.password ? await bcrypt.hash(d.password, 10) : null;
  return one(`UPDATE users SET name=COALESCE($2,name), email=COALESCE($3,email), role=COALESCE($4::user_role,role),
               active=COALESCE($5,active), password_hash=COALESCE($6,password_hash) WHERE id=$1
              RETURNING id,name,email,role,active`, [Number(params.id), d.name, d.email, d.role, d.active, hash]);
});
