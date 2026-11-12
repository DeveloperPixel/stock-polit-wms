import { Pool, PoolClient, QueryResultRow, types } from 'pg';

// Return DATE columns as 'YYYY-MM-DD' strings (avoid timezone shifts)
types.setTypeParser(1082, v => v);

const g = globalThis as unknown as { __pgPool?: Pool };
export const pool =
  g.__pgPool ?? new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
if (process.env.NODE_ENV !== 'production') g.__pgPool = pool;

export async function query<T extends QueryResultRow = any>(sql: string, params: unknown[] = []) {
  const res = await pool.query<T>(sql, params);
  return res.rows;
}

export async function one<T extends QueryResultRow = any>(sql: string, params: unknown[] = []) {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

/** Run a function inside a single DB transaction (BEGIN/COMMIT/ROLLBACK). */
export async function tx<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
