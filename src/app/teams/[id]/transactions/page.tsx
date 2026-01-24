import { getTeamStockTransactionsWithDetails } from "@/lib/db/stock-transactions";
import { getTeamWithStats } from "@/lib/db/teams";
import { TransactionsPageClient } from "./_components/TransactionsPageClient";
import { notFound } from "next/navigation";

interface PageProps {
  params: { id: string };
  searchParams: { search?: string };
}

export default async function TransactionsPage({ params, searchParams }: PageProps) {
  const teamId = parseInt(params.id, 10);

  if (isNaN(teamId)) {
    notFound();
  }

  // Fetch data on the server
  const [team, transactions] = await Promise.all([
    getTeamWithStats(teamId),
    getTeamStockTransactionsWithDetails(teamId, searchParams.search),
  ]);

  if (!team) {
    notFound();
  }

  return (
    <TransactionsPageClient
      transactions={transactions}
      team={team}
      initialSearchQuery={searchParams.search || ""}
    />
  );
}
