"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TeamLayout } from "@/components/shared/TeamLayout";
import { FormPageShell } from "@/components/shared/FormPageShell";
import { TutorialTour, type TourStep } from "@/components/TutorialTour";
import { useTranslation } from "@/lib/i18n";
import { fetchApiJsonResult } from "@/lib/api-client";
import { ItemForm, type ItemFormValues } from "../../_components/ItemForm";

interface NewItemPageClientProps {
  teamId: number;
  initialTeam: {
    id: number;
    name: string;
    itemCustomFieldSchema?: { key: string; label: string; active: boolean }[] | null;
  };
}

export default function NewItemPageClient({
  teamId,
  initialTeam,
}: NewItemPageClientProps) {
  const router = useRouter();
  const { t } = useTranslation();

  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [form, setForm] = useState<ItemFormValues>({
    name: "",
    sku: "",
    barcode: "",
    cost: "",
    price: "",
    itemType: "",
    brand: "",
    customFields: {},
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const tourSteps: TourStep[] = [
    { target: "tour-new-item-tutorial", title: t.itemForm.tourTutorialTitle, description: t.itemForm.tourTutorialDesc },
    { target: "tour-new-item-name", title: t.itemForm.tourNameTitle, description: t.itemForm.tourNameDesc },
    { target: "tour-new-item-sku", title: t.itemForm.tourSkuTitle, description: t.itemForm.tourSkuDesc },
    { target: "tour-new-item-barcode", title: t.itemForm.tourBarcodeTitle, description: t.itemForm.tourBarcodeDesc },
    { target: "tour-new-item-pricing", title: t.itemForm.tourPricingTitle, description: t.itemForm.tourPricingDesc },
    { target: "tour-new-item-attributes", title: t.itemForm.tourAttributesTitle, description: t.itemForm.tourAttributesDesc },
    { target: "tour-new-item-custom-fields", title: t.itemForm.tourCustomFieldsTitle, description: t.itemForm.tourCustomFieldsDesc },
    { target: "tour-new-item-submit", title: t.itemForm.tourSubmitTitle, description: t.itemForm.tourSubmitDesc },
    { target: "tour-sidebar", title: t.itemForm.tourSidebarTitle, description: t.itemForm.tourSidebarDesc },
  ];

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
      const customFields = Object.fromEntries(
        Object.entries(form.customFields)
          .map(([key, value]) => [key, value.trim()])
          .filter(([, value]) => value.length > 0)
      );

      const result = await fetchApiJsonResult(`/api/teams/${teamId}/items`, {
        method: "POST",
        body: {
          name: form.name.trim(),
          sku: form.sku.trim() || null,
          barcode: form.barcode.trim(),
          cost: form.cost ? parseFloat(form.cost) : null,
          price: form.price ? parseFloat(form.price) : null,
          itemType: form.itemType.trim() || null,
          brand: form.brand.trim() || null,
          customFields: Object.keys(customFields).length > 0 ? customFields : null,
        },
        fallbackError: t.itemForm.unexpectedError,
      });

      if (!result.ok) {
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
          onTutorialClick={() => setIsTutorialOpen(true)}
          tutorialTourId="tour-new-item-tutorial"
          success={success}
          error={error}
        >
          <ItemForm
            t={t}
            values={form}
            customFieldSchema={initialTeam.itemCustomFieldSchema ?? []}
            isLoading={isLoading}
            cancelHref={`/teams/${teamId}/items`}
            mode="create"
            onSubmit={handleSubmit}
            onValueChange={updateField}
            onCustomFieldChange={updateCustomField}
            onGenerateSKU={generateSKU}
            onGenerateBarcode={generateBarcode}
          />
        </FormPageShell>
      </div>

      <TutorialTour
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
        steps={tourSteps}
      />
    </TeamLayout>
  );
}
