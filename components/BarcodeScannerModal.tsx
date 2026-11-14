'use client';

import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import {
  BarcodeFormat,
  BinaryBitmap,
  DecodeHintType,
  HybridBinarizer,
  MultiFormatReader,
  RGBLuminanceSource
} from '@zxing/library';

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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isScanningRef = useRef<boolean>(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [hasCamera, setHasCamera] = useState(true);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [contrastBoost, setContrastBoost] = useState<boolean>(true);

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
    isScanningRef.current = true;

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasCamera(false);
        setErrorMsg('Camera access is not supported in this browser.');
        return;
      }

      // High-resolution video stream
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

        // Prepare ZXing MultiFormatReader
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

        const zxingReader = new MultiFormatReader();
        zxingReader.setHints(hints);

        // Check if hardware BarcodeDetector is available
        const hasNative = 'BarcodeDetector' in window;
        let nativeDetector: any = null;
        if (hasNative) {
          try {
            const supported = await (window as any).BarcodeDetector.getSupportedFormats();
            const targets = ['code_128', 'ean_13', 'ean_8', 'code_39', 'upc_a', 'upc_e', 'qr_code'].filter(f => supported.includes(f));
            if (targets.length > 0) {
              nativeDetector = new (window as any).BarcodeDetector({ formats: targets });
            }
          } catch (e) {}
        }

        const canvas = canvasRef.current || document.createElement('canvas');
        canvasRef.current = canvas;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        // Continuous high-speed image processing scan loop
        let lastScanTime = 0;
        const scanFrame = async (timestamp: number) => {
          if (!isScanningRef.current) return;

          // Limit scanning rate to ~15fps (every 65ms) to balance CPU and responsiveness
          if (timestamp - lastScanTime >= 65 && videoRef.current && videoRef.current.readyState >= 2 && ctx) {
            lastScanTime = timestamp;

            const vWidth = videoRef.current.videoWidth || 1280;
            const vHeight = videoRef.current.videoHeight || 720;

            // Target Region of Interest (ROI) centered in frame (75% width, 55% height)
            const roiW = Math.floor(vWidth * 0.75);
            const roiH = Math.floor(vHeight * 0.55);
            const roiX = Math.floor((vWidth - roiW) / 2);
            const roiY = Math.floor((vHeight - roiH) / 2);

            canvas.width = roiW;
            canvas.height = roiH;

            // Draw center ROI crop
            ctx.drawImage(videoRef.current, roiX, roiY, roiW, roiH, 0, 0, roiW, roiH);

            // 1. Try Hardware BarcodeDetector on cropped canvas
            if (nativeDetector) {
              try {
                const results = await nativeDetector.detect(canvas);
                if (results && results.length > 0 && results[0].rawValue) {
                  handleSuccessfulScan(results[0].rawValue);
                  return;
                }
              } catch (e) {}
            }

            // 2. High-contrast enhancement to beat laptop webcam blur
            const imgData = ctx.getImageData(0, 0, roiW, roiH);
            const pixels = imgData.data;

            // Contrast stretching + unsharp threshold filter
            for (let i = 0; i < pixels.length; i += 4) {
              const lum = pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114;
              // Contrast formula
              let val = lum * 1.5 - 64;
              if (val > 150) val = 255;
              else if (val < 95) val = 0;
              else val = Math.max(0, Math.min(255, val));

              pixels[i] = val;
              pixels[i + 1] = val;
              pixels[i + 2] = val;
            }

            // Convert to ZXing Luminance and decode
            try {
              const lumSource = new RGBLuminanceSource(pixels, roiW, roiH);
              const bitmap = new BinaryBitmap(new HybridBinarizer(lumSource));
              const decoded = zxingReader.decodeWithState(bitmap);
              if (decoded && decoded.getText()) {
                handleSuccessfulScan(decoded.getText());
                return;
              }
            } catch (zxErr) {
              // Frame without barcode - continue loop
            } finally {
              zxingReader.reset();
            }
          }

          animFrameRef.current = requestAnimationFrame(scanFrame);
        };

        animFrameRef.current = requestAnimationFrame(scanFrame);
      }
    } catch (err: any) {
      console.warn('Camera scanner initialization error:', err);
      setHasCamera(false);
      setErrorMsg(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Allow camera in browser settings or enter code below.'
          : 'Unable to start camera. Please enter code manually or upload a picture.'
      );
    }
  }

  function handleSuccessfulScan(code: string) {
    if (!isScanningRef.current) return;
    isScanningRef.current = false;
    playBeep();
    setScannedCode(code);
    stopScanning();
    setTimeout(() => {
      onDetected(code);
      onClose();
    }, 400);
  }

  function stopScanning() {
    isScanningRef.current = false;
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
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

  // File upload fallback (sharp phone photo or screenshot)
  async function handleImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
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
      setErrorMsg('Could not detect barcode in uploaded image. Please enter code manually.');
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
              High-contrast scanner for laptop webcams &amp; mobile cameras
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
                    background: 'rgba(34, 197, 94, 0.75)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 20
                  }}
                >
                  <div style={{ fontSize: 32, marginBottom: 4 }}>✓</div>
                  Scanned!
                  <span style={{ fontSize: 14, fontWeight: 600, marginTop: 4, fontFamily: 'monospace', background: 'rgba(0,0,0,0.3)', padding: '2px 8px', borderRadius: 4 }}>
                    {scannedCode}
                  </span>
                </div>
              ) : (
                <>
                  {/* Laser Sight */}
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
                      border: '2px solid rgba(255, 255, 255, 0.8)',
                      width: '80%',
                      height: '60%',
                      borderRadius: 10,
                      boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.38)',
                      pointerEvents: 'none'
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 8,
                      background: 'rgba(0,0,0,0.65)',
                      color: '#f8fafc',
                      padding: '3px 12px',
                      borderRadius: 12,
                      fontSize: 11,
                      pointerEvents: 'none',
                      textAlign: 'center'
                    }}
                  >
                    Tip: Hold barcode 15–20cm away (avoid holding too close to prevent blur)
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

        {/* Scan Tips Alert */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 11.5, color: '#475569', marginBottom: 12 }}>
          💡 <b>Laptop Camera Tips:</b> Laptop webcams have fixed focus (they blur when held too close). Hold the barcode <b>6 to 8 inches (15–20cm) away</b> so the lines stay sharp and let good lighting hit the code.
        </div>

        {/* Alternative options: Upload Photo / Manual Key */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <button
            type="button"
            className="btn sm"
            style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            onClick={() => fileInputRef.current?.click()}
          >
            <span>📁</span> Scan from photo / image
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
              placeholder="Type SKU or barcode (or scan with USB handheld gun)..."
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
