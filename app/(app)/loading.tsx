import LoadingSpinner from '@/components/LoadingSpinner';

export default function Loading() {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <LoadingSpinner message="Loading page…" minHeight="40vh" />
    </div>
  );
}
