// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { ItemsList } from "@/app/teams/[id]/items/_components/ItemsList";
import type { Item } from "@/app/teams/[id]/items/_types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/components/QRCodeDisplay", () => ({
  QRCodeDisplay: () => <div data-testid="qr-code" />,
}));

vi.mock("@/components/ui/use-toast-simple", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/components/DeleteConfirmModal", () => ({
  DeleteConfirmModal: () => null,
}));

const t = {
  common: {
    error: "Erro",
    success: "Sucesso",
    actions: "Ações",
    delete: "Excluir",
  },
  items: {
    failedToLoadItem: "Falha",
    unnamedItemCopy: "Cópia",
    failedToDuplicateItem: "Falha ao duplicar",
    itemDuplicated: "Duplicado",
    failedToDeleteItem: "Falha ao excluir",
    itemDeleted: "Excluído",
    unnamedItem: "Sem nome",
    typeFallback: "Tipo",
    qrCode: "QR",
    item: "Item",
    sku: "SKU",
    type: "Tipo",
    stock: "Estoque",
    price: "Preço",
    photo: "Foto",
    noPhoto: "Sem foto",
    deleteConfirm: "Excluir?",
    sortAscending: "crescente",
    sortDescending: "decrescente",
  },
};

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 1,
    name: "Plugue",
    sku: "PLG-1",
    barcode: "123",
    itemType: "Áudio",
    currentStock: 4,
    minimumStock: null,
    price: 10,
    locationId: 1,
    locationName: "Gaveta",
    customFields: null,
    photoData: null,
    ...overrides,
  };
}

describe("ItemsList sort headers", () => {
  it("exposes sortable headers for data columns", () => {
    render(
      <ItemsList
        items={[makeItem()]}
        teamId="1"
        formatPrice={() => "R$ 10"}
        t={t}
        onSort={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "Item crescente" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "SKU crescente" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tipo crescente" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Estoque crescente" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Preço crescente" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Foto/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /QR/ })).not.toBeInTheDocument();
  });

  it("calls onSort with the clicked column", () => {
    const onSort = vi.fn();
    render(
      <ItemsList
        items={[makeItem()]}
        teamId="1"
        formatPrice={() => "R$ 10"}
        t={t}
        onSort={onSort}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "SKU crescente" }));

    expect(onSort).toHaveBeenCalledWith("sku");
  });

  it("renders one row per location when the same SKU is split", () => {
    render(
      <ItemsList
        items={[
          makeItem({
            id: 1,
            locationId: 1,
            locationName: "Local 1",
            currentStock: 12,
          }),
          makeItem({
            id: 1,
            locationId: 3,
            locationName: "Local2",
            currentStock: 8,
          }),
        ]}
        teamId="1"
        formatPrice={() => "R$ 0"}
        t={t}
      />
    );

    expect(screen.getAllByTestId("item-row-1-1").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("item-row-3-1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Local 1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Local2").length).toBeGreaterThan(0);
  });

  it("marks the active column with aria-sort", () => {
    render(
      <ItemsList
        items={[makeItem()]}
        teamId="1"
        formatPrice={() => "R$ 10"}
        t={t}
        sortKey="price"
        sortDirection="desc"
        onSort={vi.fn()}
      />
    );

    expect(screen.getByRole("columnheader", { name: /Preço/ })).toHaveAttribute(
      "aria-sort",
      "descending"
    );
    expect(screen.getByRole("columnheader", { name: /Item/ })).toHaveAttribute("aria-sort", "none");
  });
});
