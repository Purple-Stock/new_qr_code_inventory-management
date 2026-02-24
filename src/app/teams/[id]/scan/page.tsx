import { notFound, redirect } from "next/navigation";
import { getTeamBasicData, getTeamItemsData } from "@/lib/services/team-dashboard";
import { ScanPageClient } from "./_components/ScanPageClient";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ScanPage({ params }: PageProps) {
  const LOCAL_LOOKUP_ITEM_LIMIT = 1500;
  const { id } = await params;
  const teamId = Number.parseInt(id, 10);

  if (Number.isNaN(teamId)) {
    notFound();
  }

  const { team, subscriptionRequired } = await getTeamBasicData(teamId);
  if (subscriptionRequired) {
    redirect(`/teams/${teamId}/settings?billing=required`);
  }

  if (!team) {
    notFound();
  }

  const preferServerLookup = (team.itemCount ?? 0) > LOCAL_LOOKUP_ITEM_LIMIT;
  let lookupItems: Array<{
    id: number;
    name: string | null;
    sku: string | null;
    barcode: string | null;
    currentStock: number | null;
    locationName: string | null;
    photoData: string | null;
    customFields: Record<string, string> | null;
  }> = [];

  if (!preferServerLookup) {
    const { items } = await getTeamItemsData(teamId);
    lookupItems = items.map((item) => ({
      id: item.id,
      name: item.name,
      sku: item.sku,
      barcode: item.barcode,
      currentStock: item.currentStock,
      locationName: item.locationName ?? null,
      photoData: item.photoData ?? null,
      customFields: item.customFields ?? null,
    }));
  }

  return (
    <ScanPageClient
      team={team}
      initialItems={lookupItems}
      preferServerLookup={preferServerLookup}
    />
  );
}
