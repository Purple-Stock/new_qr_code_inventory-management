import { notFound, redirect } from "next/navigation";
import { requirePageUserId } from "@/lib/page-session";
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

  const requestUserId = await requirePageUserId();
  const { team, subscriptionRequired } = await getTeamBasicData(teamId, {
    requestUserId,
  });
  if (subscriptionRequired) {
    redirect(`/teams/${teamId}/settings?billing=required`);
  }
  if (!team) {
    notFound();
  }

  return <NewLocationPageClient teamId={teamId} initialTeam={team} />;
}
