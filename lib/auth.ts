import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { COOKIE, Role, SessionUser, verifySession } from './session';

export async function getUser(): Promise<SessionUser | null> {
  return verifySession(cookies().get(COOKIE)?.value);
}

/** For server pages: redirect to /login when not signed in */
export async function requirePageUser(): Promise<SessionUser> {
  const u = await getUser();
  if (!u) redirect('/login');
  return u;
}

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/** For API routes: throw 401/403 */
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const u = await getUser();
  if (!u) throw new HttpError(401, 'Not authenticated');
  if (roles.length && !roles.includes(u.role)) throw new HttpError(403, 'Insufficient permission');
  return u;
}
