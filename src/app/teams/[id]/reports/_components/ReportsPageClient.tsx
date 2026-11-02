"use client";

import { useEffect, useMemo, useState } from "react";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n";
import { fetchApiResult } from "@/lib/api-client";
import { TeamLayout } from "@/components/shared/TeamLayout";
import { SortableHeader } from "@/components/shared/SortableHeader";
import { TablePager } from "@/components/shared/TablePager";
import { TutorialTour, type TourStep } from "@/components/TutorialTour";
import { useSortedPage } from "@/hooks/useSortedPage";
import type { ReportStats, Team } from "../_types";

const REPORT_HEADER_CLASS =
  "px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-ink-2";

interface ReportsPageClientProps {
  teamId: number;
  initialTeam: Team;
  initialStats: ReportStats;
}

export default function ReportsPageClient({
  teamId,
  initialTeam,
  initialStats,
}: ReportsPageClientProps) {
  const [team] = useState<Team>(initialTeam);
  const [stats, setStats] = useState<ReportStats>(initialStats);
  const [isLoading, setIsLoading] = useState(false);
  const { language, t } = useTranslation();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const recentGetters = useMemo(
    () => ({
      date: (transaction: ReportStats["recentTransactions"][number]) => transaction.createdAt,
      type: (transaction: ReportStats["recentTransactions"][number]) => transaction.transactionType,
      item: (transaction: ReportStats["recentTransactions"][number]) => transaction.itemName,
      quantity: (transaction: ReportStats["recentTransactions"][number]) => transaction.quantity,
    }),
    []
  );
  const topItemGetters = useMemo(
    () => ({
      name: (item: ReportStats["topItemsByValue"][number]) => item.name,
      sku: (item: ReportStats["topItemsByValue"][number]) => item.sku,
      currentStock: (item: ReportStats["topItemsByValue"][number]) => item.currentStock,
      price: (item: ReportStats["topItemsByValue"][number]) => item.price,
      value: (item: ReportStats["topItemsByValue"][number]) => item.totalValue,
    }),
    []
  );
  const locationGetters = useMemo(
    () => ({
      location: (row: ReportStats["stockByLocation"][number]) => row.locationName,
      itemCount: (row: ReportStats["stockByLocation"][number]) => row.itemCount,
      totalStock: (row: ReportStats["stockByLocation"][number]) => row.totalStock,
      totalValue: (row: ReportStats["stockByLocation"][number]) => row.totalValue,
    }),
    []
  );
  const recentTable = useSortedPage(stats.recentTransactions, recentGetters);
  const topItemsTable = useSortedPage(stats.topItemsByValue, topItemGetters);
  const locationTable = useSortedPage(stats.stockByLocation, locationGetters);
  const tourSteps: TourStep[] = [
    { target: "tour-reports-tutorial", title: t.common.tutorial, description: t.reports.subtitle },
    { target: "tour-reports-date-filter", title: t.reports.dateRange, description: t.reports.applyFilter },
    { target: "tour-reports-overview", title: t.reports.overview, description: t.reports.totalStockValue },
    { target: "tour-reports-transactions", title: t.reports.recentTransactions, description: t.reports.transactionsByType },
    { target: "tour-reports-location", title: t.reports.stockByLocation, description: t.reports.totalValue },
    { target: "tour-sidebar", title: t.items.tourSidebarTitle, description: t.items.tourSidebarDesc },
  ];

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      // Fetch report stats
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      const queryString = params.toString();
      const reportsResult = await fetchApiResult<{ stats?: ReportStats }>(
        `/api/teams/${teamId}/reports${queryString ? `?${queryString}` : ""}`,
        { fallbackError: "Failed to fetch reports" }
      );
      if (reportsResult.ok && reportsResult.data.stats) {
        setStats(reportsResult.data.stats);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    const locale = language === "en" ? "en-US" : language === "fr" ? "fr-FR" : "pt-BR";
    const currency = language === "en" ? "USD" : language === "fr" ? "EUR" : "BRL";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency,
    }).format(price);
  };

  const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat(language === "en" ? "en-US" : language === "fr" ? "fr-FR" : "pt-BR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(date));
  };

  const formatDateTime = (date: Date | string) => {
    return new Intl.DateTimeFormat(language === "en" ? "en-US" : language === "fr" ? "fr-FR" : "pt-BR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case "stock_in":
        return t.reports.stockIn;
      case "stock_out":
        return t.reports.stockOut;
      case "adjust":
        return t.reports.adjust;
      case "move":
        return t.reports.move;
      default:
        return type;
    }
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case "stock_in":
        return "bg-raised text-positive border-hairline";
      case "stock_out":
        return "bg-raised text-negative border-hairline";
      default:
        return "bg-raised text-ink-2 border-hairline";
    }
  };

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
  };

  return (
    <TeamLayout
      team={team}
      activeMenuItem="reports"
    >
      <main className="p-4 sm:p-6 md:p-8">

          {/* Header */}
          <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
            <div className="flex-1">
              <h1 className="text-[28px] font-medium leading-[1.15] text-ink mb-1 sm:mb-2">
                {t.reports.title}
              </h1>
              <p className="text-sm sm:text-base text-ink-2">{t.reports.subtitle}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsTutorialOpen(true)}
              data-tour="tour-reports-tutorial"
              className="border-hairline text-ink-2 hover:bg-raised h-10 sm:h-11 text-xs sm:text-sm w-full sm:w-auto touch-manipulation min-h-[40px] sm:min-h-0"
            >
              <Info className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              {t.common.tutorial}
            </Button>
          </div>

          {/* Date Range Filter */}
          <div data-tour="tour-reports-date-filter" className="mb-4 sm:mb-6 rounded-xl border border-hairline bg-white shadow-rest p-4 sm:p-6">
            <h2 className="text-lg font-medium text-ink mb-4">{t.reports.dateRange}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-ink-2 mb-2">
                  {t.reports.startDate}
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-2 mb-2">
                  {t.reports.endDate}
                </label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="flex items-end gap-2">
                <Button
                  onClick={clearFilters}
                  variant="outline"
                  className="flex-1 border-hairline text-ink-2 hover:bg-raised"
                >
                  {t.reports.clearFilter}
                </Button>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-ink-2">{t.reports.loading}</p>
            </div>
          ) : stats ? (
            <>
              <div data-tour="tour-reports-overview" className="mb-6">
                <div className="mb-4 rounded-xl border border-hairline bg-white p-6 shadow-rest">
                  <p className="text-sm text-ink-3">{t.reports.totalStockValue}</p>
                  <p className="mt-2 font-mono text-[40px] font-medium tabular-nums leading-none text-ink">
                    {formatPrice(stats.totalStockValue)}
                  </p>
                </div>
                <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-hairline sm:grid-cols-5">
                  {[
                    [t.reports.totalItems, stats.totalItems],
                    [t.reports.totalLocations, stats.totalLocations],
                    [t.reports.totalTransactions, stats.totalTransactions],
                    [t.reports.lowStockItems, stats.lowStockItems],
                    [t.reports.outOfStockItems, stats.outOfStockItems],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="border-b border-r border-hairline bg-white px-4 py-4 last:border-r-0 sm:border-b-0">
                      <p className="text-xs text-ink-3">{label}</p>
                      <p className="mt-1 font-mono text-xl font-medium tabular-nums text-ink">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div data-tour="tour-reports-transactions" className="mb-6 rounded-xl border border-hairline bg-white p-6 shadow-rest">
                <h2 className="mb-4 text-base font-medium text-ink">{t.reports.transactionsByType}</h2>
                <div className="space-y-3">
                  {[
                    [t.reports.stockIn, stats.transactionsByType.stock_in, "text-positive"],
                    [t.reports.stockOut, stats.transactionsByType.stock_out, "text-negative"],
                    [t.reports.adjust, stats.transactionsByType.adjust, "text-ink"],
                    [t.reports.move, stats.transactionsByType.move, "text-ink"],
                  ].map(([label, value, tone]) => (
                    <div key={String(label)} className="flex items-baseline justify-between gap-4">
                      <span className="text-sm text-ink-2">{label}</span>
                      <span className={`font-mono text-base font-medium tabular-nums ${tone}`}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Transactions */}
              <div data-tour="tour-reports-location" className="mb-4 sm:mb-6 rounded-xl border border-hairline bg-white shadow-rest p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-medium text-ink mb-4">
                  {t.reports.recentTransactions}
                </h2>
                {stats.recentTransactions.length > 0 ? (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-raised">
                          <tr>
                            <SortableHeader
                              label={t.reports.date}
                              column="date"
                              sortKey={recentTable.sort?.key}
                              sortDirection={recentTable.sort?.direction}
                              sortAscendingLabel={t.common.sortAscending}
                              sortDescendingLabel={t.common.sortDescending}
                              onSort={recentTable.onSort}
                              className={REPORT_HEADER_CLASS}
                            />
                            <SortableHeader
                              label={t.reports.type}
                              column="type"
                              sortKey={recentTable.sort?.key}
                              sortDirection={recentTable.sort?.direction}
                              sortAscendingLabel={t.common.sortAscending}
                              sortDescendingLabel={t.common.sortDescending}
                              onSort={recentTable.onSort}
                              className={REPORT_HEADER_CLASS}
                            />
                            <SortableHeader
                              label={t.reports.item}
                              column="item"
                              sortKey={recentTable.sort?.key}
                              sortDirection={recentTable.sort?.direction}
                              sortAscendingLabel={t.common.sortAscending}
                              sortDescendingLabel={t.common.sortDescending}
                              onSort={recentTable.onSort}
                              className={REPORT_HEADER_CLASS}
                            />
                            <SortableHeader
                              label={t.reports.quantity}
                              column="quantity"
                              sortKey={recentTable.sort?.key}
                              sortDirection={recentTable.sort?.direction}
                              sortAscendingLabel={t.common.sortAscending}
                              sortDescendingLabel={t.common.sortDescending}
                              onSort={recentTable.onSort}
                              className={REPORT_HEADER_CLASS}
                            />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {recentTable.paginated.items.map((transaction) => (
                            <tr key={transaction.id} className="hover:bg-raised">
                              <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-ink">
                                {formatDateTime(transaction.createdAt)}
                              </td>
                              <td className="px-3 sm:px-4 py-2 sm:py-3">
                                <span
                                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getTransactionTypeColor(
                                    transaction.transactionType
                                  )}`}
                                >
                                  {getTransactionTypeLabel(transaction.transactionType)}
                                </span>
                              </td>
                              <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-ink">
                                {transaction.itemName || "-"}
                              </td>
                              <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-ink">
                                {transaction.quantity.toFixed(1)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <TablePager
                      currentPage={recentTable.paginated.currentPage}
                      totalPages={recentTable.paginated.totalPages}
                      onPageChange={recentTable.setPage}
                      backLabel={t.common.back}
                      nextLabel={t.common.next}
                      pageLabel={t.common.page}
                      ofLabel={t.common.of}
                    />
                  </>
                ) : (
                  <p className="text-ink-3 text-center py-8">{t.reports.noData}</p>
                )}
              </div>

              {/* Top Items by Value */}
              <div className="mb-4 sm:mb-6 rounded-xl border border-hairline bg-white shadow-rest p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-medium text-ink mb-4">
                  {t.reports.topItemsByValue}
                </h2>
                {stats.topItemsByValue.length > 0 ? (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-raised">
                          <tr>
                            <SortableHeader
                              label={t.reports.item}
                              column="name"
                              sortKey={topItemsTable.sort?.key}
                              sortDirection={topItemsTable.sort?.direction}
                              sortAscendingLabel={t.common.sortAscending}
                              sortDescendingLabel={t.common.sortDescending}
                              onSort={topItemsTable.onSort}
                              className={REPORT_HEADER_CLASS}
                            />
                            <SortableHeader
                              label={t.reports.sku}
                              column="sku"
                              sortKey={topItemsTable.sort?.key}
                              sortDirection={topItemsTable.sort?.direction}
                              sortAscendingLabel={t.common.sortAscending}
                              sortDescendingLabel={t.common.sortDescending}
                              onSort={topItemsTable.onSort}
                              className={REPORT_HEADER_CLASS}
                            />
                            <SortableHeader
                              label={t.reports.currentStock}
                              column="currentStock"
                              sortKey={topItemsTable.sort?.key}
                              sortDirection={topItemsTable.sort?.direction}
                              sortAscendingLabel={t.common.sortAscending}
                              sortDescendingLabel={t.common.sortDescending}
                              onSort={topItemsTable.onSort}
                              className={REPORT_HEADER_CLASS}
                            />
                            <SortableHeader
                              label={t.reports.price}
                              column="price"
                              sortKey={topItemsTable.sort?.key}
                              sortDirection={topItemsTable.sort?.direction}
                              sortAscendingLabel={t.common.sortAscending}
                              sortDescendingLabel={t.common.sortDescending}
                              onSort={topItemsTable.onSort}
                              className={REPORT_HEADER_CLASS}
                            />
                            <SortableHeader
                              label={t.reports.value}
                              column="value"
                              sortKey={topItemsTable.sort?.key}
                              sortDirection={topItemsTable.sort?.direction}
                              sortAscendingLabel={t.common.sortAscending}
                              sortDescendingLabel={t.common.sortDescending}
                              onSort={topItemsTable.onSort}
                              className={REPORT_HEADER_CLASS}
                            />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {topItemsTable.paginated.items.map((item) => (
                            <tr key={item.id} className="hover:bg-raised">
                              <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-ink">
                                {item.name || "-"}
                              </td>
                              <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-ink-2">
                                {item.sku || "-"}
                              </td>
                              <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-ink">
                                {item.currentStock?.toFixed(1) || "0"}
                              </td>
                              <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-ink">
                                {item.price ? formatPrice(item.price) : "-"}
                              </td>
                              <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium text-ink">
                                {formatPrice(item.totalValue)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <TablePager
                      currentPage={topItemsTable.paginated.currentPage}
                      totalPages={topItemsTable.paginated.totalPages}
                      onPageChange={topItemsTable.setPage}
                      backLabel={t.common.back}
                      nextLabel={t.common.next}
                      pageLabel={t.common.page}
                      ofLabel={t.common.of}
                    />
                  </>
                ) : (
                  <p className="text-ink-3 text-center py-8">{t.reports.noData}</p>
                )}
              </div>

              {/* Stock by Location */}
              <div className="mb-4 sm:mb-6 rounded-xl border border-hairline bg-white shadow-rest p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-medium text-ink mb-4">
                  {t.reports.stockByLocation}
                </h2>
                {stats.stockByLocation.length > 0 ? (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-raised">
                          <tr>
                            <SortableHeader
                              label={t.reports.location}
                              column="location"
                              sortKey={locationTable.sort?.key}
                              sortDirection={locationTable.sort?.direction}
                              sortAscendingLabel={t.common.sortAscending}
                              sortDescendingLabel={t.common.sortDescending}
                              onSort={locationTable.onSort}
                              className={REPORT_HEADER_CLASS}
                            />
                            <SortableHeader
                              label={t.reports.itemCount}
                              column="itemCount"
                              sortKey={locationTable.sort?.key}
                              sortDirection={locationTable.sort?.direction}
                              sortAscendingLabel={t.common.sortAscending}
                              sortDescendingLabel={t.common.sortDescending}
                              onSort={locationTable.onSort}
                              className={REPORT_HEADER_CLASS}
                            />
                            <SortableHeader
                              label={t.reports.totalStock}
                              column="totalStock"
                              sortKey={locationTable.sort?.key}
                              sortDirection={locationTable.sort?.direction}
                              sortAscendingLabel={t.common.sortAscending}
                              sortDescendingLabel={t.common.sortDescending}
                              onSort={locationTable.onSort}
                              className={REPORT_HEADER_CLASS}
                            />
                            <SortableHeader
                              label={t.reports.totalValue}
                              column="totalValue"
                              sortKey={locationTable.sort?.key}
                              sortDirection={locationTable.sort?.direction}
                              sortAscendingLabel={t.common.sortAscending}
                              sortDescendingLabel={t.common.sortDescending}
                              onSort={locationTable.onSort}
                              className={REPORT_HEADER_CLASS}
                            />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {locationTable.paginated.items.map((location, index) => (
                            <tr key={location.locationId ?? index} className="hover:bg-raised">
                              <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-ink">
                                {location.locationName || t.reports.noLocation}
                              </td>
                              <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-ink">
                                {location.itemCount}
                              </td>
                              <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-ink">
                                {location.totalStock.toFixed(1)}
                              </td>
                              <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium text-ink">
                                {formatPrice(location.totalValue)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <TablePager
                      currentPage={locationTable.paginated.currentPage}
                      totalPages={locationTable.paginated.totalPages}
                      onPageChange={locationTable.setPage}
                      backLabel={t.common.back}
                      nextLabel={t.common.next}
                      pageLabel={t.common.page}
                      ofLabel={t.common.of}
                    />
                  </>
                ) : (
                  <p className="text-ink-3 text-center py-8">{t.reports.noData}</p>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-ink-2">{t.reports.noData}</p>
            </div>
          )}
          <TutorialTour
            isOpen={isTutorialOpen}
            onClose={() => setIsTutorialOpen(false)}
            steps={tourSteps}
          />
      </main>
    </TeamLayout>
  );
}
