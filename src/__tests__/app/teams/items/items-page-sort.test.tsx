// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { ItemsPageClient } from "@/app/teams/[id]/items/_components/ItemsPageClient";
import type { Item, Team } from "@/app/teams/[id]/items/_types";
import type { ItemSortKey } from "@/app/teams/[id]/items/_utils/sortItems";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/components/shared/TeamLayout", () => ({
  TeamLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/TutorialTour", () => ({
  TutorialTour: () => null,
}));

vi.mock("@/components/ui/use-toast-simple", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/app/teams/[id]/items/_components/ItemsCsvImportPanel", () => ({
  ItemsCsvImportPanel: () => null,
}));

vi.mock("@/app/teams/[id]/items/_components/ItemsList", () => ({
  ItemsList: ({
    items,
    onSort,
  }: {
    items: Item[];
    onSort?: (key: ItemSortKey) => void;
  }) => (
    <div>
      <button type="button" onClick={() => onSort?.("name")}>
        Ordenar nome
      </button>
      <ul>
        {items.map((item) => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    </div>
  ),
}));

vi.mock("@/lib/i18n", () => ({
  useTranslation: () => ({
    language: "pt-BR",
    t: {
      common: {
        tutorial: "Tutorial",
        close: "Fechar",
        loading: "Carregando...",
        back: "Voltar",
        name: "Nome",
      },
      items: {
        title: "Itens",
        subtitle: "Gerencie os itens do seu inventário",
        searchPlaceholder: "Buscar itens...",
        addItem: "Adicionar Item",
        addItemShort: "Adicionar",
        exportCsv: "Exportar CSV",
        exportCsvShort: "Exportar",
        allCategories: "Todas as Categorias",
        categories: "Categorias",
        noItems: "Nenhum item encontrado",
        noItemsMessage: "Comece adicionando seu primeiro item",
        addFirstItem: "Adicionar Seu Primeiro Item",
        page: "Página",
        of: "de",
        next: "Próximo",
        sku: "SKU",
        type: "TIPO",
        stock: "ESTOQUE",
        price: "PREÇO",
        csvHeaderBarcode: "Código de barras",
        csvHeaderLocation: "Localização",
        exportNoItems: "Nenhum item para exportar",
        exportSuccess: "CSV exportado com sucesso",
        tourSearchTitle: "Busca",
        tourSearchDesc: "Busca",
        tourTutorialTitle: "Tutorial",
        tourTutorialDesc: "Tutorial",
        tourCategoriesTitle: "Categorias",
        tourCategoriesDesc: "Categorias",
        tourExportTitle: "Exportar",
        tourExportDesc: "Exportar",
        tourAddItemTitle: "Adicionar",
        tourAddItemDesc: "Adicionar",
        tourSidebarTitle: "Menu",
        tourSidebarDesc: "Menu",
        tourListTitle: "Lista",
        tourListDesc: "Lista",
      },
    },
  }),
}));

const NAMES = [
  "Lima",
  "Alpha",
  "Kilo",
  "Bravo",
  "Juliet",
  "Charlie",
  "India",
  "Delta",
  "Hotel",
  "Echo",
  "Golf",
  "Foxtrot",
];

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 1,
    name: "Item 1",
    sku: "SKU-1",
    barcode: "1000000000001",
    itemType: "Áudio",
    currentStock: 1,
    minimumStock: null,
    price: 10,
    locationName: "Gaveta",
    customFields: null,
    photoData: null,
    ...overrides,
  };
}

function makeTeam(): Team {
  return {
    id: 1,
    name: "Time teste",
    itemCount: NAMES.length,
    transactionCount: 0,
    itemCustomFieldSchema: null,
  };
}

const buildItems = () =>
  NAMES.map((name, index) =>
    makeItem({
      id: index + 1,
      name,
      sku: `SKU-${index + 1}`,
      barcode: `${1000000000000 + index + 1}`,
    })
  );

describe("ItemsPageClient sort", () => {
  it("sorts the full filtered list before paginating", () => {
    render(<ItemsPageClient items={buildItems()} team={makeTeam()} />);

    fireEvent.click(screen.getByRole("button", { name: "Ordenar nome" }));

    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Juliet")).toBeInTheDocument();
    expect(screen.queryByText("Kilo")).not.toBeInTheDocument();
    expect(screen.queryByText("Lima")).not.toBeInTheDocument();
    expect(screen.getByText("Página 1 de 2")).toBeInTheDocument();
  });

  it("toggles to descending and stays on page 1", () => {
    render(<ItemsPageClient items={buildItems()} team={makeTeam()} />);

    fireEvent.click(screen.getByRole("button", { name: "Ordenar nome" }));
    fireEvent.click(screen.getByRole("button", { name: "Próximo" }));
    fireEvent.click(screen.getByRole("button", { name: "Ordenar nome" }));

    expect(screen.getByText("Lima")).toBeInTheDocument();
    expect(screen.getByText("Charlie")).toBeInTheDocument();
    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
    expect(screen.queryByText("Bravo")).not.toBeInTheDocument();
    expect(screen.getByText("Página 1 de 2")).toBeInTheDocument();
  });
});
