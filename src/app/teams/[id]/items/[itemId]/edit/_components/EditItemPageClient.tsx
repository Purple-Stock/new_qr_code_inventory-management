"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TeamLayout } from "@/components/shared/TeamLayout";
import { FormPageShell } from "@/components/shared/FormPageShell";
import { useTranslation } from "@/lib/i18n";
import { fetchApiJsonResult } from "@/lib/api-client";
import { ItemForm, type ItemFormValues } from "../../../_components/ItemForm";

interface EditItemPageClientProps {
  teamId: number;
  itemId: number;
  initialTeam: { id: number; name: string };
  initialForm: ItemFormValues;
}

export default function EditItemPageClient({
  teamId,
  itemId,
  initialTeam,
  initialForm,
}: EditItemPageClientProps) {
  const router = useRouter();
  const { t } = useTranslation();

  const [form, setForm] = useState<ItemFormValues>(initialForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const updateField = (field: keyof ItemFormValues, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.name.trim()) {
      setError(t.itemForm.itemNameRequired);
      return;
    }
    if (!form.barcode.trim()) {
      setError(t.itemForm.barcodeRequired);
      return;
    }

    setIsLoading(true);

    try {
      const result = await fetchApiJsonResult(`/api/teams/${teamId}/items/${itemId}`, {
        method: "PUT",
        body: {
          name: form.name.trim(),
          sku: form.sku.trim() || null,
          barcode: form.barcode.trim(),
          cost: form.cost ? parseFloat(form.cost) : null,
          price: form.price ? parseFloat(form.price) : null,
          itemType: form.itemType.trim() || null,
          brand: form.brand.trim() || null,
        },
        fallbackError: t.itemForm.unexpectedError,
      });

      if (!result.ok) {
        setError(t.itemForm.unexpectedError);
        setIsLoading(false);
        return;
      }

      setSuccess(t.itemForm.updateSuccess);
      await router.push(`/teams/${teamId}/items`);
      router.refresh();
    } catch (err) {
      setError(t.itemForm.unexpectedError);
      setIsLoading(false);
    }
  };

  return (
    <TeamLayout team={initialTeam} activeMenuItem="items">
      <div className="max-w-3xl">
        <FormPageShell
          title={`${t.common.edit} ${t.items.item}`}
          backHref={`/teams/${teamId}/items`}
          tutorialLabel={t.common.tutorial}
          success={success}
          error={error}
        >
          <ItemForm
            t={t}
            values={form}
            isLoading={isLoading}
            cancelHref={`/teams/${teamId}/items`}
            mode="edit"
            onSubmit={handleSubmit}
            onValueChange={updateField}
            onGenerateSKU={generateSKU}
            onGenerateBarcode={generateBarcode}
          />
        </FormPageShell>
      </div>
    </TeamLayout>
  );
}
