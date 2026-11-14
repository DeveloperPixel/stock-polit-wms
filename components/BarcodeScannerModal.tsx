'use client';

import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';

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
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<any>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [hasCamera, setHasCamera] = useState(true);
  const [scannedCode, setScannedCode] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      stopScanning();
      setScannedCode(null);
      return;
    }

    startScanning();

    return () => {
      stopScanning();
    };
  }, [isOpen]);

  async function startScanning() {
    setErrorMsg('');
    setScannedCode(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasCamera(false);
        setErrorMsg('Webcam device access is not supported in this browser environment.');
        return;
      }

      // Configure Barcode Formats (Code 128, EAN-13, EAN-8, Code 39, UPC, QR)
      const hints = new Map();
      const formats = [
        BarcodeFormat.CODE_128,
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.CODE_39,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.QR_CODE
      ];
      hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);
      hints.set(DecodeHintType.TRY_HARDER, true);

      const codeReader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 250 });
      readerRef.current = codeReader;

      if (videoRef.current) {
        // Start continuous scanning directly from video stream
        const controls = await codeReader.decodeFromConstraints(
          {
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }
          },
          videoRef.current,
          (result, error) => {
            if (result) {
              const text = result.getText();
              if (text) {
                // Audio beep on detection
                playBeep();
                setScannedCode(text);
                stopScanning();
                setTimeout(() => {
                  onDetected(text);
                  onClose();
                }, 400);
              }
            }
          }
        );
        controlsRef.current = controls;
        setHasCamera(true);
      }
    } catch (err: any) {
      console.warn('ZXing camera scan error:', err);
      setHasCamera(false);
      setErrorMsg('Unable to access device camera. Please allow camera permissions or enter the barcode below.');
    }
  }

  function stopScanning() {
    if (controlsRef.current) {
      try {
        controlsRef.current.stop();
      } catch (e) {}
      controlsRef.current = null;
    }
    readerRef.current = null;
  }

  function playBeep() {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // High pitch A5 beep
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) {}
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
        style={{ maxWidth: 500, padding: 22 }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, borderBottom: '1px solid var(--line)', paddingBottom: 10 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 17 }}>Live Barcode Scanner</h3>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              Align the barcode inside the scan frame
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
            height: 250,
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

              {/* Success Overlay Flash on detection */}
              {scannedCode ? (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(34, 197, 94, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 18
                  }}
                >
                  ✓ Scanned!
                  <span style={{ fontSize: 13, fontWeight: 500, marginTop: 4, fontFamily: 'monospace' }}>
                    {scannedCode}
                  </span>
                </div>
              ) : (
                <>
                  {/* Active Laser Targeting Sight */}
                  <div
                    style={{
                      position: 'absolute',
                      width: '78%',
                      height: 2,
                      background: 'rgba(239, 68, 68, 0.9)',
                      boxShadow: '0 0 10px #ef4444',
                      animation: 'scannerLine 2.2s infinite ease-in-out'
                    }}
                  />
                  {/* Viewfinder Target Boundary Box */}
                  <div
                    style={{
                      position: 'absolute',
                      border: '2px solid rgba(255, 255, 255, 0.65)',
                      width: '74%',
                      height: '58%',
                      borderRadius: 10,
                      boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.35)',
                      pointerEvents: 'none'
                    }}
                  />
                </>
              )}
            </>
          ) : (
            <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: 20 }}>
              {errorMsg}
            </div>
          )}
        </div>

        {/* Handheld or Manual Keyboard Fallback */}
        <form onSubmit={handleManualSubmit}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>
            Direct Scanner / Manual Key Entry
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              autoFocus
              placeholder="Enter barcode or SKU numeral..."
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
            0% { top: 22%; }
            50% { top: 76%; }
            100% { top: 22%; }
          }
        `}</style>
      </div>
    </div>
  );
}
