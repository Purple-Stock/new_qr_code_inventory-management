import { getTeamItems } from "@/lib/db/items";
import { getTeamWithStats } from "@/lib/db/teams";
import { ItemsPageClient } from "./_components/ItemsPageClient";
import { notFound } from "next/navigation";

interface PageProps {
  params: { id: string };
}

export default async function ItemsPage({ params }: PageProps) {
  const teamId = parseInt(params.id, 10);

  if (isNaN(teamId)) {
    notFound();
  }

  // Fetch data on the server
  const [team, items] = await Promise.all([
    getTeamWithStats(teamId),
    getTeamItems(teamId),
  ]);

  if (!team) {
    notFound();
  }

  return <ItemsPageClient items={items} team={team} />;
}
