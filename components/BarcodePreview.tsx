'use client';

import React, { useEffect, useRef } from 'react';

// Code 128 Type B character encodings (107 patterns, each 11 modules wide)
// Represented as run-lengths of alternating bars and spaces [b1, s1, b2, s2, b3, s3]
const CODE128_PATTERNS: number[][] = [
  [2, 1, 2, 2, 2, 2], [2, 2, 2, 1, 2, 2], [2, 2, 2, 2, 2, 1], [1, 2, 1, 2, 2, 3], // 0-3
  [1, 2, 1, 3, 2, 2], [1, 3, 1, 2, 2, 2], [1, 2, 2, 2, 1, 3], [1, 2, 2, 3, 1, 2], // 4-7
  [1, 3, 2, 2, 1, 2], [2, 2, 1, 2, 1, 3], [2, 2, 1, 3, 1, 2], [2, 3, 1, 2, 1, 2], // 8-11
  [1, 1, 2, 2, 3, 2], [1, 2, 2, 1, 3, 2], [1, 2, 2, 2, 3, 1], [1, 1, 3, 2, 2, 2], // 12-15
  [1, 2, 3, 1, 2, 2], [1, 2, 3, 2, 2, 1], [2, 2, 3, 2, 1, 1], [2, 2, 1, 1, 3, 2], // 16-19
  [2, 2, 1, 2, 3, 1], [2, 1, 3, 2, 1, 2], [2, 2, 3, 1, 1, 2], [3, 1, 2, 1, 3, 1], // 20-23
  [3, 1, 1, 2, 2, 2], [3, 2, 1, 1, 2, 2], [3, 2, 1, 2, 2, 1], [3, 1, 2, 2, 1, 2], // 24-27
  [3, 2, 2, 1, 1, 2], [3, 2, 2, 2, 1, 1], [2, 1, 2, 1, 2, 3], [2, 1, 2, 3, 2, 1], // 28-31
  [2, 3, 2, 1, 2, 1], [1, 1, 1, 3, 2, 3], [1, 3, 1, 1, 2, 3], [1, 3, 1, 3, 2, 1], // 32-35
  [1, 1, 2, 3, 1, 3], [1, 3, 2, 1, 1, 3], [1, 3, 2, 3, 1, 1], [2, 1, 1, 3, 1, 3], // 36-39
  [2, 3, 1, 1, 1, 3], [2, 3, 1, 3, 1, 1], [1, 1, 2, 1, 3, 3], [1, 1, 2, 3, 3, 1], // 40-43
  [1, 3, 2, 1, 3, 1], [1, 1, 3, 1, 2, 3], [1, 1, 3, 3, 2, 1], [1, 3, 3, 1, 2, 1], // 44-47
  [3, 1, 3, 1, 2, 1], [2, 1, 1, 3, 3, 1], [2, 3, 1, 1, 3, 1], [2, 1, 3, 1, 1, 3], // 48-51
  [2, 1, 3, 3, 1, 1], [2, 1, 3, 1, 3, 1], [3, 1, 1, 1, 2, 3], [3, 1, 1, 3, 2, 1], // 52-55
  [3, 3, 1, 1, 2, 1], [3, 1, 2, 1, 1, 3], [3, 1, 2, 3, 1, 1], [3, 3, 2, 1, 1, 1], // 56-59
  [3, 1, 4, 1, 1, 1], [2, 2, 1, 4, 1, 1], [4, 3, 1, 1, 1, 1], [1, 1, 1, 2, 2, 4], // 60-63
  [1, 1, 1, 4, 2, 2], [1, 2, 1, 1, 2, 4], [1, 2, 1, 4, 2, 1], [1, 4, 1, 1, 2, 2], // 64-67
  [1, 4, 1, 2, 2, 1], [1, 1, 2, 2, 1, 4], [1, 1, 2, 4, 1, 2], [1, 2, 2, 1, 1, 4], // 68-71
  [1, 2, 2, 4, 1, 1], [1, 4, 2, 1, 1, 2], [1, 4, 2, 2, 1, 1], [2, 4, 1, 2, 1, 1], // 72-75
  [2, 2, 1, 1, 1, 4], [4, 1, 3, 1, 1, 1], [2, 4, 1, 1, 1, 2], [1, 3, 4, 1, 1, 1], // 76-79
  [1, 1, 1, 2, 4, 2], [1, 2, 1, 1, 4, 2], [1, 2, 1, 2, 4, 1], [1, 1, 4, 2, 1, 2], // 80-83
  [1, 2, 4, 1, 1, 2], [1, 2, 4, 2, 1, 1], [4, 1, 1, 2, 1, 2], [4, 2, 1, 1, 1, 2], // 84-87
  [4, 2, 1, 2, 1, 1], [2, 1, 2, 1, 4, 1], [2, 1, 4, 1, 2, 1], [4, 1, 2, 1, 2, 1], // 88-91
  [1, 1, 1, 1, 4, 3], [1, 1, 1, 3, 4, 1], [1, 3, 1, 1, 4, 1], [1, 1, 4, 1, 1, 3], // 92-95
  [1, 1, 4, 3, 1, 1], [4, 1, 1, 1, 1, 3], [4, 1, 1, 3, 1, 1], [1, 1, 3, 1, 4, 1], // 96-99
  [1, 1, 4, 1, 3, 1], [3, 1, 1, 1, 4, 1], [4, 1, 1, 1, 3, 1], [2, 1, 1, 4, 1, 2], // 100-103 (104: START B)
  [2, 1, 1, 2, 1, 4], [2, 1, 1, 2, 3, 2]  // 104 = Start B, 105 = Start C
];
const STOP_PATTERN = [2, 3, 3, 1, 1, 1, 2]; // 106 = Stop pattern (7 segments, 13 modules)

