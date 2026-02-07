"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { TeamLayout } from "@/components/shared/TeamLayout";
import { FormPageShell } from "@/components/shared/FormPageShell";
import { useTranslation } from "@/lib/i18n";
import { ItemForm, type ItemFormValues } from "../../_components/ItemForm";

export default function EditItemPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useParams();
  const teamId = params?.id as string;
  const itemId = params?.itemId as string;

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
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [team, setTeam] = useState<{ id: number; name: string } | null>(null);

  useEffect(() => {
    if (teamId && itemId) {
      fetchItem();
    }
  }, [teamId, itemId]);

  const updateField = (field: keyof ItemFormValues, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const fetchItem = async () => {
    try {
      const teamRes = await fetch(`/api/teams/${teamId}`);
      const teamData = await teamRes.json();
      if (teamRes.ok) {
        setTeam(teamData.team);
      }

      const res = await fetch(`/api/teams/${teamId}/items/${itemId}`);
      const data = await res.json();
      if (!res.ok) {
        setError(t.items.failedToLoadItem);
        setIsLoadingData(false);
        return;
      }

      const item = data.item;
      setForm({
        name: item.name ?? "",
        sku: item.sku ?? "",
        barcode: item.barcode ?? "",
        cost: item.cost != null ? String(item.cost) : "",
        price: item.price != null ? String(item.price) : "",
        itemType: item.itemType ?? "",
        brand: item.brand ?? "",
      });
    } catch (err) {
      console.error("Error fetching item:", err);
      setError(t.itemForm.unexpectedError);
    } finally {
      setIsLoadingData(false);
    }
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
      const response = await fetch(`/api/teams/${teamId}/items/${itemId}`, {
        method: "PUT",
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

      setSuccess(t.itemForm.updateSuccess);
      await router.push(`/teams/${teamId}/items`);
      router.refresh();
    } catch (err) {
      setError(t.itemForm.unexpectedError);
      setIsLoading(false);
    }
  };

  if (isLoadingData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">{t.itemForm.loadingItem}</p>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">{t.itemForm.loadingTeam}</p>
      </div>
    );
  }

  return (
    <TeamLayout team={team} activeMenuItem="items">
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
