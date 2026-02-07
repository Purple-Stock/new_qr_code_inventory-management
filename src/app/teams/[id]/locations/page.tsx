import { LocationsPageClient } from "./_components/LocationsPageClient";
import { notFound } from "next/navigation";
import { getTeamLocationsData } from "@/lib/services/team-dashboard";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LocationsPage({ params }: PageProps) {
  const { id } = await params;
  const teamId = parseInt(id, 10);

  if (isNaN(teamId)) {
    notFound();
  }

  // Fetch data on the server
  const { team, locations } = await getTeamLocationsData(teamId);

  if (!team) {
    notFound();
  }

  return <LocationsPageClient locations={locations} team={team} />;
}
