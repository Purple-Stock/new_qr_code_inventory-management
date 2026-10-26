// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import {
  ItemForm,
  type ItemFormValues,
} from "@/app/teams/[id]/items/_components/ItemForm";
import { en } from "@/lib/i18n/translations/en";
import { ptBR } from "@/lib/i18n/translations/pt-BR";
import { fr } from "@/lib/i18n/translations/fr";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const emptyValues: ItemFormValues = {
  name: "Plugue",
  sku: "PLG-1",
  barcode: "123",
  cost: "",
  price: "",
  itemType: "",
  brand: "",
  photoData: "",
  customFields: {},
  minimumStock: "",
  maximumStock: "",
};

function renderForm(
  t: typeof ptBR,
  values: ItemFormValues = emptyValues
) {
  render(
    <ItemForm
      t={t}
      values={values}
      customFieldSchema={[]}
      isLoading={false}
      mode="edit"
      onSubmit={(event) => event.preventDefault()}
      onValueChange={vi.fn()}
      onCustomFieldChange={vi.fn()}
      onGenerateSKU={vi.fn()}
      onGenerateBarcode={vi.fn()}
      cancelHref="/teams/1/items"
    />
  );
}

describe("ItemForm photo field", () => {
  it("keeps photo labels in every locale", () => {
    for (const locale of [en, ptBR, fr]) {
      expect(locale.itemForm.photoLabel.trim().length).toBeGreaterThan(0);
      expect(locale.itemForm.removePhoto.trim().length).toBeGreaterThan(0);
    }
  });

  it("labels the file input so the photo can be edited", () => {
    renderForm(ptBR);

    const input = screen.getByLabelText(ptBR.itemForm.photoLabel);
    expect(input).toHaveAttribute("type", "file");
    expect(input).toHaveAttribute("accept", "image/*");
  });

  it("shows a remove-photo action when the item already has an image", () => {
    renderForm(ptBR, {
      ...emptyValues,
      photoData: "https://cdn.example.com/plugue.jpg",
    });

    expect(
      screen.getByRole("button", { name: ptBR.itemForm.removePhoto })
    ).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Item preview" })).toHaveAttribute(
      "src",
      "https://cdn.example.com/plugue.jpg"
    );
  });

  it("reads the chosen file into photoData", async () => {
    const onValueChange = vi.fn();
    class FakeFileReader {
      result = "data:image/png;base64,AAA";
      onload: ((event: ProgressEvent<FileReader>) => void) | null = null;
      readAsDataURL() {
        this.onload?.({} as ProgressEvent<FileReader>);
      }
    }
    vi.stubGlobal("FileReader", FakeFileReader);

    render(
      <ItemForm
        t={ptBR}
        values={emptyValues}
        customFieldSchema={[]}
        isLoading={false}
        mode="edit"
        onSubmit={(event) => event.preventDefault()}
        onValueChange={onValueChange}
        onCustomFieldChange={vi.fn()}
        onGenerateSKU={vi.fn()}
        onGenerateBarcode={vi.fn()}
        cancelHref="/teams/1/items"
      />
    );

    const file = new File([new Uint8Array([1, 2, 3])], "plugue.png", {
      type: "image/png",
    });
    const input = screen.getByLabelText(ptBR.itemForm.photoLabel);
    fireEvent.change(input, { target: { files: [file] } });

    expect(onValueChange).toHaveBeenCalledWith(
      "photoData",
      "data:image/png;base64,AAA"
    );
    vi.unstubAllGlobals();
  });
});
