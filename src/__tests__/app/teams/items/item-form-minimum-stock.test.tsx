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
    minimumStockLabel: "Minimum quantity",
    minimumStockHelp:
      "Leave blank to skip alerts. Use 1 or 2 to get an email when stock is almost gone.",
    minimumStockPlaceholder: "No alert",
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
  minimumStock: "",
  maximumStock: "",
};

describe("ItemForm minimum quantity", () => {
  it("exposes an editable numeric minimum used as the low-stock trigger", () => {
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

    const input = screen.getByLabelText("Minimum quantity");
    expect(input).toHaveAttribute("type", "number");

    fireEvent.change(input, { target: { value: "2" } });
    expect(onValueChange).toHaveBeenCalledWith("minimumStock", "2");
  });
});
