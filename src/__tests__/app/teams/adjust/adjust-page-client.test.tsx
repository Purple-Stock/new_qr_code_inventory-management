// @vitest-environment jsdom

import { describe, it, expect, beforeEach, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { ERROR_CODES } from "@/lib/errors";
import { AdjustPageClient } from "@/app/teams/[id]/adjust/_components/AdjustPageClient";
import { createAdjustAction } from "@/app/teams/[id]/adjust/_actions/createStockTransaction";
import { fetchApiResult } from "@/lib/api-client";

const toastSpy = vi.fn();
const pushSpy = vi.fn();
const localStorageStore = new Map<string, string>();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushSpy,
  }),
}));

vi.mock("@/app/teams/[id]/adjust/_actions/createStockTransaction", () => ({
  createAdjustAction: vi.fn(),
}));

vi.mock("@/lib/api-client", () => ({
  fetchApiResult: vi.fn(),
}));

vi.mock("@/components/ui/use-toast-simple", () => ({
  useToast: () => ({ toast: toastSpy }),
}));

vi.mock("@/components/shared/TeamLayout", () => ({
  TeamLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/TutorialTour", () => ({
  TutorialTour: () => null,
}));

vi.mock("@/components/BarcodeScannerModal", () => ({
  BarcodeScannerModal: () => null,
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children, id }: { children: ReactNode; id?: string }) => (
    <button type="button" id={id}>
      {children}
    </button>
  ),
  SelectValue: ({ placeholder }: { placeholder: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: ReactNode }) => <button type="button">{children}</button>,
}));

vi.mock("@/lib/i18n", () => ({
  useTranslation: () => ({
    t: {
      common: {
        tutorial: "Tutorial",
        clearFilter: "Clear",
        actions: "Actions",
        error: "Error",
        success: "Success",
        loading: "Loading",
      },
      items: {
        sku: "SKU",
        unnamedItem: "Unnamed",
      },
      adjust: {
        title: "Adjust",
        subtitle: "Adjust subtitle",
        locationRequired: "Location*",
        defaultLocation: "Default location",
        items: "Items",
        searchItem: "Search item",
        scanBarcode: "Scan barcode",
        item: "ITEM",
        currentStock: "CURRENT STOCK",
        currentStockLabel: "Current Stock",
        newStock: "NEW STOCK",
        notes: "Notes",
        notesPlaceholder: "Notes...",
        adjustStock: "Adjust stock",
        noItemsSelected: "No items selected",
        selectLocationFirst: "Select location first",
        quantityRequired: "Quantity required",
        partialAdjustError: "Some items could not be adjusted. Try again.",
        adjustError: "Adjust error",
        stockAdjustedSuccess: "Adjusted",
        itemFound: "Item found",
        itemNotFound: "Item not found",
        noItemWithBarcode: "No item found with barcode:",
        itemAddedToList: "added",
        tourTutorialTitle: "",
        tourTutorialDesc: "",
        tourLocationTitle: "",
        tourLocationDesc: "",
        tourItemsTitle: "",
        tourItemsDesc: "",
        tourTableTitle: "",
        tourTableDesc: "",
        tourNotesTitle: "",
        tourNotesDesc: "",
        tourSubmitTitle: "",
        tourSubmitDesc: "",
        tourSidebarTitle: "",
        tourSidebarDesc: "",
      },
    },
  }),
}));

const mockedCreateAdjustAction = vi.mocked(createAdjustAction);
const mockedFetchApiResult = vi.mocked(fetchApiResult);

const baseTeam = {
  id: 29,
  name: "Team A",
} as any;

const baseLocations = [{ id: 10, name: "CÂMARA FRIA" }];
const baseItems = [
  {
    id: 1,
    name: "CAP CALABRESA",
    sku: null,
    barcode: "123",
    currentStock: 10,
    locationName: "CÂMARA FRIA",
  },
] as any;

