"use client";

import { useEffect, useRef, useState } from "react";

interface QrCodeProps {
  value: string;
  size?: number;
  className?: string;
}

export function QrCode({ value, size = 200, className }: QrCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError]   = useState(false);
  const [ready, setReady]   = useState(false);

  useEffect(() => {
    if (!value || !canvasRef.current) return;

    let cancelled = false;

    import("qrcode").then((QRCode) => {
      if (cancelled || !canvasRef.current) return;
      QRCode.toCanvas(canvasRef.current, value, {
        width:  size,
        margin: 2,
        color:  { dark: "#0f172a", light: "#ffffff" },
        errorCorrectionLevel: "M",
      })
        .then(() => { if (!cancelled) setReady(true); })
        .catch(() => { if (!cancelled) setError(true); });
    });

    return () => { cancelled = true; };
  }, [value, size]);

  if (error) {
    return (
      <div
        className={className}
        style={{ width: size, height: size }}
        role="img"
        aria-label="QR Code indisponible"
      >
        <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg text-gray-400 text-xs text-center p-2">
          QR Code<br />indisponible
        </div>
      </div>
    );
  }

  return (
    <div className={className} style={{ position: "relative", width: size, height: size }}>
      {!ready && (
        <div
          className="absolute inset-0 bg-gray-100 rounded-lg animate-pulse"
          style={{ width: size, height: size }}
        />
      )}
      <canvas
        ref={canvasRef}
        style={{
          display: ready ? "block" : "none",
          borderRadius: 8,
        }}
        aria-label="QR Code rendez-vous"
      />
    </div>
  );
}
