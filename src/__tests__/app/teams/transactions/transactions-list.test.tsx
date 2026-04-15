// @vitest-environment jsdom

import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TransactionsList } from "@/app/teams/[id]/transactions/_components/TransactionsList";
import { deleteTransactionAction } from "@/app/teams/[id]/transactions/_actions/deleteTransaction";

vi.mock("@/lib/i18n", () => ({
  useTranslation: () => ({
    language: "pt-BR",
    t: {
      common: {
        error: "Erro",
        success: "Sucesso",
        noNotes: "Sem notas.",
        delete: "Excluir",
        cancel: "Cancelar",
        loading: "Carregando",
        cannotBeUndone: "Essa ação não pode ser desfeita.",
      },
      teamSelection: {
        deleteConfirm: "Tem certeza que deseja excluir?",
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
        count: "Contagem",
        deleteModalTitle: "Excluir transação",
        deleteModalDescription: "Confira os dados antes de excluir a movimentação.",
        deleteModalType: "Tipo",
        deleteModalItem: "Item",
        deleteModalQuantity: "Quantidade",
        deleteModalLocation: "Localização",
        deleteModalDate: "Data",
        deleteModalUser: "Usuário",
        deleteModalNotes: "Notas",
        deleteModalConfirm: "Excluir transação",
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

const mockedDeleteTransactionAction = vi.mocked(deleteTransactionAction);

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

  it("opens a contextual delete modal when clicking the delete action", () => {
    render(
      <TransactionsList
        transactions={[baseTransaction] as any}
        teamId={29}
        onDelete={vi.fn()}
        canDeleteTransactions={true}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete transaction" }));

    expect(
      screen.getByRole("heading", { name: "Excluir transação" })
    ).toBeInTheDocument();
    expect(screen.getByText("Confira os dados antes de excluir a movimentação.")).toBeInTheDocument();
    expect(screen.getAllByText("CAP CALABRESA")).toHaveLength(2);
    expect(screen.getAllByText("admpadariakids@gmail.com")).toHaveLength(2);
    expect(screen.getAllByText("teste")).toHaveLength(2);
    expect(
      screen.getByRole("button", { name: "Excluir transação" })
    ).toBeInTheDocument();
  });

  it("closes the modal when cancelling deletion", () => {
    render(
      <TransactionsList
        transactions={[baseTransaction] as any}
        teamId={29}
        onDelete={vi.fn()}
        canDeleteTransactions={true}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete transaction" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByText("Confira os dados antes de excluir a movimentação.")).not.toBeInTheDocument();
  });

  it("confirms deletion through the modal", async () => {
    mockedDeleteTransactionAction.mockResolvedValue({ success: true } as any);
    const onDelete = vi.fn();

    render(
      <TransactionsList
        transactions={[baseTransaction] as any}
        teamId={29}
        onDelete={onDelete}
        canDeleteTransactions={true}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete transaction" }));
    fireEvent.click(screen.getByRole("button", { name: "Excluir transação" }));

    await waitFor(() => {
      expect(mockedDeleteTransactionAction).toHaveBeenCalledWith(29, 1);
      expect(onDelete).toHaveBeenCalled();
    });
  });
});
