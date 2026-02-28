// @vitest-environment jsdom

import { describe, it, expect, beforeEach, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { ScanPageClient } from "@/app/teams/[id]/scan/_components/ScanPageClient";
import { fetchApiResult } from "@/lib/api-client";

const toastSpy = vi.fn();

vi.mock("@/lib/api-client", () => ({
  fetchApiResult: vi.fn(),
}));

vi.mock("@/components/ui/use-toast-simple", () => ({
  useToast: () => ({ toast: toastSpy }),
}));

vi.mock("@/components/shared/TeamLayout", () => ({
  TeamLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/BarcodeScannerModal", () => ({
  BarcodeScannerModal: () => null,
}));

vi.mock("@/lib/i18n", () => ({
  useTranslation: () => ({
    t: {
      common: {
        loading: "Loading",
        error: "Error",
        actions: "Actions",
        close: "Close",
      },
      scan: {
        title: "Scan",
        subtitle: "Scan subtitle",
        openScanner: "Open scanner",
        manualLookupHint: "Type a code",
        codePlaceholder: "Enter code",
        lookupButton: "Lookup",
        noItemWithCode: "No item with code",
        itemNotFound: "Item not found",
        itemFound: "Item found",
        openingSummary: "Opening summary",
        multipleItemsFound: "Multiple items found",
        selectItemFromList: "Select item",
        lookupError: "Lookup error",
        codeRequired: "Code required",
        resultsTitle: "Results",
        noMultipleResults: "No multiple results",
        resultsEmptyHint: "No results yet",
        openSummary: "Open summary",
        summaryTitle: "Summary",
        noPhoto: "No photo",
      },
      items: {
        item: "Item",
        sku: "SKU",
        stock: "Stock",
        unnamedItem: "Unnamed",
      },
      locations: {
        title: "Location",
      },
      reports: {
        noLocation: "No location",
      },
      labels: {
        barcode: "Barcode",
      },
      itemForm: {
        customFieldsTitle: "Custom fields",
      },
    },
  }),
}));

const mockedFetchApiResult = vi.mocked(fetchApiResult);

const baseTeam = {
  id: 10,
  name: "Team A",
  itemCustomFieldSchema: [],
} as any;

describe("ScanPageClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows error toast for empty code", async () => {
    render(
      <ScanPageClient team={baseTeam} initialItems={[]} preferServerLookup={true} />
    );

    fireEvent.click(screen.getByRole("button", { name: "Lookup" }));

    expect(toastSpy).toHaveBeenCalledWith(
      expect.objectContaining({ description: "Code required" })
    );
    expect(mockedFetchApiResult).not.toHaveBeenCalled();
  });

  it("uses server lookup when preferServerLookup is true", async () => {
    mockedFetchApiResult.mockResolvedValueOnce({
      ok: true,
      data: {
        items: [{ id: 1, name: "Item A", sku: "A-1", barcode: "ABC", currentStock: 5, locationName: "Main", photoData: null, customFields: null }],
      },
    } as any);

    render(
      <ScanPageClient team={baseTeam} initialItems={[]} preferServerLookup={true} />
    );

    fireEvent.change(screen.getByPlaceholderText("Enter code"), {
      target: { value: "ABC" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Lookup" }));

    await waitFor(() => {
      expect(mockedFetchApiResult).toHaveBeenCalledWith(
        "/api/teams/10/items/lookup?code=ABC",
        { fallbackError: "Lookup error" }
      );
    });

    expect(await screen.findByText("Opening summary")).toBeInTheDocument();
  });

  it("uses local first and updates with background server validation", async () => {
    mockedFetchApiResult.mockResolvedValueOnce({
      ok: true,
      data: {
        items: [
          { id: 1, name: "Local", sku: "L-1", barcode: "ABC", currentStock: 1, locationName: "L", photoData: null, customFields: null },
          { id: 2, name: "Server", sku: "S-1", barcode: "ABC", currentStock: 2, locationName: "S", photoData: null, customFields: null },
        ],
      },
    } as any);

    render(
      <ScanPageClient
        team={baseTeam}
        initialItems={[
          { id: 1, name: "Local", sku: "L-1", barcode: "ABC", currentStock: 1, locationName: "L", photoData: null, customFields: null },
        ]}
        preferServerLookup={false}
      />
    );

    fireEvent.change(screen.getByPlaceholderText("Enter code"), {
      target: { value: "ABC" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Lookup" }));

    expect(await screen.findByText("Opening summary")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Multiple items found (2)")).toBeInTheDocument();
    });
  });

  it("renders error state when API returns an error result", async () => {
    mockedFetchApiResult.mockResolvedValueOnce({
      ok: false,
      error: {
        error: "Request failed",
      },
    } as any);

    render(
      <ScanPageClient team={baseTeam} initialItems={[]} preferServerLookup={true} />
    );

    fireEvent.change(screen.getByPlaceholderText("Enter code"), {
      target: { value: "ABC" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Lookup" }));

    expect(await screen.findByText("Request failed")).toBeInTheDocument();
    expect(toastSpy).toHaveBeenCalledWith(
      expect.objectContaining({ description: "Request failed" })
    );
  });
});
