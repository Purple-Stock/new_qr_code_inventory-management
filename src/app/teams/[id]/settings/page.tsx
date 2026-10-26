import { notFound } from "next/navigation";
import { requirePageUserId } from "@/lib/page-session";
import { getTeamBasicData } from "@/lib/services/team-dashboard";
import SettingsPageClient from "./_components/SettingsPageClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SettingsPage({ params }: PageProps) {
  const { id } = await params;
  const teamId = parseInt(id, 10);

  if (isNaN(teamId)) {
    notFound();
  }

  const requestUserId = await requirePageUserId();
  const { team } = await getTeamBasicData(teamId, {
    allowInactiveSubscription: true,
    requestUserId,
  });
  if (!team) {
    notFound();
  }

  return <SettingsPageClient teamId={teamId} initialTeam={team} />;
}
