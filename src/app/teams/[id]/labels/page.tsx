import { notFound, redirect } from "next/navigation";
import { requirePageUserId } from "@/lib/page-session";
import { getTeamLabelsData } from "@/lib/services/team-dashboard";
import LabelsPageClient from "./_components/LabelsPageClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LabelsPage({ params }: PageProps) {
  const { id } = await params;
  const teamId = parseInt(id, 10);

  if (isNaN(teamId)) {
    notFound();
  }

  const requestUserId = await requirePageUserId();
  const { team, items, subscriptionRequired } = await getTeamLabelsData(
    teamId,
    { requestUserId }
  );
  if (subscriptionRequired) {
    redirect(`/teams/${teamId}/settings?billing=required`);
  }
  if (!team) {
    notFound();
  }

  return <LabelsPageClient initialTeam={team} initialItems={items} />;
}
