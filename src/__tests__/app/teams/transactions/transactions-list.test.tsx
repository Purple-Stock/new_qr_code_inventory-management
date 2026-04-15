// @vitest-environment jsdom

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TransactionsList } from "@/app/teams/[id]/transactions/_components/TransactionsList";

vi.mock("@/lib/i18n", () => ({
  useTranslation: () => ({
    language: "pt-BR",
    t: {
      common: {
        error: "Erro",
        success: "Sucesso",
        noNotes: "Sem notas.",
      },
      transactions: {
        noTransactions: "Nenhuma transação encontrada",
        deleteConfirm: "Tem certeza?",
        failedToDeleteTransaction: "Falha ao excluir transação",
        transactionDeleted: "Transação excluída com sucesso",
        date: "Data",
        type: "Tipo",
        item: "Item",
        quantity: "Quantidade",
        location: "Localização",
        notes: "Notas",
        user: "Usuário",
        actions: "Ações",
        linkedPending: "Pendente",
        transferGroupPrefix: "Grupo",
        stockIn: "Entrada",
        stockOut: "Saída",
        adjust: "Ajustar",
        move: "Mover",
      },
    },
  }),
}));

vi.mock("@/components/ui/use-toast-simple", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/app/teams/[id]/transactions/_actions/deleteTransaction", () => ({
  deleteTransactionAction: vi.fn(),
}));

const baseTransaction = {
  id: 1,
  itemId: 10,
  teamId: 29,
  transactionType: "stock_out",
  quantity: -2,
  notes: "teste",
  userId: 26,
  sourceLocationId: null,
  destinationLocationId: 3,
  destinationKind: "location",
  destinationLabel: null,
  counterpartyTeamId: null,
  linkedTransactionId: null,
  transferGroupId: null,
  createdAt: "2026-04-15T18:01:00.000Z",
  updatedAt: "2026-04-15T18:01:00.000Z",
  item: { id: 10, name: "CAP CALABRESA", sku: "CAP", barcode: "123" },
  user: { id: 26, email: "admpadariakids@gmail.com" },
  sourceLocation: null,
  destinationLocation: { id: 3, name: "CÂMARA FRIA" },
  counterpartyTeam: null,
} as const;

describe("TransactionsList", () => {
  it("hides delete action when the user cannot delete transactions", () => {
    render(
      <TransactionsList
        transactions={[baseTransaction] as any}
        teamId={29}
        onDelete={vi.fn()}
        canDeleteTransactions={false as any}
      />
    );

    expect(
      screen.queryByRole("button", { name: "Delete transaction" })
    ).not.toBeInTheDocument();
  });

  it("shows delete action when the user can delete transactions", () => {
    render(
      <TransactionsList
        transactions={[baseTransaction] as any}
        teamId={29}
        onDelete={vi.fn()}
        canDeleteTransactions={true as any}
      />
    );

    expect(
      screen.getByRole("button", { name: "Delete transaction" })
    ).toBeInTheDocument();
  });
});
