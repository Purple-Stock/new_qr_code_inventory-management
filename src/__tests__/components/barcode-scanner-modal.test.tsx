// @vitest-environment jsdom

import { describe, it, expect, beforeEach, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BarcodeScannerModal } from "@/components/BarcodeScannerModal";

const mockStart = vi.fn();
const mockStop = vi.fn();
const mockClear = vi.fn();
const mockScanFile = vi.fn();

vi.mock("html5-qrcode", () => ({
  Html5Qrcode: vi.fn(function Html5QrcodeMock(this: any) {
    this.start = mockStart;
    this.stop = mockStop;
    this.clear = mockClear;
    this.scanFile = mockScanFile;
  }),
}));

vi.mock("@/lib/i18n", () => ({
  useTranslation: () => ({
    t: {
      stockIn: {
        scannerTitle: "Scanner",
        scannerDescription: "Scan code",
        cameraError: "Camera error",
        imageError: "Image error",
        stopCamera: "Stop camera",
        startCamera: "Start camera",
        uploadQRImage: "Upload image",
        barcodeInput: "Barcode",
        barcodePlaceholder: "Type barcode",
        scannerHint: "Scanner hint",
      },
      common: {
        search: "Search",
        cancel: "Cancel",
      },
    },
  }),
}));

describe("BarcodeScannerModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStop.mockResolvedValue(undefined);
    mockStart.mockResolvedValue(undefined);
    mockScanFile.mockResolvedValue("QR-001");
  });

  it("submits manual barcode with trim and closes", () => {
    const onScan = vi.fn();
    const onManualEnter = vi.fn();
    const onClose = vi.fn();

    render(
      <BarcodeScannerModal
        isOpen
        onClose={onClose}
        onScan={onScan}
        onManualEnter={onManualEnter}
      />
    );

    fireEvent.change(screen.getByPlaceholderText("Type barcode"), {
      target: { value: "  ABC-123  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    expect(onManualEnter).toHaveBeenCalledWith("ABC-123");
    expect(onClose).toHaveBeenCalled();
    expect(onScan).not.toHaveBeenCalled();
  });

  it("shows camera error when scanner start fails", async () => {
    mockStart.mockRejectedValueOnce(new Error("camera denied"));

    render(<BarcodeScannerModal isOpen onClose={vi.fn()} onScan={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Start camera" }));

    expect(await screen.findByText("Camera error")).toBeInTheDocument();
  });

  it("shows image error on invalid uploaded image", async () => {
    mockScanFile.mockRejectedValueOnce(new Error("invalid image"));

    const { container } = render(<BarcodeScannerModal isOpen onClose={vi.fn()} onScan={vi.fn()} />);

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["invalid"], "invalid.png", { type: "image/png" });
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(await screen.findByText("Image error")).toBeInTheDocument();
  });

  it("stops scanner when modal closes", async () => {
    const onClose = vi.fn();

    const { rerender } = render(
      <BarcodeScannerModal isOpen onClose={onClose} onScan={vi.fn()} />
    );

    fireEvent.click(screen.getByRole("button", { name: "Start camera" }));
    await waitFor(() => expect(mockStart).toHaveBeenCalled());

    rerender(<BarcodeScannerModal isOpen={false} onClose={onClose} onScan={vi.fn()} />);

    await waitFor(() => expect(mockStop).toHaveBeenCalled());
  });
});
