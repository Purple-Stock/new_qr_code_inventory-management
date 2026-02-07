"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TeamLayout } from "@/components/shared/TeamLayout";
import { FormPageShell } from "@/components/shared/FormPageShell";
import { useTranslation } from "@/lib/i18n";
import { ItemForm, type ItemFormValues } from "../../_components/ItemForm";

interface NewItemPageClientProps {
  teamId: number;
  initialTeam: { id: number; name: string };
}

export default function NewItemPageClient({
  teamId,
  initialTeam,
}: NewItemPageClientProps) {
  const router = useRouter();
  const { t } = useTranslation();

  const [form, setForm] = useState<ItemFormValues>({
    name: "",
    sku: "",
    barcode: "",
    cost: "",
    price: "",
    itemType: "",
    brand: "",
  });
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
      const response = await fetch(`/api/teams/${teamId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          sku: form.sku.trim() || null,
          barcode: form.barcode.trim(),
          cost: form.cost ? parseFloat(form.cost) : null,
          price: form.price ? parseFloat(form.price) : null,
          itemType: form.itemType.trim() || null,
          brand: form.brand.trim() || null,
        }),
      });

      if (!response.ok) {
        setError(t.itemForm.unexpectedError);
        setIsLoading(false);
        return;
      }

      setSuccess(t.itemForm.createSuccess);
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
          title={t.items.newItem}
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
            mode="create"
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
