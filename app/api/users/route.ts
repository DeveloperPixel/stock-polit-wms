import bcrypt from 'bcryptjs';
import { api } from '@/lib/api';
import { requireRole, HttpError } from '@/lib/auth';
import { query, one } from '@/lib/db';
import { userSchema } from '@/lib/validators';
export const dynamic = 'force-dynamic';
export const GET = api(async () => {
  await requireRole('ADMIN');
  return query(`SELECT id,name,email,role,active,created_at FROM users ORDER BY id`);
});
export const POST = api(async req => {
  await requireRole('ADMIN');
  const d = userSchema.parse(await req.json());
  if (!d.password) throw new HttpError(400, 'Password is required');
  return one(`INSERT INTO users(name,email,password_hash,role,active) VALUES ($1,$2,$3,$4,$5)
              RETURNING id,name,email,role,active`, [d.name, d.email, await bcrypt.hash(d.password, 10), d.role, d.active]);
});
