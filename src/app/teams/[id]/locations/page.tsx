import { getTeamLocations } from "@/lib/db/locations";
import { getTeamWithStats } from "@/lib/db/teams";
import { LocationsPageClient } from "./_components/LocationsPageClient";
import { notFound } from "next/navigation";

interface PageProps {
  params: { id: string };
}

export default async function LocationsPage({ params }: PageProps) {
  const teamId = parseInt(params.id, 10);

  if (isNaN(teamId)) {
    notFound();
  }

  // Fetch data on the server
  const [team, locations] = await Promise.all([
    getTeamWithStats(teamId),
    getTeamLocations(teamId),
  ]);

  if (!team) {
    notFound();
  }

  return <LocationsPageClient locations={locations} team={team} />;
}
