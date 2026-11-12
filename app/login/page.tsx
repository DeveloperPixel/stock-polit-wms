'use client';
import { useState } from 'react';

export default function Login() {
  const [email, setEmail] = useState('admin@wms.local');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    const r = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (r.ok) location.href = '/';
    else {
      setErr((await r.json()).error);
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <form className="card login-card" onSubmit={submit}>
        <h2 style={{ marginTop: 0, fontSize: 24 }}>
          Stock<span style={{ color: 'var(--pink)' }}>Pilot</span> WMS
        </h2>
        <p className="muted" style={{ marginBottom: 20 }}>
          Sign in to manage stock, vendors &amp; warehouses
        </p>

        {err && <div className="err">{err}</div>}

        <label style={{ fontSize: 13 }}>Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="name@company.com"
        />

        <div style={{ height: 14 }} />

        <label style={{ fontSize: 13 }}>Password</label>
        <div className="password-wrapper">
          <input
            type={showPassword ? 'text' : 'password'}
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
          />
          <button
            type="button"
            className="eye-btn"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>

        <div style={{ height: 22 }} />

        <button
          className="btn primary"
          style={{ width: '100%', padding: '11px', fontSize: 14 }}
          disabled={busy}
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
