// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LocationsList } from "@/app/teams/[id]/locations/_components/LocationsList";
import { deleteLocationAction } from "@/app/teams/[id]/locations/_actions/deleteLocation";

const toastSpy = vi.fn();
const pushSpy = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushSpy,
  }),
}));

vi.mock("@/lib/i18n", () => ({
  useTranslation: () => ({
    language: "pt-BR",
    t: {
      common: {
        delete: "Excluir",
        cancel: "Cancelar",
        loading: "Carregando",
        cannotBeUndone: "Esta ação não pode ser desfeita.",
      },
      teamSelection: {
        deleteConfirm: "Tem certeza que deseja excluir?",
      },
    },
  }),
}));

vi.mock("@/components/ui/use-toast-simple", () => ({
  useToast: () => ({ toast: toastSpy }),
}));

vi.mock("@/app/teams/[id]/locations/_actions/deleteLocation", () => ({
  deleteLocationAction: vi.fn(),
}));

const mockedDeleteLocationAction = vi.mocked(deleteLocationAction);

const translations = {
  common: {
    error: "Erro",
    actions: "Ações",
    noDescription: "Sem descrição",
    delete: "Excluir",
    cancel: "Cancelar",
    sortAscending: "crescente",
    sortDescending: "decrescente",
  },
  locations: {
    name: "NOME",
    description: "DESCRIÇÃO",
    deleteConfirmPrefix: "Tem certeza de que deseja excluir",
    deleteError: "Ocorreu um erro ao excluir a localização",
    deletedTitle: "Localização excluída",
    deletedDescriptionSuffix: "foi excluída com sucesso.",
  },
};

const local1 = {
  id: 11,
  name: "Local 1",
  description: "Default location for all items",
  teamId: 1,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("LocationsList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("opens the system delete modal instead of window.confirm", () => {
    render(
      <LocationsList
        locations={[local1]}
        teamId={1}
        t={translations}
        onDelete={vi.fn()}
      />
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Delete location" })[0]);

    expect(window.confirm).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Excluir" })).toBeInTheDocument();
    expect(
      screen.getByText('Tem certeza de que deseja excluir "Local 1"?')
    ).toBeInTheDocument();
    expect(screen.getByText("Esta ação não pode ser desfeita.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Excluir" })).toBeInTheDocument();
  });

  it("closes the modal when cancelling deletion", () => {
    render(
      <LocationsList
        locations={[local1]}
        teamId={1}
        t={translations}
        onDelete={vi.fn()}
      />
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Delete location" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(
      screen.queryByText('Tem certeza de que deseja excluir "Local 1"?')
    ).not.toBeInTheDocument();
    expect(mockedDeleteLocationAction).not.toHaveBeenCalled();
  });

  it("confirms deletion through the modal", async () => {
    mockedDeleteLocationAction.mockResolvedValue({ success: true } as never);
    const onDelete = vi.fn();

    render(
      <LocationsList
        locations={[local1]}
        teamId={1}
        t={translations}
        onDelete={onDelete}
      />
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Delete location" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Excluir" }));

    await waitFor(() => {
      expect(mockedDeleteLocationAction).toHaveBeenCalledWith(1, 11);
      expect(onDelete).toHaveBeenCalled();
    });
  });
});
