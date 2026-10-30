// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import StockByLocationPageClient from "@/app/teams/[id]/stock-by-location/_components/StockByLocationPageClient";

vi.mock("@/components/shared/TeamLayout", () => ({
  TeamLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/TutorialTour", () => ({
  TutorialTour: () => null,
}));

vi.mock("@/lib/i18n", () => ({
  useTranslation: () => ({
    language: "pt-BR",
    t: {
      common: {
        tutorial: "Tutorial",
        page: "Página",
        of: "de",
        next: "Próximo",
        back: "Voltar",
        sortAscending: "crescente",
        sortDescending: "decrescente",
      },
      stockByLocation: {
        title: "Estoque por Localização",
        subtitle: "Inventário",
        searchPlaceholder: "Buscar",
        item: "ITEM",
        sku: "SKU",
        stock: "ESTOQUE",
        price: "PREÇO",
        totalItems: "Total de Itens",
        totalStock: "Estoque Total",
        noItems: "Nenhum item",
        noLocations: "Nenhuma",
        noItemsSearch: "Nenhum",
        defaultLocation: "Padrão",
        loading: "Carregando",
        tourTutorialTitle: "T",
        tourTutorialDesc: "T",
        tourSearchTitle: "T",
        tourSearchDesc: "T",
        tourListTitle: "T",
        tourListDesc: "T",
        tourSidebarTitle: "T",
        tourSidebarDesc: "T",
      },
      items: {
        unnamedItem: "Sem nome",
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

describe("StockByLocationPageClient sort", () => {
  it("sorts items inside a location before paginating", () => {
    render(
      <StockByLocationPageClient
        initialTeam={{ id: 1, name: "Time" }}
        initialLocations={[{ id: 10, name: "Depósito" }]}
        initialItems={NAMES.map((name, index) => ({
          id: index + 1,
          name,
          sku: `S-${index + 1}`,
          barcode: `${index + 1}`,
          currentStock: 1,
          price: 1,
          locationId: 10,
          locationName: "Depósito",
        }))}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "ITEM crescente" }));

    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Juliet")).toBeInTheDocument();
    expect(screen.queryByText("Kilo")).not.toBeInTheDocument();
    expect(screen.getByText("Página 1 de 2")).toBeInTheDocument();
  });

  it("renders the same SKU once per location that still has a ledger balance", () => {
    render(
      <StockByLocationPageClient
        initialTeam={{ id: 1, name: "Galpão" }}
        initialLocations={[
          { id: 1, name: "Local 1" },
          { id: 3, name: "Local2" },
        ]}
        initialItems={[
          {
            id: 1,
            name: "Cadeira Azul",
            sku: "CADEIRA-AZUL",
            barcode: "5817915565817",
            currentStock: 12,
            price: null,
            locationId: 1,
            locationName: "Local 1",
          },
          {
            id: 1,
            name: "Cadeira Azul",
            sku: "CADEIRA-AZUL",
            barcode: "5817915565817",
            currentStock: 8,
            price: null,
            locationId: 3,
            locationName: "Local2",
          },
        ]}
      />
    );

    expect(screen.getAllByText("Cadeira Azul")).toHaveLength(2);
    expect(screen.getByText("12.0")).toBeInTheDocument();
    expect(screen.getByText("8.0")).toBeInTheDocument();
  });
});
