// @vitest-environment jsdom

import { describe, it, expect, beforeEach, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import LabelsPageClient from "@/app/teams/[id]/labels/_components/LabelsPageClient";
import QRCode from "qrcode";

const saveSpy = vi.fn();
const addImageSpy = vi.fn();
const jsPdfCtorSpy = vi.fn();
const toastSpy = vi.fn();

vi.mock("jspdf", () => ({
  default: vi.fn(function JsPDFMock(this: any) {
    jsPdfCtorSpy();
    this.internal = {
      pageSize: {
        getWidth: () => 210,
        getHeight: () => 297,
      },
    };
    this.setDrawColor = vi.fn();
    this.rect = vi.fn();
    this.setFontSize = vi.fn();
    this.setTextColor = vi.fn();
    this.splitTextToSize = vi.fn((text: string) => [text]);
    this.text = vi.fn();
    this.addImage = addImageSpy;
    this.setFillColor = vi.fn();
    this.addPage = vi.fn();
    this.save = saveSpy;
  }),
}));

vi.mock("qrcode", () => ({
  default: {
    toDataURL: vi.fn(),
  },
}));

vi.mock("@/components/shared/TeamLayout", () => ({
  TeamLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/TutorialTour", () => ({
  TutorialTour: () => null,
}));

vi.mock("@/components/QRCodeDisplay", () => ({
  QRCodeDisplay: ({ value }: { value: string }) => <div data-testid="qr-preview">{value}</div>,
}));

vi.mock("@/components/ui/use-toast-simple", () => ({
  useToast: () => ({
    toast: toastSpy,
  }),
}));

vi.mock("@/lib/i18n", () => ({
  useTranslation: () => ({
    t: {
      common: {
        tutorial: "Tutorial",
        loading: "Loading",
      },
      labels: {
        title: "Labels",
        subtitle: "Labels subtitle",
        selectItems: "Select items",
        settingsHelper: "Arrange label settings",
        settingsFormatTitle: "Format",
        settingsFormatDescription: "Format description",
        settingsContentTitle: "Content",
        settingsContentDescription: "Content description",
        settingsPreviewTitle: "Quick preview",
        settingsPreviewDescription: "Preview description",
        labelSize: "Label size",
        default10x5: "Default 10x5",
        customSize: "Custom",
        widthCm: "Width",
        heightCm: "Height",
        customSizeLimits: "Allowed dimensions: width between 3 and 18 cm, height between 2 and 12 cm.",
        customSizeAdjusted: "Adjusted to {width} x {height} cm",
        includeQRCode: "Include QR",
        qrSizeLabel: "QR size",
        qrScaleLabel: "Custom QR scale (%)",
        qrSizeHint: "Use Large by default to improve scan reliability after printing.",
        qrScaleHint: "Adjust between 70% and 180% to calibrate the QR for your label and printer.",
        qrPanelDescription: "QR panel description",
        includeBarcode: "Include barcode",
        includeItemName: "Include item name",
        includeSKU: "Include SKU",
        includeStock: "Include stock",
        includeCompanyInfo: "Include company info",
        includeCustomField: "Include custom field",
        searchPlaceholder: "Search items",
        selectAll: "Select all",
        deselectAll: "Deselect all",
        generatePDF: "Generate PDF",
        item: "Item",
        sku: "SKU",
        barcode: "Barcode",
        location: "Location",
        stock: "Stock",
        quantityPerItem: "Quantity per item",
        selectedItemsSummary: "{count} selected item(s)",
        totalLabelsSummary: "{count} label(s) will be generated",
        generateSuccessTitle: "PDF generated",
        generateSuccessDescription: "{count} label(s) for {items} item(s) are ready to print.",
        generateErrorTitle: "Could not generate the PDF",
        generateErrorDescription: "Try again",
        invalidBarcodeTitle: "Some barcodes could not be generated",
        invalidBarcodeDescription: "{count} item(s) were printed with the barcode number only because the value is not a valid EAN-13.",
        logoLoadErrorTitle: "Could not load the label logo",
        logoLoadErrorDescription: "The PDF was generated without the logo. Check the image configured in Settings.",
        previewButton: "Preview label",
        previewLabel: "Preview",
        previewModalTitle: "Label preview",
        previewModalDescription: "Visual example of the layout using the options configured on this screen.",
        previewEmpty: "Select an item to preview a sample label.",
        previewNoQr: "QR is disabled in this layout.",
        previewScaleTitle: "Preview scale",
        previewScaleFit: "Fit to screen",
        previewScaleReal: "Real size",
        previewScaleGuide: "Visual guide",
        previewScaleDisclaimer: "Real size uses browser centimeters. The result can vary with zoom level and screen calibration.",
        noItemsSearch: "No items in search",
        noItems: "No items",
        tourTutorialTitle: "A",
        tourTutorialDesc: "A",
        tourSettingsTitle: "A",
        tourSettingsDesc: "A",
        tourSizeTitle: "A",
        tourSizeDesc: "A",
        tourCustomFieldsTitle: "A",
        tourCustomFieldsDesc: "A",
        tourSearchTitle: "A",
        tourSearchDesc: "A",
        tourActionsTitle: "A",
        tourActionsDesc: "A",
        tourListTitle: "A",
        tourListDesc: "A",
        tourSidebarTitle: "A",
        tourSidebarDesc: "A",
      },
      items: {
        unnamedItem: "Unnamed",
      },
      stockByLocation: {
        defaultLocation: "Default location",
      },
    },
  }),
}));

const mockedQRCodeToDataUrl = vi.mocked(QRCode.toDataURL);

const team = {
  id: 99,
  name: "Team Z",
  itemCustomFieldSchema: [],
};

const items = [
  { id: 1, name: "Item A", sku: "A-1", barcode: "590123412345", currentStock: 10, price: 1, locationName: "Main", customFields: null },
  { id: 2, name: "Item B", sku: "B-1", barcode: "790123412345", currentStock: 20, price: 1, locationName: "Main", customFields: null },
];

describe("LabelsPageClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedQRCodeToDataUrl.mockResolvedValue("data:image/png;base64,mock");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({}),
      })
    );
  });

  it("enforces minimum quantity of 1 per selected item", () => {
    render(<LabelsPageClient initialTeam={team as any} initialItems={items as any} />);

    fireEvent.click(screen.getByRole("button", { name: "Select all" }));

    const quantityInput = screen.getByLabelText("Quantity per item Item A") as HTMLInputElement;
    fireEvent.change(quantityInput, { target: { value: "0" } });

    expect(quantityInput.value).toBe("1");
  });

  it("clamps custom dimensions to allowed range", () => {
    render(<LabelsPageClient initialTeam={team as any} initialItems={items as any} />);

    fireEvent.change(screen.getByRole("combobox", { name: "Label size" }), {
      target: { value: "custom" },
    });
    fireEvent.change(screen.getByDisplayValue("10"), {
      target: { value: "100" },
    });
    fireEvent.change(screen.getByDisplayValue("5"), {
      target: { value: "0" },
    });

    expect(screen.getByText("18 x 2 cm")).toBeInTheDocument();
  });

  it("preserves selected items when selecting all from a filtered search", () => {
    render(<LabelsPageClient initialTeam={team as any} initialItems={items as any} />);

    fireEvent.click(screen.getByLabelText("Quantity per item Item A").closest("tr")!);
    fireEvent.change(screen.getByPlaceholderText("Search items"), {
      target: { value: "Item B" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Select all" }));

    expect(screen.getByText("2 selected item(s)")).toBeInTheDocument();
    expect(screen.getByText("2 label(s) will be generated")).toBeInTheDocument();
  });

  it("shows total labels instead of only selected items in the summary", () => {
    render(<LabelsPageClient initialTeam={team as any} initialItems={items as any} />);

    fireEvent.click(screen.getByRole("button", { name: "Select all" }));
    const quantityInput = screen.getByLabelText("Quantity per item Item A");
    fireEvent.change(quantityInput, { target: { value: "3" } });

    expect(screen.getByText("2 selected item(s)")).toBeInTheDocument();
    expect(screen.getByText("4 label(s) will be generated")).toBeInTheDocument();
  });

  it("generates PDF and QR code for selected items", async () => {
    render(<LabelsPageClient initialTeam={team as any} initialItems={items as any} />);

    fireEvent.click(screen.getByRole("button", { name: "Select all" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Generate PDF" })[0]);

    await waitFor(() => expect(saveSpy).toHaveBeenCalled());
    expect(jsPdfCtorSpy).toHaveBeenCalled();
    expect(mockedQRCodeToDataUrl).toHaveBeenCalled();
    expect(addImageSpy).toHaveBeenCalled();
    expect(addImageSpy.mock.calls[0]?.[4]).toBeGreaterThan(30);
    expect(addImageSpy.mock.calls[0]?.[5]).toBeGreaterThan(30);
    expect(toastSpy).toHaveBeenCalledWith({
      variant: "success",
      title: "PDF generated",
      description: "2 label(s) for 2 item(s) are ready to print.",
    });
  });

  it("allows customizing QR size for printing", async () => {
    render(<LabelsPageClient initialTeam={team as any} initialItems={items as any} />);

    fireEvent.change(screen.getByRole("combobox", { name: "Label size" }), {
      target: { value: "zebra_100x150" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "QR size" }), {
      target: { value: "custom" },
    });
    fireEvent.change(screen.getByLabelText("Custom QR scale (%)"), {
      target: { value: "180" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Select all" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Generate PDF" })[0]);

    await waitFor(() => expect(saveSpy).toHaveBeenCalled());
    expect(addImageSpy.mock.calls[0]?.[4]).toBeGreaterThan(40);
    expect(addImageSpy.mock.calls[0]?.[5]).toBeGreaterThan(40);
  });

  it("opens a preview modal with a sample label", () => {
    render(<LabelsPageClient initialTeam={team as any} initialItems={items as any} />);

    fireEvent.click(screen.getAllByRole("button", { name: "Preview label" })[0]);

    expect(screen.getByText("Label preview")).toBeInTheDocument();
    expect(screen.getAllByText("Item A").length).toBeGreaterThan(0);
  });

  it("switches the preview to real-size mode", () => {
    render(<LabelsPageClient initialTeam={team as any} initialItems={items as any} />);

    fireEvent.click(screen.getAllByRole("button", { name: "Preview label" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Real size" }));

    const previewSheet = screen.getByTestId("label-preview-sheet");
    expect(previewSheet).toHaveStyle({ width: "10cm", height: "15cm" });
  });

  it("generates PDF without QR code when QR option is disabled", async () => {
    render(<LabelsPageClient initialTeam={team as any} initialItems={items as any} />);

    fireEvent.click(screen.getByLabelText("Include QR"));
    fireEvent.click(screen.getByRole("button", { name: "Select all" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Generate PDF" })[0]);

    await waitFor(() => expect(saveSpy).toHaveBeenCalled());
    expect(mockedQRCodeToDataUrl).not.toHaveBeenCalled();
  });

  it("warns when barcode cannot be rendered as EAN-13", async () => {
    const invalidBarcodeItems = [
      { ...items[0], barcode: "123" },
    ];

    render(<LabelsPageClient initialTeam={team as any} initialItems={invalidBarcodeItems as any} />);

    fireEvent.click(screen.getByLabelText("Include barcode"));
    fireEvent.click(screen.getByRole("button", { name: "Select all" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Generate PDF" })[0]);

    await waitFor(() =>
      expect(toastSpy).toHaveBeenCalledWith({
        variant: "destructive",
        title: "Some barcodes could not be generated",
        description:
          "1 item(s) were printed with the barcode number only because the value is not a valid EAN-13.",
      })
    );
  });
});
