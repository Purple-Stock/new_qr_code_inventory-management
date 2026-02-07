import { notFound } from "next/navigation";
import { getTeamWithStats } from "@/lib/db/teams";
import NewItemPageClient from "./_components/NewItemPageClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function NewItemPage({ params }: PageProps) {
  const { id } = await params;
  const teamId = parseInt(id, 10);

  if (isNaN(teamId)) {
    notFound();
  }

  const team = await getTeamWithStats(teamId);
  if (!team) {
    notFound();
  }

  return <NewItemPageClient teamId={teamId} initialTeam={team} />;
}
