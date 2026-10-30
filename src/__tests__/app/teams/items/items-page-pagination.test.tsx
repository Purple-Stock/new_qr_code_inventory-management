// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { ItemsPageClient } from "@/app/teams/[id]/items/_components/ItemsPageClient";
import type { Item, Team } from "@/app/teams/[id]/items/_types";

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
  ItemsList: ({ items }: { items: Item[] }) => (
    <ul>
      {items.map((item) => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
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
    locationId: 1,
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
    itemCount: 25,
    transactionCount: 0,
    itemCustomFieldSchema: null,
  };
}

const buildItems = (count: number) =>
  Array.from({ length: count }, (_, index) =>
    makeItem({
      id: index + 1,
      name: `Item ${index + 1}`,
      sku: `SKU-${index + 1}`,
      barcode: `${1000000000000 + index + 1}`,
    })
  );

describe("ItemsPageClient pagination", () => {
  it("does not render the unused all-categories filter", () => {
    render(<ItemsPageClient items={buildItems(8)} team={makeTeam()} />);

    expect(screen.queryByText("Todas as Categorias")).not.toBeInTheDocument();
    expect(screen.queryByText("Categorias")).not.toBeInTheDocument();
  });

  it("shows 10 items on the first page and the pager", () => {
    render(<ItemsPageClient items={buildItems(25)} team={makeTeam()} />);

    expect(screen.getByText("Item 1")).toBeInTheDocument();
    expect(screen.getByText("Item 10")).toBeInTheDocument();
    expect(screen.queryByText("Item 11")).not.toBeInTheDocument();
    expect(screen.getByText("Página 1 de 3")).toBeInTheDocument();
  });

  it("shows the next 10 items after clicking next", () => {
    render(<ItemsPageClient items={buildItems(25)} team={makeTeam()} />);

    fireEvent.click(screen.getByRole("button", { name: "Próximo" }));

    expect(screen.queryByText("Item 1")).not.toBeInTheDocument();
    expect(screen.getByText("Item 11")).toBeInTheDocument();
    expect(screen.getByText("Item 20")).toBeInTheDocument();
    expect(screen.queryByText("Item 21")).not.toBeInTheDocument();
    expect(screen.getByText("Página 2 de 3")).toBeInTheDocument();
  });

  it("hides the pager when there are 10 items or fewer", () => {
    render(<ItemsPageClient items={buildItems(8)} team={makeTeam()} />);

    expect(screen.getByText("Item 1")).toBeInTheDocument();
    expect(screen.getByText("Item 8")).toBeInTheDocument();
    expect(screen.queryByText(/Página/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Próximo" })
    ).not.toBeInTheDocument();
  });
});
