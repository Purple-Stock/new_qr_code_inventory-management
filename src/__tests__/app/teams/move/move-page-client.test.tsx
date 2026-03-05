// @vitest-environment jsdom

import { describe, it, expect, beforeEach, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MovePageClient } from "@/app/teams/[id]/move/_components/MovePageClient";
import { createMoveAction } from "@/app/teams/[id]/move/_actions/createStockTransaction";

const toastSpy = vi.fn();

vi.mock("@/app/teams/[id]/move/_actions/createStockTransaction", () => ({
  createMoveAction: vi.fn(),
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
        quantityRequired: "Quantity required",
        quantityExceedsStock: "Quantity exceeds stock",
        partialMoveError: "Partial move error",
        partialTeamTransferError: "Partial team transfer",
        stockMovedSuccess: "Moved",
        stockTransferredTeamSuccess: "Transferred",
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

describe("MovePageClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
