import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { HttpError } from './auth';

type Handler = (req: Request, ctx: { params: Record<string, string> }) => Promise<unknown>;

/** Wraps a route handler: JSON response + uniform error mapping */
export function api(fn: Handler) {
  return async (req: Request, ctx: { params: Record<string, string> }) => {
    try {
      const data = await fn(req, ctx);
      return NextResponse.json(data ?? { ok: true });
    } catch (e: any) {
      if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
      if (e instanceof ZodError)
        return NextResponse.json({ error: e.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ') }, { status: 400 });
      if (e?.code === '23505') return NextResponse.json({ error: 'Duplicate value: ' + (e.detail ?? '') }, { status: 409 });
      if (e?.code === '23514') return NextResponse.json({ error: e.message }, { status: 422 });
      if (e?.code === '23503') return NextResponse.json({ error: 'Referenced record missing or in use' }, { status: 422 });
      console.error(e);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  };
}
