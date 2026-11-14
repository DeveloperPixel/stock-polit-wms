'use client';

export default function LoadingSpinner({
  message = 'Loading…',
  minHeight = 220
}: {
  message?: string;
  minHeight?: number | string;
}) {
  return (
    <div
      className="page-loader-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight,
        gap: 12,
        padding: 24,
        color: 'var(--muted)',
        userSelect: 'none'
      }}
    >
      <div className="page-spinner" />
      <span style={{ fontSize: 13, fontWeight: 500, letterSpacing: '0.01em' }}>
        {message}
      </span>
    </div>
  );
}
