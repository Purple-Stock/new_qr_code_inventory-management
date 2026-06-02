// @vitest-environment jsdom

import { describe, it, expect, beforeEach, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { ERROR_CODES } from "@/lib/errors";
import { MovePageClient } from "@/app/teams/[id]/move/_components/MovePageClient";
import { createMoveAction } from "@/app/teams/[id]/move/_actions/createStockTransaction";
import { fetchApiJsonResult, fetchApiResult } from "@/lib/api-client";

const toastSpy = vi.fn();
const refreshSpy = vi.fn();
const pushSpy = vi.fn();
const localStorageStore = new Map<string, string>();

vi.mock("@/app/teams/[id]/move/_actions/createStockTransaction", () => ({
  createMoveAction: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: refreshSpy,
    push: pushSpy,
  }),
}));

vi.mock("@/lib/api-client", () => ({
  fetchApiJsonResult: vi.fn(),
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

vi.mock("@/components/TutorialTour", () => ({
  TutorialTour: () => null,
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
  SelectItem: ({ children, value }: { children: ReactNode; value: string }) => (
    <button type="button" data-value={value}>
      {children}
    </button>
  ),
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
      move: {
        title: "Move",
        subtitle: "Move subtitle",
        sourceLocationRequired: "Source Location*",
        destinationLocationRequired: "Destination Location*",
        destinationTeamRequired: "Destination Team*",
        destinationTeamPlaceholder: "Select team",
        tabByLocation: "Between locations",
        tabByTeam: "Between teams",
        defaultLocation: "Default",
        items: "Items",
        searchItem: "Search",
        scanBarcode: "Scan",
        item: "ITEM",
        currentStock: "CURRENT STOCK",
        quantityToMove: "QUANTITY",
        notes: "Notes",
        notesPlaceholder: "Notes...",
        moveStock: "Move Stock",
        transferBetweenTeams: "Transfer Between Teams",
        noItemsSelected: "No items",
        selectSourceLocationFirst: "Select source",
        selectLocationsFirst: "Select locations",
        selectDestinationTeamFirst: "Select destination team",
        noActiveDestinationTeams: "No destination teams with active subscription available for transfer",
        manageTeamsCta: "Activate team for transfer",
        syncBillingCta: "Sync subscription",
        syncBillingInProgress: "Syncing...",
        syncBillingSuccess: "Subscription status synced successfully",
        syncBillingError: "Could not sync subscription status",
        quantityRequired: "Quantity required",
        quantityExceedsStock: "Quantity exceeds stock",
        partialMoveError: "Partial move error",
        partialTeamTransferError: "Partial team transfer",
        stockMovedSuccess: "Moved",
        stockTransferredTeamSuccess: "Transferred",
        reviewTransferImpact: "Review impact",
        confirmTeamTransferLabel: "I confirm this transfer with the details above",
        confirmTeamTransferRequired: "Confirm inter-team transfer before submitting",
        transferSummaryToTeamPrefix: "to team",
        moveError: "Move error",
        teamTransferError: "Team transfer error",
        itemFound: "Item found",
        itemNotFound: "Item not found",
        noItemWithBarcode: "No item",
        itemAddedToList: "added",
        currentStockLabel: "Current",
        totalItemsToMove: "Total",
        sameLocationError: "Same location",
        tourTutorialTitle: "",
        tourTutorialDesc: "",
        tourLocationsTitle: "",
        tourLocationsDesc: "",
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

const mockedCreateMoveAction = vi.mocked(createMoveAction);
const mockedFetchApiJsonResult = vi.mocked(fetchApiJsonResult);
const mockedFetchApiResult = vi.mocked(fetchApiResult);

describe("MovePageClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "confirm").mockReturnValue(true);
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
    mockedFetchApiJsonResult.mockResolvedValue({
      ok: true,
      data: { synced: true, subscriptionStatus: "active" },
    } as any);
    mockedFetchApiResult.mockResolvedValue({ ok: true } as any);
  });

  it("renders both tabs", () => {
    render(
      <MovePageClient
        team={{ id: 1, name: "Direct" }}
        locations={[{ id: 10, name: "A" }, { id: 11, name: "B" }]}
        destinationTeams={[{ id: 2, name: "DPS" }]}
        items={[]}
      />
    );

    expect(screen.getByRole("button", { name: "Between locations" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Between teams" })).toBeInTheDocument();
  });

  it("submits inter-team transfer payload from team tab", async () => {
    mockedCreateMoveAction.mockResolvedValue({ success: true, transaction: { id: 99 } } as any);

    render(
      <MovePageClient
        team={{ id: 1, name: "Direct" }}
        locations={[{ id: 10, name: "A" }, { id: 11, name: "B" }]}
        destinationTeams={[{ id: 2, name: "DPS" }]}
        items={[{ id: 100, name: "Printer", sku: "PR-1", barcode: "ABC", currentStock: 5, locationName: "A" }]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Between teams" }));
    fireEvent.change(screen.getByPlaceholderText("Search"), { target: { value: "Printer" } });
    fireEvent.click(screen.getByRole("button", { name: /Printer/ }));

    fireEvent.click(screen.getByRole("button", { name: "Transfer Between Teams" }));

    await waitFor(() => {
      expect(mockedCreateMoveAction).toHaveBeenCalled();
    });

    const firstCall = mockedCreateMoveAction.mock.calls[0]?.[1];
    expect(firstCall).toMatchObject({
      itemId: 100,
      destinationKind: "team",
    });
    expect(typeof firstCall.transferGroupId).toBe("string");
  });

  it("shows empty state when there are no active destination teams", () => {
    render(
      <MovePageClient
        team={{ id: 1, name: "Direct" }}
        locations={[{ id: 10, name: "A" }]}
        destinationTeams={[]}
        items={[]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Between teams" }));

    expect(
      screen.getByText("No destination teams with active subscription available for transfer")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sync subscription" })).toBeInTheDocument();
  });

  it("syncs billing status and refreshes page when destination teams are unavailable", async () => {
    render(
      <MovePageClient
        team={{ id: 1, name: "Direct" }}
        locations={[{ id: 10, name: "A" }]}
        destinationTeams={[]}
        items={[]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Between teams" }));
    fireEvent.click(screen.getByRole("button", { name: "Sync subscription" }));

    await waitFor(() => {
      expect(mockedFetchApiJsonResult).toHaveBeenCalledWith("/api/teams/1/billing/sync", {
        method: "POST",
        fallbackError: "Could not sync subscription status",
      });
      expect(refreshSpy).toHaveBeenCalledTimes(1);
    });
  });

  it("prevents duplicate submit while request is in progress", async () => {
    let resolveRequest: ((value: any) => void) | undefined;
    mockedCreateMoveAction.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        }) as any
    );

    render(
      <MovePageClient
        team={{ id: 1, name: "Direct" }}
        locations={[{ id: 10, name: "A" }, { id: 11, name: "B" }]}
        destinationTeams={[{ id: 2, name: "DPS" }]}
        items={[{ id: 100, name: "Printer", sku: "PR-1", barcode: "ABC", currentStock: 5, locationName: "A" }]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Between teams" }));
    fireEvent.change(screen.getByPlaceholderText("Search"), { target: { value: "Printer" } });
    fireEvent.click(screen.getByRole("button", { name: /Printer/ }));

    const submitButton = screen.getByRole("button", { name: "Transfer Between Teams" });
    fireEvent.click(submitButton);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockedCreateMoveAction).toHaveBeenCalledTimes(1);
    });

    resolveRequest?.({ success: true, transaction: { id: 99 } });
  });

  it("shows the specific backend error instead of the generic partial error", async () => {
    mockedCreateMoveAction.mockResolvedValue({
      success: false,
      errorCode: ERROR_CODES.VALIDATION_ERROR,
      error: "Destination location is required",
    } as any);

    render(
      <MovePageClient
        team={{ id: 1, name: "Direct" }}
        locations={[{ id: 10, name: "A" }, { id: 11, name: "B" }]}
        destinationTeams={[{ id: 2, name: "DPS" }]}
        items={[{ id: 100, name: "Printer", sku: "PR-1", barcode: "ABC", currentStock: 5, locationName: "A" }]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Between teams" }));
    fireEvent.change(screen.getByPlaceholderText("Search"), { target: { value: "Printer" } });
    fireEvent.click(screen.getByRole("button", { name: /Printer/ }));
    fireEvent.click(screen.getByRole("button", { name: "Transfer Between Teams" }));

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          description: "Destination location is required",
        })
      );
    });
  });

  it("logs out automatically when the server returns user not authenticated", async () => {
    mockedCreateMoveAction.mockResolvedValue({
      success: false,
      errorCode: ERROR_CODES.USER_NOT_AUTHENTICATED,
      error: "User not authenticated",
    } as any);

    render(
      <MovePageClient
        team={{ id: 1, name: "Direct" }}
        locations={[{ id: 10, name: "A" }, { id: 11, name: "B" }]}
        destinationTeams={[{ id: 2, name: "DPS" }]}
        items={[{ id: 100, name: "Printer", sku: "PR-1", barcode: "ABC", currentStock: 5, locationName: "A" }]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Between teams" }));
    fireEvent.change(screen.getByPlaceholderText("Search"), { target: { value: "Printer" } });
    fireEvent.click(screen.getByRole("button", { name: /Printer/ }));
    fireEvent.click(screen.getByRole("button", { name: "Transfer Between Teams" }));

    await waitFor(() => {
      expect(mockedFetchApiResult).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" });
      expect(window.localStorage.getItem("userId")).toBeNull();
      expect(window.localStorage.getItem("userRole")).toBeNull();
      expect(pushSpy).toHaveBeenCalledWith("/");
    });
  });

  it("submits decimal move quantities without truncating them", async () => {
    mockedCreateMoveAction.mockResolvedValue({ success: true, transaction: { id: 99 } } as any);

    render(
      <MovePageClient
        team={{ id: 1, name: "Direct" }}
        locations={[{ id: 10, name: "A" }, { id: 11, name: "B" }]}
        destinationTeams={[{ id: 2, name: "DPS" }]}
        items={[{ id: 100, name: "Printer", sku: "PR-1", barcode: "ABC", currentStock: 5, locationName: "A" }]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Between teams" }));
    fireEvent.change(screen.getByPlaceholderText("Search"), { target: { value: "Printer" } });
    fireEvent.click(screen.getByRole("button", { name: /Printer/ }));
    fireEvent.change(screen.getByRole("spinbutton"), {
      target: { value: "0.5" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Transfer Between Teams" }));

    await waitFor(() => {
      expect(mockedCreateMoveAction).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          itemId: 100,
          quantity: 0.5,
        })
      );
    });
  });

  it("restores an unsaved draft from localStorage and clears it after success", async () => {
    mockedCreateMoveAction.mockResolvedValue({ success: true, transaction: { id: 99 } } as any);

    window.localStorage.setItem(
      "inventory-draft:move:1",
      JSON.stringify({
        activeTab: "team",
        sourceLocation: "10",
        destinationLocation: "",
        destinationTeamId: "2",
        selectedItems: [
          {
            item: {
              id: 100,
              name: "Printer",
              sku: "PR-1",
              barcode: "ABC",
              currentStock: 5,
              locationName: "A",
            },
            quantity: 2,
          },
        ],
        notes: "draft move",
      })
    );

    render(
      <MovePageClient
        team={{ id: 1, name: "Direct" }}
        locations={[{ id: 10, name: "A" }, { id: 11, name: "B" }]}
        destinationTeams={[{ id: 2, name: "DPS" }]}
        items={[
          {
            id: 100,
            name: "Printer",
            sku: "PR-1",
            barcode: "ABC",
            currentStock: 5,
            locationName: "A",
          },
        ]}
      />
    );

    expect(screen.getByText("Printer")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Notes...")).toHaveValue("draft move");

    fireEvent.click(screen.getByRole("button", { name: "Transfer Between Teams" }));

    await waitFor(() => {
      expect(mockedCreateMoveAction).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          itemId: 100,
          quantity: 2,
          sourceLocationId: 10,
          destinationKind: "team",
          destinationTeamId: 2,
          notes: "draft move",
        })
      );
      expect(window.localStorage.getItem("inventory-draft:move:1")).toBeNull();
    });
  });

  it("validates restored move drafts against current stock instead of stale saved stock", async () => {
    mockedCreateMoveAction.mockResolvedValue({ success: true, transaction: { id: 99 } } as any);

    window.localStorage.setItem(
      "inventory-draft:move:1",
      JSON.stringify({
        activeTab: "team",
        sourceLocation: "10",
        destinationLocation: "",
        destinationTeamId: "2",
        selectedItems: [
          {
            item: {
              id: 100,
              name: "Printer",
              sku: "PR-1",
              barcode: "ABC",
              currentStock: 99,
              locationName: "A",
            },
            quantity: 15,
          },
        ],
        notes: "draft move",
      })
    );

    render(
      <MovePageClient
        team={{ id: 1, name: "Direct" }}
        locations={[{ id: 10, name: "A" }, { id: 11, name: "B" }]}
        destinationTeams={[{ id: 2, name: "DPS" }]}
        items={[
          {
            id: 100,
            name: "Printer",
            sku: "PR-1",
            barcode: "ABC",
            currentStock: 10,
            locationName: "A",
          },
        ]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Transfer Between Teams" }));

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          description: "Quantity exceeds stock",
        })
      );
    });
    expect(mockedCreateMoveAction).not.toHaveBeenCalled();
  });
});
