'use client';

import { useEffect, useRef, useState } from 'react';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDetected: (code: string) => void;
}

export default function BarcodeScannerModal({
  isOpen,
  onClose,
  onDetected
}: BarcodeScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [hasCamera, setHasCamera] = useState(true);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  async function startCamera() {
    setErrorMsg('');
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasCamera(false);
        setErrorMsg('Webcam device access not supported in this browser.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsScanning(true);
      }
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      setHasCamera(false);
      setErrorMsg('Camera access was denied or not available. You can use manual entry or simulation below.');
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!manualCode.trim()) return;
    onDetected(manualCode.trim());
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="modal-bg" onClick={onClose} style={{ zIndex: 110 }}>
      <div
        className="modal"
        style={{ maxWidth: 500, padding: 22 }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, borderBottom: '1px solid var(--line)', paddingBottom: 10 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 17 }}>Camera Barcode Scanner</h3>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              Point your camera at a 1D barcode or item label
            </div>
          </div>
          <button
            type="button"
            className="btn sm"
            style={{ padding: '4px 8px', fontSize: 16, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--muted)' }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Video Viewport / Viewfinder */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: 240,
            background: '#090d16',
            borderRadius: 10,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 14
          }}
        >
          {hasCamera ? (
            <>
              <video
                ref={videoRef}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                playsInline
                muted
              />
              {/* Laser Sight Scanning Bar */}
              <div
                style={{
                  position: 'absolute',
                  width: '80%',
                  height: 2,
                  background: 'rgba(239, 68, 68, 0.85)',
                  boxShadow: '0 0 8px #ef4444',
                  animation: 'scannerLine 2s infinite ease-in-out'
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  border: '2px dashed rgba(255,255,255,0.4)',
                  width: '76%',
                  height: '60%',
                  borderRadius: 8,
                  pointerEvents: 'none'
                }}
              />
            </>
          ) : (
            <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: 20 }}>
              {errorMsg}
            </div>
          )}
        </div>

        {/* Manual Barcode Input Fallback / Rapid Scanner */}
        <form onSubmit={handleManualSubmit}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>
            Direct / Handheld Scanner Input
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              autoFocus
              placeholder="Scan or type barcode / SKU..."
              value={manualCode}
              onChange={e => setManualCode(e.target.value)}
              style={{ flex: 1, fontFamily: 'monospace' }}
            />
            <button
              type="submit"
              className="btn primary"
              disabled={!manualCode.trim()}
              style={{ background: '#0B1F4B', borderColor: '#0B1F4B' }}
            >
              Lookup
            </button>
          </div>
        </form>

        <style jsx>{`
          @keyframes scannerLine {
            0% { top: 20%; }
            50% { top: 75%; }
            100% { top: 20%; }
          }
        `}</style>
      </div>
    </div>
  );
}
