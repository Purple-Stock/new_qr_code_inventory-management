import { ItemsPageClient } from "./_components/ItemsPageClient";
import { notFound, redirect } from "next/navigation";
import { getTeamItemsData } from "@/lib/services/team-dashboard";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ItemsPage({ params }: PageProps) {
  const { id } = await params;
  const teamId = parseInt(id, 10);

  if (isNaN(teamId)) {
    notFound();
  }

  // Fetch data on the server
  const { team, items, subscriptionRequired } = await getTeamItemsData(teamId);

  if (subscriptionRequired) {
    redirect(`/teams/${teamId}/settings?billing=required`);
  }

  if (!team) {
    notFound();
  }

  return <ItemsPageClient items={items} team={team} />;
}
