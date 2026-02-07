import { StockOutPageClient } from "./_components/StockOutPageClient";
import { notFound } from "next/navigation";
import { getTeamStockOperationData } from "@/lib/services/team-dashboard";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function StockOutPage({ params }: PageProps) {
  const { id } = await params;
  const teamId = parseInt(id, 10);

  if (isNaN(teamId)) {
    notFound();
  }

  // Fetch data on the server
  const { team, locations, items } = await getTeamStockOperationData(teamId);

  if (!team) {
    notFound();
  }

  return <StockOutPageClient items={items} locations={locations} team={team} />;
}
