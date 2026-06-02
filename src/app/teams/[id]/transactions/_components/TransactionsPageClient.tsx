"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Info, Download, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";
import Link from "next/link";
import { Label } from "@/components/ui/label";
import { TeamLayout } from "@/components/shared/TeamLayout";
import { TutorialTour, type TourStep } from "@/components/TutorialTour";
import { TransactionsList } from "./TransactionsList";
import { TransactionsSearch } from "./TransactionsSearch";
import type { CounterpartyTeamOption, TransactionWithDetails, Team } from "../_types";

interface TransactionsPageClientProps {
  transactions: TransactionWithDetails[];
  team: Team;
  initialSearchQuery?: string;
  initialCounterpartyTeamId?: string;
  initialInterTeamOnly?: boolean;
  counterpartyTeamOptions: CounterpartyTeamOption[];
  currentPage: number;
  totalPages: number;
  canDeleteTransactions: boolean;
}

export function TransactionsPageClient({
  transactions,
  team,
  initialSearchQuery = "",
  initialCounterpartyTeamId = "",
  initialInterTeamOnly = false,
  counterpartyTeamOptions,
  currentPage,
  totalPages,
  canDeleteTransactions,
}: TransactionsPageClientProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [counterpartyTeamId, setCounterpartyTeamId] = useState(initialCounterpartyTeamId);
  const [interTeamOnly, setInterTeamOnly] = useState(initialInterTeamOnly);
  const hasInitializedSearchEffect = useRef(false);
  const suppressNextSearchEffect = useRef(false);
  const teamId = team.id.toString();
  const tourSteps: TourStep[] = [
    { target: "tour-transactions-tutorial", title: t.transactions.tourTutorialTitle, description: t.transactions.tourTutorialDesc },
    { target: "tour-transactions-search", title: t.transactions.tourSearchTitle, description: t.transactions.tourSearchDesc },
    { target: "tour-transactions-stockin", title: t.transactions.tourQuickActionTitle, description: t.transactions.tourQuickActionDesc },
    { target: "tour-transactions-list", title: t.transactions.tourListTitle, description: t.transactions.tourListDesc },
    { target: "tour-sidebar", title: t.transactions.tourSidebarTitle, description: t.transactions.tourSidebarDesc },
  ];

  const handleRefresh = () => {
    router.refresh();
  };

  useEffect(() => {
    suppressNextSearchEffect.current = true;
    setSearchQuery(initialSearchQuery);
    setCounterpartyTeamId(initialCounterpartyTeamId);
    setInterTeamOnly(initialInterTeamOnly);
  }, [initialSearchQuery, initialCounterpartyTeamId, initialInterTeamOnly]);

  useEffect(() => {
    if (!hasInitializedSearchEffect.current) {
      hasInitializedSearchEffect.current = true;
      return;
    }
    if (suppressNextSearchEffect.current) {
      suppressNextSearchEffect.current = false;
      return;
    }

    const timeoutId = setTimeout(() => {
      const params = new URLSearchParams();
      if (searchQuery) {
        params.set("search", searchQuery);
      }
      if (counterpartyTeamId) {
        params.set("counterpartyTeamId", counterpartyTeamId);
      }
      if (interTeamOnly) {
        params.set("interTeamOnly", "1");
      }
      params.set("page", "1");
      router.push(`/teams/${teamId}/transactions?${params.toString()}`);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, counterpartyTeamId, interTeamOnly, router, teamId]);

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams();
    if (searchQuery) {
      params.set("search", searchQuery);
    }
    if (counterpartyTeamId) {
      params.set("counterpartyTeamId", counterpartyTeamId);
    }
    if (interTeamOnly) {
      params.set("interTeamOnly", "1");
    }
    params.set("page", page.toString());
    router.push(`/teams/${teamId}/transactions?${params.toString()}`);
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
            onClick={() => setIsTutorialOpen(true)}
            data-tour="tour-transactions-tutorial"
            className="border-gray-300 text-gray-700 hover:bg-gray-50 h-10 sm:h-11 text-xs sm:text-sm touch-manipulation min-h-[40px] sm:min-h-0"
          >
            <Info className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            {t.common.tutorial}
          </Button>
          <Link href={`/teams/${teamId}/stock-in`} data-tour="tour-transactions-stockin">
            <Button className="bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm touch-manipulation min-h-[40px] sm:min-h-0">
              <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              {t.transactions.stockIn}
            </Button>
          </Link>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-4 sm:mb-6" data-tour="tour-transactions-search">
        <TransactionsSearch
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          placeholder={t.transactions.searchPlaceholder}
        />
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="counterpartyTeamFilter" className="text-xs text-gray-600">
              {t.transactions.counterpartyTeamFilter}
            </Label>
            <select
              id="counterpartyTeamFilter"
              className="mt-1 h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm"
              value={counterpartyTeamId}
              onChange={(e) => setCounterpartyTeamId(e.target.value)}
            >
              <option value="">{t.transactions.allCounterpartyTeams}</option>
              {counterpartyTeamOptions.map((option) => (
                <option key={option.id} value={option.id.toString()}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>
          <label className="mt-6 flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={interTeamOnly}
              onChange={(e) => setInterTeamOnly(e.target.checked)}
            />
            {t.transactions.interTeamOnly}
          </label>
        </div>
      </div>

      {/* Transactions List */}
      <div data-tour="tour-transactions-list">
        <TransactionsList
          transactions={transactions}
          teamId={team.id}
          onDelete={handleRefresh}
          canDeleteTransactions={canDeleteTransactions}
          onSearchByTransferGroup={(transferGroupId) => {
            setSearchQuery(transferGroupId);
          }}
        />
      </div>
      {totalPages > 1 && (
        <div className="mt-4 sm:mt-6 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="text-xs sm:text-sm"
          >
            {t.common.back}
          </Button>
          <p className="text-xs sm:text-sm text-gray-600">
            {`${t.transactions.page} ${currentPage} ${t.transactions.of} ${totalPages}`}
          </p>
          <Button
            variant="outline"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="text-xs sm:text-sm"
          >
            {t.transactions.next}
          </Button>
        </div>
      )}
      <TutorialTour
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
        steps={tourSteps}
      />
    </TeamLayout>
  );
}
