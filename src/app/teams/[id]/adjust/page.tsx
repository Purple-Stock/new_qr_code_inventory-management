import { getTeamItems } from "@/lib/db/items";
import { getTeamLocations } from "@/lib/db/locations";
import { getTeamWithStats } from "@/lib/db/teams";
import { AdjustPageClient } from "./_components/AdjustPageClient";
import { notFound } from "next/navigation";

interface PageProps {
  params: { id: string };
}

export default async function AdjustPage({ params }: PageProps) {
  const teamId = parseInt(params.id, 10);

  if (isNaN(teamId)) {
    notFound();
  }

  // Fetch data on the server
  const [team, locations, items] = await Promise.all([
    getTeamWithStats(teamId),
    getTeamLocations(teamId),
    getTeamItems(teamId),
  ]);

  if (!team) {
    notFound();
  }

  return <AdjustPageClient items={items} locations={locations} team={team} />;
}
