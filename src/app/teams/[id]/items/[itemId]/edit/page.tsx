import { notFound } from "next/navigation";
import { getTeamWithStats } from "@/lib/db/teams";
import { getItemByIdWithLocation } from "@/lib/db/items";
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

  const [team, item] = await Promise.all([
    getTeamWithStats(teamId),
    getItemByIdWithLocation(itemId),
  ]);

  if (!team || !item || item.teamId !== teamId) {
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
      }}
    />
  );
}
