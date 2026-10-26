// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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
    locationName: "Gaveta",
    customFields: null,
    photoData: null,
    ...overrides,
  };
}

describe("ItemsList photo", () => {
  it("shows the registered photo on the listing", () => {
    render(
      <ItemsList
        items={[makeItem({ photoData: "https://cdn.example.com/plugue.jpg" })]}
        teamId="94"
        formatPrice={() => "R$ 10"}
        t={t}
      />
    );

    const photos = screen.getAllByRole("img", { name: "Plugue" });
    expect(photos.length).toBeGreaterThan(0);
    for (const photo of photos) {
      expect(photo).toHaveAttribute("src", "https://cdn.example.com/plugue.jpg");
    }
  });

  it("keeps a photo placeholder when the item has no image", () => {
    render(
      <ItemsList
        items={[makeItem({ name: "Parafuso M8", photoData: null })]}
        teamId="94"
        formatPrice={() => "R$ 0"}
        t={t}
      />
    );

    expect(screen.queryByRole("img", { name: "Parafuso M8" })).not.toBeInTheDocument();
    expect(screen.getAllByText("Sem foto").length).toBeGreaterThan(0);
  });
});
