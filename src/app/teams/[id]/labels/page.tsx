import { notFound } from "next/navigation";
import { getTeamLabelsData } from "@/lib/services/team-dashboard";
import LabelsPageClient from "./_components/LabelsPageClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LabelsPage({ params }: PageProps) {
  const { id } = await params;
  const teamId = parseInt(id, 10);

  if (isNaN(teamId)) {
    notFound();
  }

  const { team, items } = await getTeamLabelsData(teamId);
  if (!team) {
    notFound();
  }

  return <LabelsPageClient initialTeam={team} initialItems={items} />;
}
