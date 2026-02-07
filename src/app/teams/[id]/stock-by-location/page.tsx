import { notFound } from "next/navigation";
import { getTeamStockByLocationData } from "@/lib/services/team-dashboard";
import StockByLocationPageClient from "./_components/StockByLocationPageClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function StockByLocationPage({ params }: PageProps) {
  const { id } = await params;
  const teamId = parseInt(id, 10);

  if (isNaN(teamId)) {
    notFound();
  }

  const { team, locations, items } = await getTeamStockByLocationData(teamId);
  if (!team) {
    notFound();
  }

  return (
    <StockByLocationPageClient
      initialTeam={team}
      initialLocations={locations}
      initialItems={items}
    />
  );
}
