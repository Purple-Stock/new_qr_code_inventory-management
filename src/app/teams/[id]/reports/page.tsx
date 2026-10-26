import { notFound, redirect } from "next/navigation";
import { requirePageUserId } from "@/lib/page-session";
import { getTeamReportsData } from "@/lib/services/team-dashboard";
import ReportsPageClient from "./_components/ReportsPageClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ReportsPage({ params }: PageProps) {
  const { id } = await params;
  const teamId = parseInt(id, 10);

  if (isNaN(teamId)) {
    notFound();
  }

  const requestUserId = await requirePageUserId();
  const { team, stats, subscriptionRequired } = await getTeamReportsData(
    teamId,
    undefined,
    undefined,
    { requestUserId }
  );
  if (subscriptionRequired) {
    redirect(`/teams/${teamId}/settings?billing=required`);
  }
  if (!team) {
    notFound();
  }

  return <ReportsPageClient teamId={teamId} initialTeam={team} initialStats={stats} />;
}
