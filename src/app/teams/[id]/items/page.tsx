import { ItemsPageClient } from "./_components/ItemsPageClient";
import { notFound, redirect } from "next/navigation";
import { requirePageUserId } from "@/lib/page-session";
import { getTeamItemsData } from "@/lib/services/team-dashboard";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ItemsPage({ params }: PageProps) {
  const { id } = await params;
  const teamId = parseInt(id, 10);

  if (isNaN(teamId)) {
    notFound();
  }

  const requestUserId = await requirePageUserId();
  const { team, items, subscriptionRequired } = await getTeamItemsData(teamId, {
    requestUserId,
  });

  if (subscriptionRequired) {
    redirect(`/teams/${teamId}/settings?billing=required`);
  }

  if (!team) {
    notFound();
  }

  return <ItemsPageClient items={items} team={team} />;
}
