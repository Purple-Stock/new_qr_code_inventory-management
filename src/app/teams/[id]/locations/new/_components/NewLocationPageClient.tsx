"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TeamLayout } from "@/components/shared/TeamLayout";
import { FormPageShell } from "@/components/shared/FormPageShell";
import { TutorialTour, type TourStep } from "@/components/TutorialTour";
import { useTranslation } from "@/lib/i18n";
import { fetchApiJsonResult } from "@/lib/api-client";
import { LocationForm } from "../../_components/LocationForm";

interface NewLocationPageClientProps {
  teamId: number;
  initialTeam: { id: number; name: string };
}

export default function NewLocationPageClient({
  teamId,
  initialTeam,
}: NewLocationPageClientProps) {
  const router = useRouter();
  const { t } = useTranslation();

  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const tourSteps: TourStep[] = [
    { target: "tour-new-location-tutorial", title: t.locationForm.tourCreateTutorialTitle, description: t.locationForm.tourCreateTutorialDesc },
    { target: "tour-location-name", title: t.locationForm.tourNameTitle, description: t.locationForm.tourNameDesc },
    { target: "tour-location-description", title: t.locationForm.tourDescriptionTitle, description: t.locationForm.tourDescriptionDesc },
    { target: "tour-location-submit", title: t.locationForm.tourCreateSubmitTitle, description: t.locationForm.tourCreateSubmitDesc },
    { target: "tour-sidebar", title: t.locationForm.tourSidebarTitle, description: t.locationForm.tourSidebarDesc },
  ];

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
      const result = await fetchApiJsonResult(`/api/teams/${teamId}/locations`, {
        method: "POST",
        body: {
          name: name.trim(),
          description: description.trim() || null,
        },
        fallbackError: t.locationForm.unexpectedError,
      });

      if (!result.ok) {
        setError(t.locationForm.unexpectedError);
        setIsLoading(false);
        return;
      }

      setSuccess(t.locationForm.createSuccess);
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
          title={t.locations.newLocation}
          backHref={`/teams/${teamId}/locations`}
          tutorialLabel={t.common.tutorial}
          onTutorialClick={() => setIsTutorialOpen(true)}
          tutorialTourId="tour-new-location-tutorial"
          success={success}
          error={error}
        >
          <LocationForm
            t={t}
            name={name}
            description={description}
            isLoading={isLoading}
            mode="create"
            cancelHref={`/teams/${teamId}/locations`}
            onSubmit={handleSubmit}
            onNameChange={setName}
            onDescriptionChange={setDescription}
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