function encodeCode128B(text: string): number[][] {
  const codes: number[] = [104]; // Start B
  let checksum = 104;

  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i) - 32;
    if (code >= 0 && code <= 95) {
      codes.push(code);
      checksum += code * (i + 1);
    }
  }

  codes.push(checksum % 103);

  const patterns: number[][] = [];
  for (const c of codes) {
    if (CODE128_PATTERNS[c]) {
      patterns.push(CODE128_PATTERNS[c]);
    }
  }
  patterns.push(STOP_PATTERN);
  return patterns;
}

interface BarcodePreviewProps {
  value: string;
  sku?: string;
  productName?: string;
  className?: string;
}

export default function BarcodePreview({ value, sku, productName, className }: BarcodePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !value) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cleanVal = String(value).trim();
    if (!cleanVal) return;

    const patterns = encodeCode128B(cleanVal);

    // Calculate total module width
    let totalModules = 0;
    for (const pat of patterns) {
      for (const w of pat) totalModules += w;
    }

    const quietZone = 20; // left and right margin in modules
    const moduleWidth = 2; // pixel width per module
    const canvasWidth = (totalModules + quietZone * 2) * moduleWidth;
    const canvasHeight = 110;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Fill white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Optional top product name text if available
    let topOffset = 18;
    if (sku || productName) {
      ctx.fillStyle = '#475569';
      ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      const topLabel = sku && productName ? `${sku} • ${productName.substring(0, 30)}` : (sku || productName || '');
      ctx.fillText(topLabel, canvasWidth / 2, 14);
      topOffset = 22;
    }

    // Draw barcode bars
    const barHeight = 55;
    let currentX = quietZone * moduleWidth;

    ctx.fillStyle = '#000000';
    for (const pat of patterns) {
      for (let i = 0; i < pat.length; i++) {
        const segWidth = pat[i] * moduleWidth;
        if (i % 2 === 0) {
          // Bar (black)
          ctx.fillRect(currentX, topOffset, segWidth, barHeight);
        }
        currentX += segWidth;
      }
    }

    // Draw bottom text (Barcode numbers)
    ctx.fillStyle = '#0f172a';
    ctx.font = '600 13px "Courier New", Courier, monospace';
    ctx.letterSpacing = '2px';
    ctx.textAlign = 'center';
    ctx.fillText(cleanVal, canvasWidth / 2, topOffset + barHeight + 18);
  }, [value, sku, productName]);

  function handleDownload() {
    const canvas = canvasRef.current;
    if (!canvas || !value) return;

    const link = document.createElement('a');
    const filename = sku ? `barcode-${sku}.png` : `barcode-${value}.png`;
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  if (!value) return null;

  return (
    <div
      className={className}
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 10,
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}
    >
      <div style={{ overflowX: 'auto', maxWidth: '100%', textAlign: 'center' }}>
        <canvas
          ref={canvasRef}
          style={{
            maxWidth: '100%',
            height: 'auto',
            display: 'inline-block',
            borderRadius: 6
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%', justifyContent: 'center' }}>
        <button
          type="button"
          onClick={handleDownload}
          className="btn sm"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: '#0B1F4B',
            color: '#ffffff',
            borderColor: '#0B1F4B',
            fontWeight: 600,
            fontSize: 12,
            padding: '5px 12px'
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download Barcode Image (PNG)
        </button>
      </div>
    </div>
  );
}

