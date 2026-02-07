import { notFound, redirect } from "next/navigation";
import { getTeamLocationEditData } from "@/lib/services/team-dashboard";
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

  const { team, location, subscriptionRequired } = await getTeamLocationEditData(teamId, locationId);

  if (subscriptionRequired) {
    redirect(`/teams/${teamId}/settings?billing=required`);
  }

  if (!team || !location) {
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
