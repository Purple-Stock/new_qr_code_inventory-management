// @vitest-environment jsdom

import { describe, it, expect, beforeEach, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { faker } from "@faker-js/faker";
import SignUpPage from "@/app/(auth)/signup/_components/SignUpPageClient";
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
        signup: {
          instructions: "Digite seus dados para criar sua conta",
          companyNameLabel: "Nome da empresa",
          companyNamePlaceholder: "Empresa",
          emailLabel: "E-mail",
          emailPlaceholder: "email@empresa.com",
          passwordLabel: "Senha",
          passwordPlaceholder: "Senha",
          confirmPasswordLabel: "Confirmar senha",
          confirmPasswordPlaceholder: "Confirmar senha",
          showPassword: "Mostrar senha",
          hidePassword: "Ocultar senha",
          passwordMismatch: "As senhas não coincidem",
          passwordMinLength: "A senha deve ter pelo menos 6 caracteres",
          passwordMinHint: "Mínimo de 6 caracteres",
          emailAlreadyInUse: "Já existe uma conta com este e-mail",
          signupError: "Ocorreu um erro durante o cadastro",
          unexpectedError: "Ocorreu um erro inesperado. Tente novamente.",
          accountCreatedRedirecting: "Conta criada. Redirecionando...",
          signUp: "Criar conta",
          creatingAccount: "Criando conta...",
          alreadyHaveAccount: "Já tem uma conta?",
          signInLink: "Entrar",
        },
      },
    },
  }),
}));

const mockedFetchApiJsonResult = vi.mocked(fetchApiJsonResult);

describe("SignUpPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the API error message instead of a generic signup error", async () => {
    const password = faker.internet.password({ length: 18, memorable: false });
    const email = faker.internet.email({ provider: "purplestock.com.br" }).toLowerCase();

    mockedFetchApiJsonResult.mockResolvedValue({
      ok: false,
      error: {
        errorCode: "EMAIL_ALREADY_IN_USE",
        error: "User with this email already exists",
      },
    } as any);

    render(<SignUpPage />);

    fireEvent.change(screen.getByLabelText("Nome da empresa"), {
      target: { value: "Purple Stock" },
    });
    fireEvent.change(screen.getByLabelText("E-mail"), {
      target: { value: email },
    });
    fireEvent.change(screen.getByLabelText("Senha"), {
      target: { value: password },
    });
    fireEvent.change(screen.getByLabelText("Confirmar senha"), {
      target: { value: password },
    });

    fireEvent.click(screen.getByRole("button", { name: "Criar conta" }));

    await waitFor(() => {
      expect(screen.getByText("Já existe uma conta com este e-mail")).toBeInTheDocument();
    });
  });
});
