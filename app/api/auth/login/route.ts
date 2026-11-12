import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { one } from '@/lib/db';
import { COOKIE, signSession } from '@/lib/session';

export async function POST(req: Request) {
  const parsed = z.object({ email: z.string().email(), password: z.string().min(1) }).safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
  const u = await one(`SELECT * FROM users WHERE lower(email)=lower($1) AND active`, [parsed.data.email]);
  if (!u || !(await bcrypt.compare(parsed.data.password, u.password_hash)))
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  const token = await signSession({ id: u.id, name: u.name, email: u.email, role: u.role });
  const res = NextResponse.json({ id: u.id, name: u.name, role: u.role });
  res.cookies.set(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 43200 });
  return res;
}
