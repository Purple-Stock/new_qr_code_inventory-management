// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { TransactionsPageClient } from "@/app/teams/[id]/transactions/_components/TransactionsPageClient";
import type { TransactionWithDetails } from "@/app/teams/[id]/transactions/_types";

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

vi.mock("@/app/teams/[id]/transactions/_components/TransactionsList", () => ({
  TransactionsList: ({
    transactions,
    onSort,
  }: {
    transactions: TransactionWithDetails[];
    onSort?: (key: "item") => void;
  }) => (
    <div>
      <button type="button" onClick={() => onSort?.("item")}>
        Ordenar item
      </button>
      <ul>
        {transactions.map((transaction) => (
          <li key={transaction.id}>{transaction.item?.name}</li>
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
        back: "Voltar",
        page: "Página",
        of: "de",
        next: "Próximo",
      },
      transactions: {
        title: "Transações",
        subtitle: "Histórico",
        searchPlaceholder: "Buscar",
        stockIn: "Entrada",
        counterpartyTeamFilter: "Time",
        allCounterpartyTeams: "Todos",
        interTeamOnly: "Só entre times",
        tourTutorialTitle: "T",
        tourTutorialDesc: "T",
        tourSearchTitle: "T",
        tourSearchDesc: "T",
        tourQuickActionTitle: "T",
        tourQuickActionDesc: "T",
        tourListTitle: "T",
        tourListDesc: "T",
        tourSidebarTitle: "T",
        tourSidebarDesc: "T",
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

function makeTransaction(id: number, name: string): TransactionWithDetails {
  return {
    id,
    itemId: id,
    teamId: 1,
    transactionType: "stock_in",
    quantity: 1,
    notes: null,
    userId: 1,
    sourceLocationId: null,
    destinationLocationId: 1,
    destinationKind: "location",
    destinationLabel: null,
    counterpartyTeamId: null,
    linkedTransactionId: null,
    transferGroupId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    item: { id, name, sku: `S-${id}`, barcode: `${id}` },
    user: { id: 1, email: "a@b.com" },
    sourceLocation: null,
    destinationLocation: { id: 1, name: "Main" },
    counterpartyTeam: null,
  } as TransactionWithDetails;
}

describe("TransactionsPageClient sort", () => {
  it("sorts the full list before paginating", () => {
    render(
      <TransactionsPageClient
        transactions={NAMES.map((name, index) => makeTransaction(index + 1, name))}
        team={{ id: 1, name: "Time" }}
        counterpartyTeamOptions={[]}
        canDeleteTransactions={false}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Ordenar item" }));

    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Juliet")).toBeInTheDocument();
    expect(screen.queryByText("Kilo")).not.toBeInTheDocument();
    expect(screen.getByText("Página 1 de 2")).toBeInTheDocument();
  });
});
