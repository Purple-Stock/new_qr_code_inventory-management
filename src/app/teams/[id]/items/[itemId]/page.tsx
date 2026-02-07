import { notFound, redirect } from "next/navigation";
import { getItemDetailsData } from "@/lib/services/team-dashboard";
import ItemDetailPageClient from "./_components/ItemDetailPageClient";

interface PageProps {
  params: Promise<{ id: string; itemId: string }>;
}

export default async function ItemDetailPage({ params }: PageProps) {
  const { id, itemId: itemIdParam } = await params;
  const teamId = parseInt(id, 10);
  const itemId = parseInt(itemIdParam, 10);

  if (isNaN(teamId) || isNaN(itemId)) {
    notFound();
  }

  const { item, transactions, subscriptionRequired } = await getItemDetailsData(teamId, itemId);
  if (subscriptionRequired) {
    redirect(`/teams/${teamId}/settings?billing=required`);
  }
  if (!item) {
    notFound();
  }

  return (
    <ItemDetailPageClient
      teamId={teamId}
      itemId={itemId}
      initialItem={item}
      initialTransactions={transactions}
    />
  );
}
