import { NextRequest, NextResponse } from 'next/server';
import { COOKIE, verifySession } from '@/lib/session';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith('/login') || pathname.startsWith('/api/auth/login')) return NextResponse.next();
  const user = await verifySession(req.cookies.get(COOKIE)?.value);
  if (!user) {
    if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    return NextResponse.redirect(new URL('/login', req.url));
  }
  return NextResponse.next();
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
