import { notFound } from "next/navigation";
import { getTeamBasicData } from "@/lib/services/team-dashboard";
import NewLocationPageClient from "./_components/NewLocationPageClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function NewLocationPage({ params }: PageProps) {
  const { id } = await params;
  const teamId = parseInt(id, 10);

  if (isNaN(teamId)) {
    notFound();
  }

  const { team } = await getTeamBasicData(teamId);
  if (!team) {
    notFound();
  }

  return <NewLocationPageClient teamId={teamId} initialTeam={team} />;
}
