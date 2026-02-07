import { getTeamStockTransactionsWithDetails } from "@/lib/db/stock-transactions";
import { getTeamWithStats } from "@/lib/db/teams";
import { TransactionsPageClient } from "./_components/TransactionsPageClient";
import { notFound } from "next/navigation";
import { toTransactionDto } from "@/lib/services/mappers";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ search?: string }>;
}

export default async function TransactionsPage({ params, searchParams }: PageProps) {
  const [{ id }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const teamId = parseInt(id, 10);

  if (isNaN(teamId)) {
    notFound();
  }

  // Fetch data on the server
  const [team, transactions] = await Promise.all([
    getTeamWithStats(teamId),
    getTeamStockTransactionsWithDetails(teamId, resolvedSearchParams.search),
  ]);

  if (!team) {
    notFound();
  }

  return (
    <TransactionsPageClient
      transactions={transactions.map(toTransactionDto)}
      team={team}
      initialSearchQuery={resolvedSearchParams.search || ""}
    />
  );
}
