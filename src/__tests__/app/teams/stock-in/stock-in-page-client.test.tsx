// @vitest-environment jsdom

import { describe, it, expect, beforeEach, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { ERROR_CODES } from "@/lib/errors";
import { StockInPageClient } from "@/app/teams/[id]/stock-in/_components/StockInPageClient";
import { createStockInAction } from "@/app/teams/[id]/stock-in/_actions/createStockTransaction";
import { fetchApiResult } from "@/lib/api-client";

const toastSpy = vi.fn();
const createItemModalSpy = vi.fn();
const pushSpy = vi.fn();
const localStorageStore = new Map<string, string>();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushSpy,
  }),
}));

vi.mock("@/app/teams/[id]/stock-in/_actions/createStockTransaction", () => ({
  createStockInAction: vi.fn(),
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
  BarcodeScannerModal: ({
    onScan,
  }: {
    onScan: (barcode: string) => void;
  }) => (
    <button type="button" onClick={() => onScan("78912345678")}>
      Mock scan not found
    </button>
  ),
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

vi.mock("@/app/teams/[id]/stock-in/_components/CreateItemInlineModal", () => ({
  CreateItemInlineModal: ({
    isOpen,
    initialValues,
    onSuccess,
  }: {
    isOpen: boolean;
    initialValues: { name?: string; barcode?: string };
    onSuccess: (item: any) => void;
  }) => {
    createItemModalSpy({ isOpen, initialValues });

    if (!isOpen) {
      return null;
    }

    return (
      <div>
        <div>Modal name: {initialValues.name || "-"}</div>
        <div>Modal barcode: {initialValues.barcode || "-"}</div>
        <button
          type="button"
          onClick={() =>
            onSuccess({
              id: 99,
              name: initialValues.name || "Item via modal",
              sku: "NEW-99",
              barcode: initialValues.barcode || "99999999",
              currentStock: 0,
              locationName: null,
            })
          }
        >
          Confirm create item
        </button>
      </div>
    );
  },
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
      stockIn: {
        title: "Stock In",
        subtitle: "Stock in subtitle",
        locationRequired: "Location*",
        defaultLocation: "Default location",
        items: "Items",
        searchItem: "Search item",
        scanBarcode: "Scan barcode",
        item: "ITEM",
        currentStock: "CURRENT STOCK",
        currentStockLabel: "Current Stock",
        quantityToAdd: "QUANTITY",
        notes: "Notes",
        notesPlaceholder: "Notes...",
        totalItemsToAdd: "Total",
        addStock: "Add stock",
        noItemsSelected: "No items selected",
        selectLocationFirst: "Select location first",
        quantityRequired: "Quantity required",
        partialAddError: "Some items could not be added. Try again.",
        addError: "Add error",
        stockAddedSuccess: "Added",
        itemFound: "Item found",
        itemNotFound: "Item not found",
        itemAddedToList: "added",
        noItemWithBarcode: "No item found with barcode:",
        createMissingItemHint: "Create it and continue",
        noSearchResultsCreate: "Item not in catalog",
        noSearchResultsCreateHint: "Create it without leaving stock in",
        createItemCta: "Create item",
        createItemSuccessAndAdded: "Created and added",
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

const mockedCreateStockInAction = vi.mocked(createStockInAction);
const mockedFetchApiResult = vi.mocked(fetchApiResult);

const baseTeam = {
  id: 1,
  name: "Team A",
  notes: null,
  userId: 1,
  companyId: null,
  companyName: null,
  labelCompanyInfo: null,
  labelLogoUrl: null,
  stripeCustomerId: null,
  stripeSubscriptionId: null,
  stripeSubscriptionStatus: null,
  stripePriceId: null,
  stripeCurrentPeriodEnd: null,
  manualTrialEndsAt: null,
  itemCustomFieldSchema: [],
  itemCount: 0,
  transactionCount: 0,
  memberCount: 1,
  createdAt: "",
  updatedAt: "",
} as any;

describe("StockInPageClient", () => {
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
    mockedCreateStockInAction.mockResolvedValue({ success: true } as any);
    mockedFetchApiResult.mockResolvedValue({ ok: true } as any);
  });

  it("shows create-item CTA when search has no results", () => {
    render(
      <StockInPageClient
        team={baseTeam}
        locations={[{ id: 10, name: "Main" }]}
        items={[{ id: 1, name: "Printer", sku: "PR-1", barcode: "12345678", currentStock: 5, locationName: "Main" }]}
      />
    );

    fireEvent.change(screen.getByPlaceholderText("Search item"), {
      target: { value: "New cable" },
    });

    expect(screen.getByText("Item not in catalog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create item" })).toBeInTheDocument();
  });

  it("opens modal with name prefilled from text search and adds created item to the list", () => {
    render(
      <StockInPageClient
        team={baseTeam}
        locations={[{ id: 10, name: "Main" }]}
        items={[]}
      />
    );

    fireEvent.change(screen.getByPlaceholderText("Search item"), {
      target: { value: "New cable" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create item" }));

    expect(screen.getByText("Modal name: New cable")).toBeInTheDocument();
    expect(screen.getByText("Modal barcode: -")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Confirm create item" }));

    expect(screen.getByText("New cable")).toBeInTheDocument();
    expect(screen.getByDisplayValue("1")).toBeInTheDocument();
    expect(toastSpy).toHaveBeenCalledWith(
      expect.objectContaining({ description: "Created and added" })
    );
  });

  it("reuses the CTA for scanner not found and prefills barcode without filling the name", () => {
    render(
      <StockInPageClient
        team={baseTeam}
        locations={[{ id: 10, name: "Main" }]}
        items={[]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Mock scan not found" }));

    expect(screen.getByDisplayValue("78912345678")).toBeInTheDocument();
    expect(screen.getByText("Item not in catalog")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Create item" }));

    expect(screen.getByText("Modal name: -")).toBeInTheDocument();
    expect(screen.getByText("Modal barcode: 78912345678")).toBeInTheDocument();
  });

  it("shows the specific backend error instead of the generic partial error", async () => {
    mockedCreateStockInAction.mockResolvedValue({
      success: false,
      errorCode: ERROR_CODES.VALIDATION_ERROR,
      error: "Location is required",
    } as any);

    render(
      <StockInPageClient
        team={baseTeam}
        locations={[{ id: 10, name: "Main" }]}
        items={[{ id: 1, name: "Printer", sku: "PR-1", barcode: "12345678", currentStock: 5, locationName: "Main" }]}
      />
    );

    fireEvent.change(screen.getByPlaceholderText("Search item"), {
      target: { value: "Printer" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Printer/ }));
    fireEvent.click(screen.getByRole("button", { name: "Add stock" }));

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          description: "Location is required",
        })
      );
    });
  });

  it("logs out automatically when the server returns user not authenticated", async () => {
    mockedCreateStockInAction.mockResolvedValue({
      success: false,
      errorCode: ERROR_CODES.USER_NOT_AUTHENTICATED,
      error: "User not authenticated",
    } as any);

    render(
      <StockInPageClient
        team={baseTeam}
        locations={[{ id: 10, name: "Main" }]}
        items={[{ id: 1, name: "Printer", sku: "PR-1", barcode: "12345678", currentStock: 5, locationName: "Main" }]}
      />
    );

    fireEvent.change(screen.getByPlaceholderText("Search item"), {
      target: { value: "Printer" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Printer/ }));
    fireEvent.click(screen.getByRole("button", { name: "Add stock" }));

    await waitFor(() => {
      expect(mockedFetchApiResult).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" });
      expect(window.localStorage.getItem("userId")).toBeNull();
      expect(window.localStorage.getItem("userRole")).toBeNull();
      expect(pushSpy).toHaveBeenCalledWith("/");
    });
  });

  it("restores an unsaved draft from localStorage and clears it after success", async () => {
    window.localStorage.setItem(
      "inventory-draft:stock-in:1",
      JSON.stringify({
        selectedLocation: "10",
        selectedItems: [
          {
            item: {
              id: 1,
              name: "Printer",
              sku: "PR-1",
              barcode: "12345678",
              currentStock: 5,
              locationName: "Main",
            },
            quantity: 3,
          },
        ],
        notes: "draft note",
      })
    );

    render(
      <StockInPageClient
        team={baseTeam}
        locations={[{ id: 10, name: "Main" }]}
        items={[
          {
            id: 1,
            name: "Printer",
            sku: "PR-1",
            barcode: "12345678",
            currentStock: 5,
            locationName: "Main",
          },
        ]}
      />
    );

    expect(screen.getByText("Printer")).toBeInTheDocument();
    expect(screen.getByDisplayValue("3")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Notes...")).toHaveValue("draft note");

    fireEvent.click(screen.getByRole("button", { name: "Add stock" }));

    await waitFor(() => {
      expect(mockedCreateStockInAction).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          itemId: 1,
          quantity: 3,
          locationId: 10,
          notes: "draft note",
        })
      );
      expect(window.localStorage.getItem("inventory-draft:stock-in:1")).toBeNull();
    });
  });

  it("keeps a draft that only changed the selected location", async () => {
    window.localStorage.setItem(
      "inventory-draft:stock-in:1",
      JSON.stringify({
        selectedLocation: "11",
        selectedItems: [],
        notes: "",
      })
    );

    render(
      <StockInPageClient
        team={baseTeam}
        locations={[{ id: 10, name: "Main" }, { id: 11, name: "Overflow" }]}
        items={[]}
      />
    );

    await waitFor(() => {
      expect(window.localStorage.getItem("inventory-draft:stock-in:1")).not.toBeNull();
    });
  });

  it("ignores draft items that are no longer available", () => {
    window.localStorage.setItem(
      "inventory-draft:stock-in:1",
      JSON.stringify({
        selectedLocation: "10",
        selectedItems: [
          {
            item: {
              id: 999,
              name: "Ghost printer",
              sku: "GH-1",
              barcode: "99999999",
              currentStock: 5,
              locationName: "Old",
            },
            quantity: 3,
          },
        ],
        notes: "draft note",
      })
    );

    render(
      <StockInPageClient
        team={baseTeam}
        locations={[{ id: 10, name: "Main" }]}
        items={[]}
      />
    );

    expect(screen.queryByText("Ghost printer")).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText("Notes...")).toHaveValue("draft note");
  });
});
