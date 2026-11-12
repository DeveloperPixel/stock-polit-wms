'use client';
import { useCallback, useEffect, useState } from 'react';

// In-memory client cache: persists while the app tab is open
const cache = new Map<string, { data: any; timestamp: number }>();

export async function apiCall<T = any>(url: string, method = 'GET', body?: unknown): Promise<T> {
  const r = await fetch(url, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || `Request failed (${r.status})`);
  return data;
}

/**
 * SWR (Stale-While-Revalidate) Hook:
 * 1. Instantly returns cached/stale data if available (zero blank loading state).
 * 2. Fetches fresh data silently in the background.
 * 3. Updates state and cache once the fresh API result arrives.
 */
export function useData<T = any>(url: string | null) {
  // Initialize state with cached data if present
  const [data, setData] = useState<T | null>(() => {
    if (!url) return null;
    return cache.has(url) ? (cache.get(url)!.data as T) : null;
  });
  const [error, setError] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  const reload = useCallback(() => {
    if (!url) return;

    // Show previous cached data immediately
    if (cache.has(url)) {
      setData(cache.get(url)!.data as T);
    }

    setIsValidating(true);
    apiCall<T>(url)
      .then(freshData => {
        cache.set(url, { data: freshData, timestamp: Date.now() });
        setData(freshData);
        setError('');
      })
      .catch(e => {
        setError(e.message);
      })
      .finally(() => {
        setIsValidating(false);
      });
  }, [url]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, error, reload, isValidating };
}

export const money = (v: unknown) =>
  '₹' + Number(v ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const qty = (v: unknown) => Number(v ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 3 });
export const date = (v: unknown) => (v ? new Date(String(v)).toLocaleDateString('en-IN') : '—');
