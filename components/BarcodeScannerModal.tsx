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
  const streamRef = useRef<MediaStream | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<any>(null);
  const animFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [errorMsg, setErrorMsg] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [hasCamera, setHasCamera] = useState(true);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [scanningStatus, setScanningStatus] = useState<string>('Initializing camera…');

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
    setScanningStatus('Requesting camera stream…');

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasCamera(false);
        setErrorMsg('Camera access is not supported in this browser environment.');
        return;
      }

      // Try hardware native BarcodeDetector API if supported (Chrome Android / macOS Chrome / Safari preview)
      const hasNativeBarcodeDetector = 'BarcodeDetector' in window;
      let nativeDetector: any = null;
      if (hasNativeBarcodeDetector) {
        try {
          const supported = await (window as any).BarcodeDetector.getSupportedFormats();
          const targetFormats = [
            'code_128',
            'ean_13',
            'ean_8',
            'code_39',
            'upc_a',
            'upc_e',
            'qr_code'
          ].filter(f => supported.includes(f));
          if (targetFormats.length > 0) {
            nativeDetector = new (window as any).BarcodeDetector({ formats: targetFormats });
          }
        } catch (e) {
          nativeDetector = null;
        }
      }

      // Acquire camera stream with high definition & autofocus preferences
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          ...( { focusMode: { ideal: 'continuous' } } as any)
        },
        audio: false
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setHasCamera(true);
        setScanningStatus('Align barcode in the center frame…');

        // If native hardware BarcodeDetector is available, use fast native loop
        if (nativeDetector) {
          const scanLoop = async () => {
            if (!videoRef.current || videoRef.current.readyState < 2) {
              animFrameRef.current = requestAnimationFrame(scanLoop);
              return;
            }
            try {
              const barcodes = await nativeDetector.detect(videoRef.current);
              if (barcodes && barcodes.length > 0) {
                const rawVal = barcodes[0].rawValue;
                if (rawVal) {
                  handleSuccessfulScan(rawVal);
                  return;
                }
              }
            } catch (err) {}
            animFrameRef.current = requestAnimationFrame(scanLoop);
          };
          animFrameRef.current = requestAnimationFrame(scanLoop);
          return;
        }

        // Fallback to ZXing MultiFormat Engine
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

        const codeReader = new BrowserMultiFormatReader(hints, {
          delayBetweenScanAttempts: 150
        });
        readerRef.current = codeReader;

        const controls = codeReader.decodeFromStream(
          stream,
          videoRef.current,
          (result, error) => {
            if (result) {
              const text = result.getText();
              if (text) {
                handleSuccessfulScan(text);
              }
            }
          }
        );
        controlsRef.current = controls;
      }
    } catch (err: any) {
      console.warn('Camera scanner initialization error:', err);
      setHasCamera(false);
      setErrorMsg(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access in browser settings or use manual lookup below.'
          : 'Unable to access device camera. You can scan using an image or enter the code manually below.'
      );
    }
  }

  function handleSuccessfulScan(code: string) {
    playBeep();
    setScannedCode(code);
    stopScanning();
    setTimeout(() => {
      onDetected(code);
      onClose();
    }, 450);
  }

  function stopScanning() {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (controlsRef.current) {
      try {
        controlsRef.current.stop();
      } catch (e) {}
      controlsRef.current = null;
    }
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach(t => t.stop());
      } catch (e) {}
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
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
      osc.frequency.setValueAtTime(950, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.18);
    } catch (e) {}
  }

  // Allow uploading a photo or screenshot of a barcode
  async function handleImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setScanningStatus('Decoding image file…');
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.CODE_128,
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.CODE_39,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.QR_CODE
      ]);
      hints.set(DecodeHintType.TRY_HARDER, true);

      const codeReader = new BrowserMultiFormatReader(hints);
      const url = URL.createObjectURL(file);
      const result = await codeReader.decodeFromImageUrl(url);
      URL.revokeObjectURL(url);

      if (result) {
        handleSuccessfulScan(result.getText());
      }
    } catch (err) {
      setErrorMsg('Could not detect a clear barcode in the uploaded image. Try a sharper photo or enter manually.');
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
              <span>📷</span> Barcode &amp; SKU Scanner
            </h3>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              {scanningStatus}
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
            height: 260,
            background: '#090d16',
            borderRadius: 10,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12
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
                    background: 'rgba(34, 197, 94, 0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 20
                  }}
                >
                  <div style={{ fontSize: 28, marginBottom: 4 }}>✓</div>
                  Scanned!
                  <span style={{ fontSize: 14, fontWeight: 600, marginTop: 4, fontFamily: 'monospace', background: 'rgba(0,0,0,0.3)', padding: '2px 8px', borderRadius: 4 }}>
                    {scannedCode}
                  </span>
                </div>
              ) : (
                <>
                  {/* Active Laser Targeting Sight */}
                  <div
                    style={{
                      position: 'absolute',
                      width: '84%',
                      height: 2,
                      background: '#ef4444',
                      boxShadow: '0 0 12px #ef4444',
                      animation: 'scannerLine 2.2s infinite ease-in-out'
                    }}
                  />
                  {/* Viewfinder Target Boundary Box */}
                  <div
                    style={{
                      position: 'absolute',
                      border: '2px solid rgba(255, 255, 255, 0.75)',
                      width: '82%',
                      height: '62%',
                      borderRadius: 10,
                      boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.35)',
                      pointerEvents: 'none'
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 8,
                      background: 'rgba(0,0,0,0.6)',
                      color: '#f8fafc',
                      padding: '3px 10px',
                      borderRadius: 12,
                      fontSize: 11,
                      pointerEvents: 'none'
                    }}
                  >
                    Hold barcode horizontal &amp; steady
                  </div>
                </>
              )}
            </>
          ) : (
            <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: 24, maxWidth: 360 }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>⚠️</div>
              {errorMsg}
            </div>
          )}
        </div>

        {/* Alternative options: Upload Photo / Manual Key */}
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
            or enter code below
          </span>
        </div>

        {/* Handheld Barcode Gun or Keyboard Direct Entry */}
        <form onSubmit={handleManualSubmit}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              autoFocus
              placeholder="Type or scan with USB handheld gun..."
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

        <style jsx>{`
          @keyframes scannerLine {
            0% { top: 20%; }
            50% { top: 78%; }
            100% { top: 20%; }
          }
        `}</style>
      </div>
    </div>
  );
}
