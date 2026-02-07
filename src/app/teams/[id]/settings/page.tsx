import { notFound } from "next/navigation";
import { getTeamWithStats } from "@/lib/db/teams";
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

  const team = await getTeamWithStats(teamId);
  if (!team) {
    notFound();
  }

  return <SettingsPageClient teamId={teamId} initialTeam={team} />;
}
