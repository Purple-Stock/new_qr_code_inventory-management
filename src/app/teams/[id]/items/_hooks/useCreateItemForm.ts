"use client";

import { useState } from "react";
import { fetchApiJsonResult } from "@/lib/api-client";
import { useTranslation } from "@/lib/i18n";
import type { ItemDto } from "@/lib/services/types";
import type { ItemFormValues } from "../_components/ItemForm";
import { buildItemWriteBody } from "../_lib/item-write-body";

export function createEmptyItemFormValues(
  overrides: Partial<ItemFormValues> = {}
): ItemFormValues {
  const { customFields, ...restOverrides } = overrides;

  const baseValues: ItemFormValues = {
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

  return {
    ...baseValues,
    ...restOverrides,
    customFields: customFields ?? {},
  };
}

interface UseCreateItemFormOptions {
  teamId: number;
  initialValues?: Partial<ItemFormValues>;
  onSuccess?: (item: ItemDto) => Promise<void> | void;
}

export function useCreateItemForm({
  teamId,
  initialValues,
  onSuccess,
}: UseCreateItemFormOptions) {
  const { t } = useTranslation();
  const [form, setForm] = useState<ItemFormValues>(() =>
    createEmptyItemFormValues(initialValues)
  );
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const updateField = (field: keyof ItemFormValues, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateCustomField = (fieldKey: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      customFields: { ...prev.customFields, [fieldKey]: value },
    }));
  };

  const generateSKU = () => {
    if (form.name.trim()) {
      updateField(
        "sku",
        form.name.toUpperCase().replace(/\s+/g, "-").substring(0, 20)
      );
    }
  };

  const generateBarcode = () => {
    updateField(
      "barcode",
      Math.floor(1000000000000 + Math.random() * 9000000000000).toString()
    );
  };

  const resetForm = () => {
    setForm(createEmptyItemFormValues(initialValues));
    setError("");
    setIsLoading(false);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError(t.itemForm.itemNameRequired);
      return;
    }

    if (!form.barcode.trim()) {
      setError(t.itemForm.barcodeRequired);
      return;
    }

    const payload = buildItemWriteBody(form);
    if (!payload.ok) {
      setError(t.itemForm.maximumStockInvalid);
      return;
    }

    setIsLoading(true);

    try {
      const result = await fetchApiJsonResult<{
        message: string;
        item: ItemDto;
      }>(`/api/teams/${teamId}/items`, {
        method: "POST",
        body: payload.body,
        fallbackError: t.itemForm.unexpectedError,
      });

      if (!result.ok) {
        setError(result.error.error || t.itemForm.unexpectedError);
        setIsLoading(false);
        return;
      }

      await onSuccess?.(result.data.item);
      resetForm();
    } catch {
      setError(t.itemForm.unexpectedError);
      setIsLoading(false);
    }
  };

  return {
    form,
    error,
    isLoading,
    updateField,
    updateCustomField,
    generateSKU,
    generateBarcode,
    handleSubmit,
    resetForm,
  };
}
