'use client';
export default function LogoutButton() {
  return <button className="btn sm" onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); location.href = '/login'; }}>Sign out</button>;
}
