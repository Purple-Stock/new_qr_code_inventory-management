"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TeamLayout } from "@/components/shared/TeamLayout";
import { FormPageShell } from "@/components/shared/FormPageShell";
import { useTranslation } from "@/lib/i18n";
import { parseApiResult } from "@/lib/api-error";
import { LocationForm } from "../../../_components/LocationForm";

interface EditLocationPageClientProps {
  teamId: number;
  locationId: number;
  initialTeam: { id: number; name: string };
  initialLocation: { name: string; description: string };
}

export default function EditLocationPageClient({
  teamId,
  locationId,
  initialTeam,
  initialLocation,
}: EditLocationPageClientProps) {
  const router = useRouter();
  const { t } = useTranslation();

  const [name, setName] = useState(initialLocation.name);
  const [description, setDescription] = useState(initialLocation.description);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!name.trim()) {
      setError(t.locationForm.nameRequired);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/teams/${teamId}/locations/${locationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
        }),
      });

      const result = await parseApiResult(response, t.locationForm.unexpectedError);

      if (!result.ok) {
        setError(t.locationForm.unexpectedError);
        setIsLoading(false);
        return;
      }

      setSuccess(t.locationForm.updateSuccess);
      router.push(`/teams/${teamId}/locations`);
    } catch (err) {
      setError(t.locationForm.unexpectedError);
      setIsLoading(false);
    }
  };

  return (
    <TeamLayout team={initialTeam} activeMenuItem="locations">
      <div className="max-w-2xl">
        <FormPageShell
          title={`${t.common.edit} ${t.menu.locations}`}
          backHref={`/teams/${teamId}/locations`}
          tutorialLabel={t.common.tutorial}
          success={success}
          error={error}
        >
          <LocationForm
            t={t}
            name={name}
            description={description}
            isLoading={isLoading}
            mode="edit"
            cancelHref={`/teams/${teamId}/locations`}
            onSubmit={handleSubmit}
            onNameChange={setName}
            onDescriptionChange={setDescription}
          />
        </FormPageShell>
      </div>
    </TeamLayout>
  );
}
