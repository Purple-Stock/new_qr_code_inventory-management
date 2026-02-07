"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { TeamLayout } from "@/components/shared/TeamLayout";
import { FormPageShell } from "@/components/shared/FormPageShell";
import { useTranslation } from "@/lib/i18n";
import { LocationForm } from "../../_components/LocationForm";

export default function EditLocationPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useParams();
  const teamId = params?.id as string;
  const locationId = params?.locationId as string;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [team, setTeam] = useState<{ id: number; name: string } | null>(null);

  useEffect(() => {
    if (teamId && locationId) {
      fetchTeamAndLocation();
    }
  }, [teamId, locationId]);

  const fetchTeamAndLocation = async () => {
    try {
      const teamResponse = await fetch(`/api/teams/${teamId}`);
      const teamData = await teamResponse.json();
      if (teamResponse.ok) {
        setTeam(teamData.team);
      }

      const locationResponse = await fetch(`/api/teams/${teamId}/locations/${locationId}`);
      const locationData = await locationResponse.json();
      if (locationResponse.ok) {
        setName(locationData.location.name);
        setDescription(locationData.location.description || "");
      } else {
        setError(t.locations.failedToLoadLocation);
      }
    } catch (fetchError) {
      console.error("Error fetching data:", fetchError);
      setError(t.locationForm.unexpectedError);
    } finally {
      setIsLoadingData(false);
    }
  };

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

      if (!response.ok) {
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

  if (isLoadingData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">{t.locationForm.loadingLocation}</p>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">{t.locationForm.loadingTeam}</p>
      </div>
    );
  }

  return (
    <TeamLayout team={team} activeMenuItem="locations">
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
