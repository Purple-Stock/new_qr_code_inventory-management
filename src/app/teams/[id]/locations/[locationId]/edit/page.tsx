import { notFound } from "next/navigation";
import { getTeamWithStats } from "@/lib/db/teams";
import { getLocationById } from "@/lib/db/locations";
import EditLocationPageClient from "./_components/EditLocationPageClient";

interface PageProps {
  params: Promise<{ id: string; locationId: string }>;
}

export default async function EditLocationPage({ params }: PageProps) {
  const { id, locationId: locationIdParam } = await params;
  const teamId = parseInt(id, 10);
  const locationId = parseInt(locationIdParam, 10);

  if (isNaN(teamId) || isNaN(locationId)) {
    notFound();
  }

  const [team, location] = await Promise.all([
    getTeamWithStats(teamId),
    getLocationById(locationId),
  ]);

  if (!team || !location || location.teamId !== teamId) {
    notFound();
  }

  return (
    <EditLocationPageClient
      teamId={teamId}
      locationId={locationId}
      initialTeam={team}
      initialLocation={{
        name: location.name,
        description: location.description || "",
      }}
    />
  );
}
