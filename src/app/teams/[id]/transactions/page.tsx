import { TransactionsPageClient } from "./_components/TransactionsPageClient";
import { notFound } from "next/navigation";
import { getTeamTransactionsData } from "@/lib/services/team-dashboard";

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
  const { team, transactions } = await getTeamTransactionsData(
    teamId,
    resolvedSearchParams.search
  );

  if (!team) {
    notFound();
  }

  return (
    <TransactionsPageClient
      transactions={transactions}
      team={team}
      initialSearchQuery={resolvedSearchParams.search || ""}
    />
  );
}
