import { AdjustPageClient } from "./_components/AdjustPageClient";
import { notFound, redirect } from "next/navigation";
import { getTeamStockOperationData } from "@/lib/services/team-dashboard";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdjustPage({ params }: PageProps) {
  const { id } = await params;
  const teamId = parseInt(id, 10);

  if (isNaN(teamId)) {
    notFound();
  }

  // Fetch data on the server
  const { team, locations, items, subscriptionRequired } = await getTeamStockOperationData(teamId);

  if (subscriptionRequired) {
    redirect(`/teams/${teamId}/settings?billing=required`);
  }

  if (!team) {
    notFound();
  }

  return <AdjustPageClient items={items} locations={locations} team={team} />;
}
