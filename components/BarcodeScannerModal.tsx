'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

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
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [errorMsg, setErrorMsg] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const elementId = 'stockpilot-html5-qrcode-reader';

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      setScannedCode(null);
      return;
    }

    startScanner();

    return () => {
      stopScanner();
    };
  }, [isOpen]);

  async function startScanner() {
    setErrorMsg('');
    setScannedCode(null);
    setIsInitializing(true);

    try {
      // Formats supported for warehouse inventory (1D linear barcodes & QR)
      const formatsToSupport = [
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.QR_CODE
      ];

      const html5QrCode = new Html5Qrcode(elementId, {
        formatsToSupport,
        verbose: false
      });
      scannerRef.current = html5QrCode;

      const config = {
        fps: 20, // 20 frames per second scanning
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          // Optimized widescreen barcode rectangle for 1D barcodes
          const width = Math.floor(viewfinderWidth * 0.88);
          const height = Math.floor(viewfinderHeight * 0.55);
          return { width, height };
        },
        aspectRatio: 1.777778, // 16:9 aspect ratio standard for webcams
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true // Native hardware acceleration
        }
      };

      await html5QrCode.start(
        { facingMode: 'environment' },
        config,
        (decodedText: string) => {
          handleSuccess(decodedText);
        },
        () => {
          // Frame by frame parse misses are normal while seeking code
        }
      );

      setIsInitializing(false);
    } catch (err: any) {
      console.warn('html5-qrcode initialization error:', err);
      setIsInitializing(false);
      setErrorMsg(
        err?.name === 'NotAllowedError'
          ? 'Camera permission denied. Allow camera in browser settings or type code below.'
          : 'Could not start camera stream. You can scan from a photo or type code below.'
      );
    }
  }

  function handleSuccess(code: string) {
    if (scannedCode) return;
    playBeep();
    setScannedCode(code);
    stopScanner();
    setTimeout(() => {
      onDetected(code);
      onClose();
    }, 450);
  }

  async function stopScanner() {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (e) {}
      scannerRef.current = null;
    }
  }

  function playBeep() {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(900, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.18);
    } catch (e) {}
  }

  async function handleFileScan(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const html5QrCode = new Html5Qrcode('file-scan-temp-dummy');
      const result = await html5QrCode.scanFile(file, true);
      if (result) {
        handleSuccess(result);
      }
    } catch (err) {
      setErrorMsg('Could not detect barcode in that image file. Please enter code manually.');
    }
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
        style={{ maxWidth: 520, padding: 22 }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '1px solid var(--line)', paddingBottom: 10 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 17, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>📷</span> Live Barcode &amp; SKU Scanner
            </h3>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              {isInitializing ? 'Connecting to camera…' : 'Position barcode inside the viewfinder'}
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

        {/* Viewport container */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            minHeight: 260,
            background: '#090d16',
            borderRadius: 10,
            overflow: 'hidden',
            marginBottom: 12
          }}
        >
          {/* HTML5-QRCode Mount Point */}
          <div id={elementId} style={{ width: '100%' }} />

          {/* Success Overlay on Detection */}
          {scannedCode && (
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
          )}

          {errorMsg && (
            <div style={{ color: '#fca5a5', padding: 20, textAlign: 'center', fontSize: 13 }}>
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
            onChange={handleFileScan}
          />
          <div id="file-scan-temp-dummy" style={{ display: 'none' }} />

          <span style={{ fontSize: 11, color: 'var(--muted)' }}>
            or type code below
          </span>
        </div>

        {/* Handheld Barcode Gun or Keyboard Direct Entry */}
        <form onSubmit={handleManualSubmit}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              autoFocus
              placeholder="Type SKU or barcode (or scan with handheld USB gun)..."
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
      </div>
    </div>
  );
}
