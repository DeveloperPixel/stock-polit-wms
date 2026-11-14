'use client';

import { useEffect, useRef, useState } from 'react';
import Quagga from '@ericblade/quagga2';

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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isRunningRef = useRef<boolean>(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [statusText, setStatusText] = useState('Initializing camera…');

  useEffect(() => {
    if (!isOpen) {
      stopQuagga();
      setScannedCode(null);
      return;
    }

    startQuagga();

    return () => {
      stopQuagga();
    };
  }, [isOpen]);

  function startQuagga() {
    setErrorMsg('');
    setScannedCode(null);
    setStatusText('Starting camera…');

    if (!containerRef.current) return;

    // Quagga2 is the dedicated 1D barcode edge-locator engine used by Barcodes Talk and top retail scanners
    Quagga.init(
      {
        inputStream: {
          type: 'LiveStream',
          target: containerRef.current,
          constraints: {
            facingMode: 'environment',
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 },
            aspectRatio: { min: 1, max: 2 }
          },
          singleChannel: false
        },
        locator: {
          patchSize: 'medium',
          halfSample: true
        },
        numOfWorkers: Math.min(4, typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 2 : 2),
        frequency: 15,
        locate: true,
        decoder: {
          readers: [
            'code_128_reader',
            'ean_reader',
            'ean_8_reader',
            'code_39_reader',
            'code_39_vin_reader',
            'upc_reader',
            'upc_e_reader',
            'i2of5_reader',
            '2of5_reader'
          ],
          multiple: false
        }
      },
      (err) => {
        if (err) {
          console.error('Quagga initialization error:', err);
          setErrorMsg(
            err.name === 'NotAllowedError'
              ? 'Camera permission denied. Allow camera access in browser settings.'
              : 'Could not access laptop camera. You can scan from an image or type the code below.'
          );
          setStatusText('');
          isRunningRef.current = false;
          return;
        }

        try {
          Quagga.start();
          isRunningRef.current = true;
          setStatusText('Align barcode anywhere in the camera view');

          Quagga.onDetected(handleQuaggaDetected);
        } catch (e) {
          console.warn('Quagga start failed:', e);
        }
      }
    );
  }

  function handleQuaggaDetected(result: any) {
    if (!isRunningRef.current) return;
    const code = result?.codeResult?.code;
    if (code) {
      isRunningRef.current = false;
      playBeep();
      setScannedCode(code);
      stopQuagga();
      setTimeout(() => {
        onDetected(code);
        onClose();
      }, 450);
    }
  }

  function stopQuagga() {
    isRunningRef.current = false;
    try {
      Quagga.offDetected(handleQuaggaDetected);
      Quagga.stop();
    } catch (e) {}
  }

  function playBeep() {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.18);
    } catch (e) {}
  }

  // Scan from photo or file directly with Quagga
  function handleImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatusText('Decoding image file…');
    const url = URL.createObjectURL(file);

    Quagga.decodeSingle(
      {
        src: url,
        numOfWorkers: 2,
        inputStream: {
          size: 1200
        },
        locator: {
          patchSize: 'medium',
          halfSample: true
        },
        decoder: {
          readers: [
            'code_128_reader',
            'ean_reader',
            'ean_8_reader',
            'code_39_reader',
            'upc_reader',
            'upc_e_reader'
          ]
        }
      },
      (result) => {
        URL.revokeObjectURL(url);
        if (result && result.codeResult && result.codeResult.code) {
          handleQuaggaDetected(result);
        } else {
          setErrorMsg('Could not detect barcode in uploaded image. Please enter code manually.');
        }
      }
    );
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!manualCode.trim()) return;
    playBeep();
    onDetected(manualCode.trim());
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="modal-bg" onClick={onClose} style={{ zIndex: 120 }}>
      <div
        className="modal"
        style={{ maxWidth: 540, padding: 22 }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '1px solid var(--line)', paddingBottom: 10 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 17, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>📷</span> Live Barcode Scanner
            </h3>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              {statusText}
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

        {/* Video Viewport Container with Quagga Locator Engine */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: 280,
            background: '#090d16',
            borderRadius: 10,
            overflow: 'hidden',
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {/* Target for Quagga stream & canvas */}
          <div
            ref={containerRef}
            className="quagga-viewport"
            style={{
              position: 'relative',
              width: '100%',
              height: '100%'
            }}
          />

          {/* Success Overlay on Detection */}
          {scannedCode ? (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(34, 197, 94, 0.85)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                color: '#fff',
                fontWeight: 700,
                fontSize: 22,
                zIndex: 30
              }}
            >
              <div style={{ fontSize: 36, marginBottom: 4 }}>✓</div>
              Barcode Detected!
              <span style={{ fontSize: 15, fontWeight: 600, marginTop: 6, fontFamily: 'monospace', background: 'rgba(0,0,0,0.35)', padding: '4px 12px', borderRadius: 6 }}>
                {scannedCode}
              </span>
            </div>
          ) : (
            <>
              {/* Laser Sight */}
              <div
                style={{
                  position: 'absolute',
                  width: '85%',
                  height: 2,
                  background: '#ef4444',
                  boxShadow: '0 0 12px #ef4444',
                  animation: 'quaggaLaser 2.2s infinite ease-in-out',
                  zIndex: 10,
                  pointerEvents: 'none'
                }}
              />
              {/* Viewfinder Target Reticle */}
              <div
                style={{
                  position: 'absolute',
                  border: '2px solid rgba(255, 255, 255, 0.85)',
                  width: '84%',
                  height: '65%',
                  borderRadius: 10,
                  boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.32)',
                  pointerEvents: 'none',
                  zIndex: 8
                }}
              />
            </>
          )}

          {errorMsg && (
            <div style={{ position: 'absolute', color: '#fca5a5', padding: 20, textAlign: 'center', fontSize: 13, zIndex: 25, background: 'rgba(0,0,0,0.85)', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {errorMsg}
            </div>
          )}
        </div>

        {/* Alternative options: Scan Image / Manual Key Entry */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <button
            type="button"
            className="btn sm"
            style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            onClick={() => fileInputRef.current?.click()}
          >
            <span>📁</span> Scan from image file
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleImageFile}
          />

          <span style={{ fontSize: 11, color: 'var(--muted)' }}>
            or type code below
          </span>
        </div>

        {/* Handheld Barcode Gun or Keyboard Direct Entry */}
        <form onSubmit={handleManualSubmit}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              autoFocus
              placeholder="Type SKU or barcode (or scan with USB scanner gun)..."
              value={manualCode}
              onChange={e => setManualCode(e.target.value)}
              style={{ flex: 1, fontFamily: 'monospace' }}
            />
            <button
              type="submit"
              className="btn primary"
              disabled={!manualCode.trim()}
              style={{ background: '#0B1F4B', borderColor: '#0B1F4B', whiteSpace: 'nowrap' }}
            >
              Search
            </button>
          </div>
        </form>

        <style jsx global>{`
          .quagga-viewport video {
            width: 100% !important;
            height: 100% !important;
            object-fit: cover !important;
          }
          .quagga-viewport canvas {
            display: none !important;
          }
          @keyframes quaggaLaser {
            0% { top: 20%; }
            50% { top: 78%; }
            100% { top: 20%; }
          }
        `}</style>
      </div>
    </div>
  );
}
