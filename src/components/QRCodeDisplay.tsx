"use client";

import { QRCodeSVG } from "qrcode.react";

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  className?: string;
}

export function QRCodeDisplay({ value, size = 64, className = "" }: QRCodeDisplayProps) {
  if (!value) {
    return (
      <div className={`bg-gray-100 rounded flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
        <span className="text-xs text-gray-400">No code</span>
      </div>
    );
  }

  return (
    <div className={`bg-white p-1 rounded ${className}`} style={{ width: size, height: size }}>
      <QRCodeSVG
        value={value}
        size={size - 8}
        level="M"
        includeMargin={false}
      />
    </div>
  );
}
