import { notFound, redirect } from "next/navigation";
import { getTeamBasicData } from "@/lib/services/team-dashboard";
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

  const { team, subscriptionRequired } = await getTeamBasicData(teamId);
  if (subscriptionRequired) {
    redirect(`/teams/${teamId}/settings?billing=required`);
  }
  if (!team) {
    notFound();
  }

  return <NewItemPageClient teamId={teamId} initialTeam={team} />;
}
