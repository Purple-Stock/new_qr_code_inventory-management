import { MovePageClient } from "./_components/MovePageClient";
import { notFound, redirect } from "next/navigation";
import { requirePageUserId } from "@/lib/page-session";
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

  const requestUserId = await requirePageUserId();
  const { team, locations, items, destinationTeams, subscriptionRequired } =
    await getTeamStockOperationData(teamId, {
      requestUserId,
      splitItemsByLedger: true,
    });

  if (subscriptionRequired) {
    redirect(`/teams/${teamId}/settings?billing=required`);
  }

  if (!team) {
    notFound();
  }

  return (
    <MovePageClient
      items={items}
      locations={locations}
      destinationTeams={destinationTeams}
      team={team}
    />
  );
}
