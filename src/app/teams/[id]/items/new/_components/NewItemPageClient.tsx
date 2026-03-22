"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TeamLayout } from "@/components/shared/TeamLayout";
import { FormPageShell } from "@/components/shared/FormPageShell";
import { TutorialTour, type TourStep } from "@/components/TutorialTour";
import { useTranslation } from "@/lib/i18n";
import { ItemForm } from "../../_components/ItemForm";
import { useCreateItemForm } from "../../_hooks/useCreateItemForm";

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
  const [success, setSuccess] = useState("");
  const {
    form,
    error,
    isLoading,
    updateField,
    updateCustomField,
    generateSKU,
    generateBarcode,
    handleSubmit,
  } = useCreateItemForm({
    teamId,
    onSuccess: async () => {
      setSuccess(t.itemForm.createSuccess);
      await router.push(`/teams/${teamId}/items`);
      router.refresh();
    },
  });

  const tourSteps: TourStep[] = [
    { target: "tour-new-item-tutorial", title: t.itemForm.tourTutorialTitle, description: t.itemForm.tourTutorialDesc },
    { target: "tour-new-item-name", title: t.itemForm.tourNameTitle, description: t.itemForm.tourNameDesc },
    { target: "tour-new-item-sku", title: t.itemForm.tourSkuTitle, description: t.itemForm.tourSkuDesc },
    { target: "tour-new-item-barcode", title: t.itemForm.tourBarcodeTitle, description: t.itemForm.tourBarcodeDesc },
    { target: "tour-new-item-photo", title: t.itemForm.tourPhotoTitle, description: t.itemForm.tourPhotoDesc },
    { target: "tour-new-item-pricing", title: t.itemForm.tourPricingTitle, description: t.itemForm.tourPricingDesc },
    { target: "tour-new-item-attributes", title: t.itemForm.tourAttributesTitle, description: t.itemForm.tourAttributesDesc },
    { target: "tour-new-item-custom-fields", title: t.itemForm.tourCustomFieldsTitle, description: t.itemForm.tourCustomFieldsDesc },
    { target: "tour-new-item-submit", title: t.itemForm.tourSubmitTitle, description: t.itemForm.tourSubmitDesc },
    { target: "tour-sidebar", title: t.itemForm.tourSidebarTitle, description: t.itemForm.tourSidebarDesc },
  ];

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
