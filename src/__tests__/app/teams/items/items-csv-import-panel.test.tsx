// @vitest-environment jsdom

import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { ItemsCsvImportPanel } from "@/app/teams/[id]/items/_components/ItemsCsvImportPanel";

const toastSpy = vi.fn();

vi.mock("@/components/ui/use-toast-simple", () => ({
  useToast: () => ({
    toast: toastSpy,
  }),
}));

vi.mock("@/lib/api-client", () => ({
  fetchApiJsonResult: vi.fn(),
}));

vi.mock("@/app/teams/[id]/items/_utils/exportItemsCsv", () => ({
  downloadCsv: vi.fn(),
  getItemsCsvTemplate: vi.fn(() => "name,sku"),
}));

describe("ItemsCsvImportPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens and closes the import modal", () => {
    render(
      <ItemsCsvImportPanel
        teamId="4"
        labels={{
          title: "Importar CSV",
          description: "Descrição",
          openButton: "Importar CSV",
          closeButton: "Fechar",
          downloadTemplate: "Baixar modelo",
          selectFile: "Selecionar arquivo",
          previewButton: "Pré-visualizar",
          importButton: "Importar",
          importing: "Importando",
          previewing: "Pré-visualizando",
          selectedFile: "Arquivo selecionado",
          summary: "Resumo",
          validRows: "Válidos",
          invalidRows: "Inválidos",
          totalRows: "Total",
          line: "Linha",
          validBadge: "Válido",
          invalidBadge: "Inválido",
          errorsTitle: "Erros",
          previewHelp: "Ajuda",
          importSuccess: "Importado",
          templateSuccess: "Modelo baixado",
          chooseFileError: "Escolha um arquivo",
          importBlocked: "Importação bloqueada",
          noPreviewYet: "Nenhuma prévia",
        }}
      />
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Importar CSV" }));

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByRole("heading", { name: "Importar CSV" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
