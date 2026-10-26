// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import ReportsPageClient from "@/app/teams/[id]/reports/_components/ReportsPageClient";
import type { ReportStats } from "@/app/teams/[id]/reports/_types";

vi.mock("@/lib/api-client", () => ({
  fetchApiResult: vi.fn(async () => ({ ok: false, error: { error: "skip" } })),
}));

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
      reports: {
        title: "Relatórios",
        subtitle: "Análises",
        overview: "Visão",
        totalItems: "Total de Itens",
        totalLocations: "Total de Localizações",
        totalTransactions: "Total de Transações",
        totalStockValue: "Valor Total",
        lowStockItems: "Estoque baixo",
        outOfStockItems: "Sem estoque",
        transactionsByType: "Por tipo",
        recentTransactions: "Transações Recentes",
        topItemsByValue: "Top Itens por Valor",
        stockByLocation: "Estoque por Localização",
        location: "Localização",
        itemCount: "Quantidade de Itens",
        totalStock: "Estoque Total",
        totalValue: "Valor Total",
        item: "Item",
        sku: "SKU",
        currentStock: "Estoque Atual",
        price: "Preço",
        value: "Valor",
        date: "Data",
        type: "Tipo",
        quantity: "Quantidade",
        stockIn: "Entrada",
        stockOut: "Saída",
        adjust: "Ajuste",
        move: "Movimentação",
        noData: "Nenhum dado",
        loading: "Carregando relatórios...",
        dateRange: "Período",
        applyFilter: "Aplicar",
      },
      items: {
        tourSidebarTitle: "Menu",
        tourSidebarDesc: "Menu",
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

function makeStats(): ReportStats {
  return {
    totalItems: NAMES.length,
    totalLocations: NAMES.length,
    totalTransactions: NAMES.length,
    totalStockValue: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    transactionsByType: { stock_in: NAMES.length, stock_out: 0, adjust: 0, move: 0 },
    recentTransactions: NAMES.map((itemName, index) => ({
      id: index + 1,
      transactionType: "stock_in",
      quantity: 1,
      createdAt: "2026-01-01T00:00:00.000Z",
      itemName,
    })),
    topItemsByValue: NAMES.map((name, index) => ({
      id: index + 1,
      name,
      sku: `S-${index + 1}`,
      currentStock: 1,
      price: 1,
      totalValue: 1,
    })),
    stockByLocation: NAMES.map((locationName, index) => ({
      locationId: index + 1,
      locationName,
      itemCount: 1,
      totalStock: 1,
      totalValue: 1,
    })),
    transactionsByDate: [],
  };
}

describe("ReportsPageClient sort", () => {
  it("sorts recent transactions before paginating", async () => {
    render(
      <ReportsPageClient teamId={1} initialTeam={{ id: 1, name: "Time" }} initialStats={makeStats()} />
    );

    await waitFor(() => {
      expect(screen.queryByText("Carregando relatórios...")).not.toBeInTheDocument();
    });

    const recent = screen.getByRole("heading", { name: "Transações Recentes" }).closest("div")!;
    fireEvent.click(within(recent).getByRole("button", { name: "Item crescente" }));

    expect(within(recent).getByText("Alpha")).toBeInTheDocument();
    expect(within(recent).getByText("Juliet")).toBeInTheDocument();
    expect(within(recent).queryByText("Kilo")).not.toBeInTheDocument();
    expect(within(recent).getByText("Página 1 de 2")).toBeInTheDocument();
  });
});
