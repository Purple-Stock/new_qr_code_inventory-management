"use client";

import { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X, Camera, Upload, ScanLine, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/lib/i18n";

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  onManualEnter?: (barcode: string) => void;
}

export function BarcodeScannerModal({
  isOpen,
  onClose,
  onScan,
  onManualEnter,
}: BarcodeScannerModalProps) {
  const { t } = useTranslation();
  const [isScanning, setIsScanning] = useState(false);
  const [manualBarcode, setManualBarcode] = useState("");
  const [error, setError] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerElementId = useRef(`qr-reader-${Math.random().toString(36).substring(7)}`).current;

  // Cleanup when modal closes or unmounts
  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      setManualBarcode("");
      setError("");
    }
    
    return () => {
      stopScanner();
    };
  }, [isOpen]);

  const stopScanner = async () => {
    if (!scannerRef.current) {
      setIsScanning(false);
      return;
    }

    const scanner = scannerRef.current;
    scannerRef.current = null;

    try {
      await scanner.stop();
    } catch (err) {
      // Ignore stop errors (e.g. already stopped or DOM changed)
      console.warn("Stop error (ignored):", err);
    } finally {
      try {
        const element = document.getElementById(scannerElementId);
        if (element && element.isConnected) {
          scanner.clear();
        }
      } catch (e) {
        // Ignore clear errors
      }

      setIsScanning(false);
    }
  };

  const startScanning = async () => {
    if (isScanning) {
      await stopScanner();
      return;
    }

    // Stop any existing scanner
    await stopScanner();

    try {
      setError("");
      
      const element = document.getElementById(scannerElementId);
      if (!element) {
        setError("Scanner element not found");
        return;
      }

      // Ensure clean container; React doesn't own children inside this node.
      element.replaceChildren();
      
      setIsScanning(true);

      const html5QrCode = new Html5Qrcode(scannerElementId);
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          stopScanner();
          onScan(decodedText);
          setTimeout(() => onClose(), 100);
        },
        () => {
          // Ignore scanning errors
        }
      );
    } catch (err: any) {
      console.error("Error starting camera:", err);
      setError(t.stockIn.cameraError);
      stopScanner();
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    stopScanner();
    await new Promise(resolve => setTimeout(resolve, 200));

    try {
      setError("");
      const html5QrCode = new Html5Qrcode(scannerElementId);
      
      const decodedText = await html5QrCode.scanFile(file, false);
      if (decodedText) {
        html5QrCode.clear();
        onScan(decodedText);
        onClose();
      }
    } catch (err: any) {
      console.error("Error scanning file:", err);
      setError(t.stockIn.imageError);
    }
  };

  const handleManualSearch = () => {
    if (manualBarcode.trim()) {
      if (onManualEnter) {
        onManualEnter(manualBarcode.trim());
      } else {
        onScan(manualBarcode.trim());
      }
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 sm:px-6 py-4 flex items-center justify-between rounded-t-xl sm:rounded-t-2xl">
          <div className="flex items-center gap-3">
            <ScanLine className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            <h2 className="text-lg sm:text-xl font-bold text-white">{t.stockIn.scannerTitle}</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 h-8 w-8 p-0"
            >
              <Info className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                stopScanner();
                onClose();
              }}
              className="text-white hover:bg-white/20 h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          <p className="text-sm sm:text-base text-gray-600 text-center">
            {t.stockIn.scannerDescription}
          </p>

          {/* Scanner Area - Element always exists */}
          <div className="relative">
            <div
              id={scannerElementId}
              className={`w-full rounded-lg border-2 border-dashed ${
                isScanning
                  ? "border-blue-500 bg-gray-50"
                  : "border-gray-300 bg-gray-50"
              }`}
              style={{
                minHeight: "300px",
                maxHeight: "400px",
                position: "relative",
              }}
            />
            {!isScanning && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 pointer-events-none z-10">
                <ScanLine className="h-16 w-16 sm:h-20 sm:w-20 text-gray-400 mb-4" />
                <p className="text-sm sm:text-base text-gray-500 text-center">
                  {t.stockIn.scannerDescription}
                </p>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Button
              onClick={startScanning}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white touch-manipulation min-h-[44px] sm:min-h-0"
            >
              <Camera className="h-4 w-4 mr-2" />
              {isScanning ? t.stockIn.stopCamera : t.stockIn.startCamera}
            </Button>
            <label className="flex-1">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 touch-manipulation min-h-[44px] sm:min-h-0"
                asChild
              >
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  {t.stockIn.uploadQRImage}
                </span>
              </Button>
            </label>
          </div>

          {/* Manual Input */}
          <div className="space-y-2">
            <Label htmlFor="manual-barcode" className="text-sm font-semibold text-gray-700">
              {t.stockIn.barcodeInput}
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="manual-barcode"
                  type="text"
                  placeholder={t.stockIn.barcodePlaceholder}
                  value={manualBarcode}
                  onChange={(e) => setManualBarcode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleManualSearch();
                    }
                  }}
                  className="pr-10 h-11 text-base border-gray-300 focus:border-[#6B21A8] focus:ring-[#6B21A8]"
                />
                <ScanLine className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
              </div>
              <Button
                onClick={handleManualSearch}
                disabled={!manualBarcode.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 touch-manipulation min-h-[44px] sm:min-h-0"
              >
                {t.common.search}
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              {t.stockIn.scannerHint}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex justify-end gap-2 sm:gap-3">
          <Button
            variant="outline"
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="border-gray-300 text-gray-700 hover:bg-gray-50 touch-manipulation min-h-[40px] sm:min-h-0"
          >
            {t.common.cancel}
          </Button>
        </div>
      </div>
    </div>
  );
}
