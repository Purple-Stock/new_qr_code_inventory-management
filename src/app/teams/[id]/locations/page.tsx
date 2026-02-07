import { getTeamLocations } from "@/lib/db/locations";
import { getTeamWithStats } from "@/lib/db/teams";
import { LocationsPageClient } from "./_components/LocationsPageClient";
import { notFound } from "next/navigation";
import { toLocationDto } from "@/lib/services/mappers";

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
  const [team, locations] = await Promise.all([
    getTeamWithStats(teamId),
    getTeamLocations(teamId),
  ]);

  if (!team) {
    notFound();
  }

  return <LocationsPageClient locations={locations.map(toLocationDto)} team={team} />;
}
