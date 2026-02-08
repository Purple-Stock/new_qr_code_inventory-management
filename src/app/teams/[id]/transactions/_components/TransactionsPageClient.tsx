"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Info, Download, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";
import Link from "next/link";
import { TeamLayout } from "@/components/shared/TeamLayout";
import { TransactionsList } from "./TransactionsList";
import { TransactionsSearch } from "./TransactionsSearch";
import type { TransactionWithDetails, Team } from "../_types";

interface TransactionsPageClientProps {
  transactions: TransactionWithDetails[];
  team: Team;
  initialSearchQuery?: string;
}

export function TransactionsPageClient({
  transactions,
  team,
  initialSearchQuery = "",
}: TransactionsPageClientProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [filteredTransactions, setFilteredTransactions] = useState<TransactionWithDetails[]>(transactions);
  const teamId = team.id.toString();

  const handleRefresh = () => {
    router.refresh();
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    // The search is handled server-side via the API, so we refresh
    router.push(`/teams/${teamId}/transactions${query ? `?search=${encodeURIComponent(query)}` : ""}`);
  };

  return (
    <TeamLayout team={team} activeMenuItem="transactions">
      {/* Header */}
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">
            {t.transactions.title}
          </h1>
          <p className="text-sm sm:text-base text-gray-600">{t.transactions.subtitle}</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="outline"
            className="border-gray-300 text-gray-700 hover:bg-gray-50 h-10 sm:h-11 text-xs sm:text-sm touch-manipulation min-h-[40px] sm:min-h-0"
          >
            <Info className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            {t.common.tutorial}
          </Button>
          <Link href={`/teams/${teamId}/stock-in`}>
            <Button className="bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm touch-manipulation min-h-[40px] sm:min-h-0">
              <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              {t.transactions.stockIn}
            </Button>
          </Link>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-4 sm:mb-6">
        <TransactionsSearch
          transactions={transactions}
          onFilteredTransactionsChange={setFilteredTransactions}
          onSearchChange={handleSearchChange}
          placeholder={t.transactions.searchPlaceholder}
        />
      </div>

      {/* Transactions List */}
      <TransactionsList
        transactions={filteredTransactions}
        teamId={team.id}
        onDelete={handleRefresh}
      />
    </TeamLayout>
  );
}
