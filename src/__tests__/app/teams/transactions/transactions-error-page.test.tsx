// @vitest-environment jsdom

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TransactionsErrorPage from "@/app/teams/[id]/transactions/error";

const useTranslationMock = vi.fn();

vi.mock("@/lib/i18n", () => ({
  useTranslation: () => useTranslationMock(),
}));

describe("Transactions error page", () => {
  it("renders message from thrown error and allows retry", () => {
    const reset = vi.fn();
    useTranslationMock.mockReturnValue({
      t: {
        common: {
          somethingWentWrong: "Algo deu errado",
          tryAgain: "Tentar novamente",
        },
        transactions: {
          loadingError: "Erro ao carregar transações",
        },
      },
    });

    render(
      <TransactionsErrorPage error={new Error("Falha no carregamento")} reset={reset} />
    );

    expect(screen.getByText("Algo deu errado")).toBeInTheDocument();
    expect(screen.getByText("Falha no carregamento")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("falls back safely when transactions translation namespace is missing", () => {
    const reset = vi.fn();
    useTranslationMock.mockReturnValue({
      t: {
        common: {
          somethingWentWrong: "Algo deu errado",
          tryAgain: "Tentar novamente",
        },
      },
    });

    render(<TransactionsErrorPage error={new Error("")} reset={reset} />);

    expect(screen.getByText("Algo deu errado")).toBeInTheDocument();
    expect(screen.getByText("An unexpected error occurred")).toBeInTheDocument();
  });
});
