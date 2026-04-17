// @vitest-environment jsdom

import { describe, it, expect, beforeEach, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { ERROR_CODES } from "@/lib/errors";
import { StockOutPageClient } from "@/app/teams/[id]/stock-out/_components/StockOutPageClient";
import { createStockOutAction } from "@/app/teams/[id]/stock-out/_actions/createStockTransaction";
import { fetchApiResult } from "@/lib/api-client";

const toastSpy = vi.fn();
const pushSpy = vi.fn();
const localStorageStore = new Map<string, string>();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushSpy,
  }),
}));

vi.mock("@/app/teams/[id]/stock-out/_actions/createStockTransaction", () => ({
  createStockOutAction: vi.fn(),
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
        clearFilter: "Limpar filtros",
        actions: "Ações",
        error: "Erro",
        success: "Sucesso",
        loading: "Loading",
      },
      items: {
        sku: "SKU",
        unnamedItem: "Sem nome",
      },
      stockOut: {
        title: "Saída de Estoque",
        subtitle: "subtitle",
        locationRequired: "Localização*",
        defaultLocation: "Default location",
        items: "Itens",
        searchItem: "Buscar um item",
        scanBarcode: "Scan",
        item: "ITEM",
        currentStock: "Estoque Atual",
        currentStockLabel: "Estoque Atual",
        quantityToRemove: "QUANTIDADE A REMOVER*",
        notes: "Notas",
        notesPlaceholder: "Digite uma nota.",
        totalItemsToRemove: "Total de Itens a Remover",
        removeStock: "Remover Estoque",
        noItemsSelected: "Nenhum item selecionado",
        selectLocationFirst: "Selecione uma localização",
        quantityRequired: "Quantidade obrigatória",
        quantityExceedsStock: "Quantidade excede estoque",
        stockRemovedSuccess: "Estoque removido com sucesso",
        partialRemoveError: "Alguns itens não puderam ser removidos. Tente novamente.",
        removeError: "Ocorreu um erro ao remover estoque",
        itemFound: "Item encontrado",
        itemNotFound: "Item não encontrado",
        itemAddedToList: "adicionado",
        noItemWithBarcode: "Sem item com barcode",
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

const mockedCreateStockOutAction = vi.mocked(createStockOutAction);
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

describe("StockOutPageClient", () => {
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
    mockedCreateStockOutAction.mockResolvedValue({ success: true } as any);
    mockedFetchApiResult.mockResolvedValue({ ok: true } as any);
  });

  async function addSelectedItem() {
    render(
      <StockOutPageClient team={baseTeam} locations={baseLocations as any} items={baseItems} />
    );

    fireEvent.change(screen.getByPlaceholderText("Buscar um item"), {
      target: { value: "CAP" },
    });

    fireEvent.click(screen.getByRole("button", { name: /CAP CALABRESA/i }));

    await screen.findByDisplayValue("1");
  }

  it("shows the specific backend error instead of the generic partial error", async () => {
    mockedCreateStockOutAction.mockResolvedValue({
      success: false,
      errorCode: ERROR_CODES.VALIDATION_ERROR,
      error: "Insufficient stock for stock out",
    } as any);

    await addSelectedItem();

    fireEvent.click(screen.getByRole("button", { name: "Remover Estoque" }));

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          description: "Insufficient stock for stock out",
        })
      );
    });
  });

  it("logs out automatically when the server returns user not authenticated", async () => {
    mockedCreateStockOutAction.mockResolvedValue({
      success: false,
      errorCode: ERROR_CODES.USER_NOT_AUTHENTICATED,
      error: "User not authenticated",
    } as any);

    await addSelectedItem();

    fireEvent.click(screen.getByRole("button", { name: "Remover Estoque" }));

    await waitFor(() => {
      expect(mockedFetchApiResult).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" });
      expect(window.localStorage.getItem("userId")).toBeNull();
      expect(window.localStorage.getItem("userRole")).toBeNull();
      expect(pushSpy).toHaveBeenCalledWith("/");
    });
  });

  it("submits decimal stock out quantities without truncating them", async () => {
    await addSelectedItem();

    fireEvent.change(screen.getByRole("spinbutton"), {
      target: { value: "0.5" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Remover Estoque" }));

    await waitFor(() => {
      expect(mockedCreateStockOutAction).toHaveBeenCalledWith(
        29,
        expect.objectContaining({
          itemId: 1,
          quantity: 0.5,
        })
      );
    });
  });
});
