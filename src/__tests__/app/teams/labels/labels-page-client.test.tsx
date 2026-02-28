// @vitest-environment jsdom

import { describe, it, expect, beforeEach, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import LabelsPageClient from "@/app/teams/[id]/labels/_components/LabelsPageClient";
import QRCode from "qrcode";

const saveSpy = vi.fn();
const addImageSpy = vi.fn();
const jsPdfCtorSpy = vi.fn();

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
        labelSize: "Label size",
        default10x5: "Default 10x5",
        customSize: "Custom",
        widthCm: "Width",
        heightCm: "Height",
        includeQRCode: "Include QR",
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

    fireEvent.change(screen.getByRole("combobox"), {
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

  it("generates PDF and QR code for selected items", async () => {
    render(<LabelsPageClient initialTeam={team as any} initialItems={items as any} />);

    fireEvent.click(screen.getByRole("button", { name: "Select all" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Generate PDF" })[0]);

    await waitFor(() => expect(saveSpy).toHaveBeenCalled());
    expect(jsPdfCtorSpy).toHaveBeenCalled();
    expect(mockedQRCodeToDataUrl).toHaveBeenCalled();
    expect(addImageSpy).toHaveBeenCalled();
  });

  it("generates PDF without QR code when QR option is disabled", async () => {
    render(<LabelsPageClient initialTeam={team as any} initialItems={items as any} />);

    fireEvent.click(screen.getByLabelText("Include QR"));
    fireEvent.click(screen.getByRole("button", { name: "Select all" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Generate PDF" })[0]);

    await waitFor(() => expect(saveSpy).toHaveBeenCalled());
    expect(mockedQRCodeToDataUrl).not.toHaveBeenCalled();
  });
});
