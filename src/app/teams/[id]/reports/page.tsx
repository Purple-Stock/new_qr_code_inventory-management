import { notFound } from "next/navigation";
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

  const { team, stats } = await getTeamReportsData(teamId);
  if (!team) {
    notFound();
  }

  return <ReportsPageClient teamId={teamId} initialTeam={team} initialStats={stats} />;
}
