// @vitest-environment jsdom

import { describe, it, expect, beforeEach, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import LoginPage from "@/app/(main)/_components/LoginPageClient";
import { fetchApiJsonResult } from "@/lib/api-client";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock("@/lib/api-client", () => ({
  fetchApiJsonResult: vi.fn(),
}));

vi.mock("@/lib/i18n", () => ({
  useTranslation: () => ({
    language: "pt-BR",
    setLanguage: vi.fn(),
    t: {
      auth: {
        language: "Idioma",
        languageEnglish: "English",
        languageFrench: "Français",
        languagePortuguese: "Português",
        appTagline: "Seu inventário simplificado",
        login: {
          instructions: "Digite suas credenciais para acessar sua conta",
          emailLabel: "E-mail",
          emailPlaceholder: "email@empresa.com",
          passwordLabel: "Senha",
          passwordPlaceholder: "Senha",
          showPassword: "Mostrar senha",
          hidePassword: "Ocultar senha",
          signIn: "Entrar",
          signingIn: "Entrando...",
          invalidCredentials: "E-mail ou senha inválidos",
          unexpectedError: "Ocorreu um erro inesperado. Tente novamente.",
          noAccount: "Não tem uma conta?",
          createAccount: "Criar conta",
        },
      },
    },
  }),
}));

const mockedFetchApiJsonResult = vi.mocked(fetchApiJsonResult);

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows invalid credentials only for 401", async () => {
    mockedFetchApiJsonResult.mockResolvedValue({
      ok: false,
      error: {
        status: 401,
        errorCode: "USER_NOT_AUTHENTICATED",
        error: "Invalid email or password",
      },
    });

    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText("E-mail"), {
      target: { value: "ariel.graunadigital@gmail.com" },
    });
    fireEvent.change(screen.getByLabelText("Senha"), {
      target: { value: "wrong-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => {
      expect(screen.getByText("E-mail ou senha inválidos")).toBeInTheDocument();
    });
  });

  it("does not disguise a server failure as invalid credentials", async () => {
    mockedFetchApiJsonResult.mockResolvedValue({
      ok: false,
      error: {
        status: 500,
        errorCode: "INTERNAL_ERROR",
        error: "An error occurred during login",
      },
    });

    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText("E-mail"), {
      target: { value: "ariel.graunadigital@gmail.com" },
    });
    fireEvent.change(screen.getByLabelText("Senha"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => {
      expect(
        screen.getByText("Ocorreu um erro inesperado. Tente novamente.")
      ).toBeInTheDocument();
    });
    expect(screen.queryByText("E-mail ou senha inválidos")).not.toBeInTheDocument();
  });
});
