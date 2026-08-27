// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import {
  ItemForm,
  type ItemFormValues,
} from "@/app/teams/[id]/items/_components/ItemForm";

const t = {
  common: { cancel: "Cancel" },
  itemForm: {
    itemInformation: "Item information",
    itemAttributes: "Item attributes",
    nameLabel: "Name",
    skuLabel: "SKU",
    barcodeLabel: "Barcode",
    photoLabel: "Photo",
    costLabel: "Cost",
    priceLabel: "Price",
    typeLabel: "Type",
    brandLabel: "Brand",
    maximumStockLabel: "Maximum quantity",
    maximumStockHelp:
      "Leave blank for no limit. Use 1 for a unique item.",
    maximumStockPlaceholder: "No limit",
    itemNamePlaceholder: "Name",
    skuPlaceholder: "SKU",
    barcodePlaceholder: "Barcode",
    itemTypePlaceholder: "Type",
    brandPlaceholder: "Brand",
    generate: "Generate",
    createAction: "Create Item",
    creating: "Creating...",
    updateAction: "Update Item",
    updating: "Updating...",
    customFieldsTitle: "Custom fields",
    customFieldPlaceholder: "Value",
    removePhoto: "Remove photo",
  },
};

const emptyValues: ItemFormValues = {
  name: "",
  sku: "",
  barcode: "",
  cost: "",
  price: "",
  itemType: "",
  brand: "",
  photoData: "",
  customFields: {},
  maximumStock: "",
};

describe("ItemForm maximum quantity", () => {
  it("exposes an editable numeric maximum instead of a unique-only checkbox", () => {
    const onValueChange = vi.fn();

    render(
      <ItemForm
        t={t}
        values={emptyValues}
        customFieldSchema={[]}
        isLoading={false}
        mode="create"
        onSubmit={(event) => event.preventDefault()}
        onValueChange={onValueChange}
        onCustomFieldChange={vi.fn()}
        onGenerateSKU={vi.fn()}
        onGenerateBarcode={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.queryByLabelText(/unique equipment/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();

    const input = screen.getByLabelText("Maximum quantity");
    expect(input).toHaveAttribute("type", "number");

    fireEvent.change(input, { target: { value: "5" } });
    expect(onValueChange).toHaveBeenCalledWith("maximumStock", "5");
  });
});
