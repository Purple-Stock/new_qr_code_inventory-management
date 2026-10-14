import { parseMaximumStockInput } from "@/lib/item-maximum-stock";
import { parseMinimumStockInput } from "@/lib/item-minimum-stock";
import type { ItemFormValues } from "../_components/ItemForm";

export type ItemWriteBodyError = "minimumStock" | "maximumStock";

export function buildItemWriteBody(form: ItemFormValues) {
  const minimumStock = parseMinimumStockInput(form.minimumStock);
  if (!minimumStock.ok) {
    return { ok: false as const, error: "minimumStock" as const };
  }

  const maximumStock = parseMaximumStockInput(form.maximumStock);
  if (!maximumStock.ok) {
    return { ok: false as const, error: "maximumStock" as const };
  }

  const customFields = Object.fromEntries(
    Object.entries(form.customFields)
      .map(([key, value]) => [key, value.trim()])
      .filter(([, value]) => value.length > 0)
  );

  return {
    ok: true as const,
    body: {
      name: form.name.trim(),
      sku: form.sku.trim() || null,
      barcode: form.barcode.trim(),
      cost: form.cost ? parseFloat(form.cost) : null,
      price: form.price ? parseFloat(form.price) : null,
      itemType: form.itemType.trim() || null,
      brand: form.brand.trim() || null,
      photoData: form.photoData || null,
      minimumStock: minimumStock.value,
      maximumStock: maximumStock.value,
      customFields: Object.keys(customFields).length > 0 ? customFields : null,
    },
  };
}
