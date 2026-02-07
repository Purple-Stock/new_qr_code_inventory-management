import { MovePageClient } from "./_components/MovePageClient";
import { notFound, redirect } from "next/navigation";
import { getTeamStockOperationData } from "@/lib/services/team-dashboard";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MovePage({ params }: PageProps) {
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

  return <MovePageClient items={items} locations={locations} team={team} />;
}
