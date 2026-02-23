import { notFound, redirect } from "next/navigation";
import { getTeamBasicData } from "@/lib/services/team-dashboard";
import { ScanPageClient } from "./_components/ScanPageClient";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ScanPage({ params }: PageProps) {
  const { id } = await params;
  const teamId = Number.parseInt(id, 10);

  if (Number.isNaN(teamId)) {
    notFound();
  }

  const { team, subscriptionRequired } = await getTeamBasicData(teamId);
  if (subscriptionRequired) {
    redirect(`/teams/${teamId}/settings?billing=required`);
  }

  if (!team) {
    notFound();
  }

  return <ScanPageClient team={team} />;
}