describe("AdjustPageClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: (key: string) => localStorageStore.get(key) ?? null,
        setItem: (key: string, value: string) => {
          localStorageStore.set(key, value);
        },
        removeItem: (key: string) => {
          localStorageStore.delete(key);
        },
        clear: () => {
          localStorageStore.clear();
        },
      },
      configurable: true,
    });
    window.localStorage.clear();
    window.localStorage.setItem("userId", "26");
    window.localStorage.setItem("userRole", "operator");
    mockedCreateAdjustAction.mockResolvedValue({ success: true } as any);
    mockedFetchApiResult.mockResolvedValue({ ok: true } as any);
  });

  async function addSelectedItem() {
    render(
      <AdjustPageClient team={baseTeam} locations={baseLocations as any} items={baseItems} />
    );

    fireEvent.change(screen.getByPlaceholderText("Search item"), {
      target: { value: "CAP" },
    });

    fireEvent.click(screen.getByRole("button", { name: /CAP CALABRESA/i }));

    await screen.findByDisplayValue("10");
  }

  it("shows the specific backend error instead of the generic partial error", async () => {
    mockedCreateAdjustAction.mockResolvedValue({
      success: false,
      errorCode: ERROR_CODES.VALIDATION_ERROR,
      error: "Adjustment note is required",
    } as any);

    await addSelectedItem();

    fireEvent.click(screen.getByRole("button", { name: "Adjust stock" }));

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          description: "Adjustment note is required",
        })
      );
    });
  });

  it("logs out automatically when the server returns user not authenticated", async () => {
    mockedCreateAdjustAction.mockResolvedValue({
      success: false,
      errorCode: ERROR_CODES.USER_NOT_AUTHENTICATED,
      error: "User not authenticated",
    } as any);

    await addSelectedItem();

    fireEvent.click(screen.getByRole("button", { name: "Adjust stock" }));

    await waitFor(() => {
      expect(mockedFetchApiResult).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" });
      expect(window.localStorage.getItem("userId")).toBeNull();
      expect(window.localStorage.getItem("userRole")).toBeNull();
      expect(pushSpy).toHaveBeenCalledWith("/");
    });
  });

  it("submits decimal stock values without truncating them", async () => {
    await addSelectedItem();

    fireEvent.change(screen.getByRole("spinbutton"), {
      target: { value: "0.5" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Adjust stock" }));

    await waitFor(() => {
      expect(mockedCreateAdjustAction).toHaveBeenCalledWith(
        29,
        expect.objectContaining({
          itemId: 1,
          quantity: 0.5,
        })
      );
    });
  });

  it("restores an unsaved draft from localStorage and clears it after success", async () => {
    window.localStorage.setItem(
      "inventory-draft:adjust:29",
      JSON.stringify({
        selectedLocation: "10",
        selectedItems: [
          {
            item: baseItems[0],
            newStock: 7,
          },
        ],
        notes: "draft adjust",
      })
    );

    render(
      <AdjustPageClient team={baseTeam} locations={baseLocations as any} items={baseItems} />
    );

    expect(screen.getByText("CAP CALABRESA")).toBeInTheDocument();
    expect(screen.getByDisplayValue("7")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Notes...")).toHaveValue("draft adjust");

    fireEvent.click(screen.getByRole("button", { name: "Adjust stock" }));

    await waitFor(() => {
      expect(mockedCreateAdjustAction).toHaveBeenCalledWith(
        29,
        expect.objectContaining({
          itemId: 1,
          quantity: 7,
          locationId: 10,
          notes: "draft adjust",
        })
      );
      expect(window.localStorage.getItem("inventory-draft:adjust:29")).toBeNull();
    });
  });

  it("ignores restored adjust items that are no longer available", () => {
    window.localStorage.setItem(
      "inventory-draft:adjust:29",
      JSON.stringify({
        selectedLocation: "10",
        selectedItems: [
          {
            item: {
              id: 999,
              name: "Ghost item",
              sku: "GH-1",
              barcode: "999",
              currentStock: 4,
              locationName: "Old",
            },
            newStock: 7,
          },
        ],
        notes: "draft adjust",
      })
    );

    render(
      <AdjustPageClient team={baseTeam} locations={baseLocations as any} items={baseItems} />
    );

    expect(screen.queryByText("Ghost item")).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText("Notes...")).toHaveValue("draft adjust");
  });
});
