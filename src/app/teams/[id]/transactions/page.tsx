import { TransactionsPageClient } from "./_components/TransactionsPageClient";
import { notFound, redirect } from "next/navigation";
import { getTeamTransactionsData } from "@/lib/services/team-dashboard";
import { paginateTransactions } from "./_utils/pagination";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    search?: string;
    page?: string;
    counterpartyTeamId?: string;
    interTeamOnly?: string;
  }>;
}

export default async function TransactionsPage({ params, searchParams }: PageProps) {
  const [{ id }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const teamId = parseInt(id, 10);

  if (isNaN(teamId)) {
    notFound();
  }

  // Fetch data on the server
  const { team, transactions, subscriptionRequired } = await getTeamTransactionsData(
    teamId,
    resolvedSearchParams.search
  );

  if (subscriptionRequired) {
    redirect(`/teams/${teamId}/settings?billing=required`);
  }

  if (!team) {
    notFound();
  }

  const selectedCounterpartyTeamId = Number.parseInt(
    resolvedSearchParams.counterpartyTeamId || "",
    10
  );
  const interTeamOnly = resolvedSearchParams.interTeamOnly === "1";

  const filteredTransactions = transactions.filter((transaction) => {
    if (interTeamOnly && transaction.destinationKind !== "team") {
      return false;
    }

    if (
      Number.isFinite(selectedCounterpartyTeamId) &&
      selectedCounterpartyTeamId > 0 &&
      transaction.counterpartyTeam?.id !== selectedCounterpartyTeamId
    ) {
      return false;
    }

    return true;
  });

  const counterpartyTeamOptions = Array.from(
    new Map(
      transactions
        .filter((transaction) => transaction.counterpartyTeam?.id && transaction.counterpartyTeam?.name)
        .map((transaction) => [
          transaction.counterpartyTeam!.id,
          {
            id: transaction.counterpartyTeam!.id,
            name: transaction.counterpartyTeam!.name,
          },
        ])
    ).values()
  );

  const paginated = paginateTransactions(filteredTransactions, resolvedSearchParams.page);

  return (
    <TransactionsPageClient
      transactions={paginated.items}
      team={team}
      initialSearchQuery={resolvedSearchParams.search || ""}
      initialCounterpartyTeamId={
        Number.isFinite(selectedCounterpartyTeamId) && selectedCounterpartyTeamId > 0
          ? selectedCounterpartyTeamId.toString()
          : ""
      }
      initialInterTeamOnly={interTeamOnly}
      counterpartyTeamOptions={counterpartyTeamOptions}
      currentPage={paginated.currentPage}
      totalPages={paginated.totalPages}
    />
  );
}
