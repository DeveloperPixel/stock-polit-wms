// Edge-safe JWT helpers (used by middleware and server code)
import { SignJWT, jwtVerify } from 'jose';

export type Role = 'ADMIN' | 'MANAGER' | 'STAFF';
export type SessionUser = { id: number; name: string; email: string; role: Role };
export const COOKIE = 'wms_session';

const secret = () =>
  new TextEncoder().encode(process.env.JWT_SECRET || 'dev-only-secret-change-me-please-32ch');

export async function signSession(u: SessionUser) {
  return new SignJWT({ ...u })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('12h')
    .sign(secret());
}

export async function verifySession(token?: string): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}
