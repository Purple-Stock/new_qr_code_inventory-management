import { getTeamItems } from "@/lib/db/items";
import { getTeamLocations } from "@/lib/db/locations";
import { getTeamWithStats } from "@/lib/db/teams";
import { StockOutPageClient } from "./_components/StockOutPageClient";
import { notFound } from "next/navigation";

interface PageProps {
  params: { id: string };
}

export default async function StockOutPage({ params }: PageProps) {
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

  return <StockOutPageClient items={items} locations={locations} team={team} />;
}
