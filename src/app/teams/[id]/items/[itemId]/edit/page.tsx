import { notFound, redirect } from "next/navigation";
import { getTeamItemEditData } from "@/lib/services/team-dashboard";
import EditItemPageClient from "./_components/EditItemPageClient";

interface PageProps {
  params: Promise<{ id: string; itemId: string }>;
}

export default async function EditItemPage({ params }: PageProps) {
  const { id, itemId: itemIdParam } = await params;
  const teamId = parseInt(id, 10);
  const itemId = parseInt(itemIdParam, 10);

  if (isNaN(teamId) || isNaN(itemId)) {
    notFound();
  }

  const { team, item, subscriptionRequired } = await getTeamItemEditData(teamId, itemId);

  if (subscriptionRequired) {
    redirect(`/teams/${teamId}/settings?billing=required`);
  }

  if (!team || !item) {
    notFound();
  }

  return (
    <EditItemPageClient
      teamId={teamId}
      itemId={itemId}
      initialTeam={team}
      initialForm={{
        name: item.name ?? "",
        sku: item.sku ?? "",
        barcode: item.barcode ?? "",
        cost: item.cost != null ? String(item.cost) : "",
        price: item.price != null ? String(item.price) : "",
        itemType: item.itemType ?? "",
        brand: item.brand ?? "",
        photoData: item.photoData ?? "",
      }}
    />
  );
}
