"use client";

import { useMemo, useState } from "react";
import { Info, MapPin, Package, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n";
import { TeamLayout } from "@/components/shared/TeamLayout";
import { SortableHeader } from "@/components/shared/SortableHeader";
import { TablePager } from "@/components/shared/TablePager";
import { TutorialTour, type TourStep } from "@/components/TutorialTour";
import { useSortedPage } from "@/hooks/useSortedPage";

interface Item {
  id: number;
  name: string | null;
  sku: string | null;
  barcode: string | null;
  currentStock: number | null;
  price: number | null;
  locationId: number | null;
  locationName?: string | null;
}

interface Location {
  id: number;
  name: string;
}

interface Team {
  id: number;
  name: string;
}

interface LocationStock {
  location: Location;
  items: Item[];
  totalStock: number;
  totalItems: number;
}

interface StockByLocationPageClientProps {
  initialTeam: Team;
  initialLocations: Location[];
  initialItems: Item[];
}

const LOCATION_ITEM_HEADER_CLASS =
  "px-4 sm:px-6 py-3 text-left text-xs font-medium text-ink-3";

function LocationItemsTable({
  items,
  t,
  formatPrice,
}: {
  items: Item[];
  t: ReturnType<typeof useTranslation>["t"];
  formatPrice: (price: number | null) => string;
}) {
  const getters = useMemo(
    () => ({
      name: (item: Item) => item.name,
      sku: (item: Item) => item.sku,
      stock: (item: Item) => item.currentStock,
      price: (item: Item) => item.price,
    }),
    []
  );
  const { sort, onSort, setPage, paginated } = useSortedPage(items, getters);

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-raised border-b border-hairline">
            <tr>
              <SortableHeader
                label={t.stockByLocation.item}
                column="name"
                sortKey={sort?.key}
                sortDirection={sort?.direction}
                sortAscendingLabel={t.common.sortAscending}
                sortDescendingLabel={t.common.sortDescending}
                onSort={onSort}
                className={LOCATION_ITEM_HEADER_CLASS}
              />
              <SortableHeader
                label={t.stockByLocation.sku}
                column="sku"
                sortKey={sort?.key}
                sortDirection={sort?.direction}
                sortAscendingLabel={t.common.sortAscending}
                sortDescendingLabel={t.common.sortDescending}
                onSort={onSort}
                className={`${LOCATION_ITEM_HEADER_CLASS} hidden sm:table-cell`}
              />
              <SortableHeader
                label={t.stockByLocation.stock}
                column="stock"
                sortKey={sort?.key}
                sortDirection={sort?.direction}
                sortAscendingLabel={t.common.sortAscending}
                sortDescendingLabel={t.common.sortDescending}
                onSort={onSort}
                className={LOCATION_ITEM_HEADER_CLASS}
              />
              <SortableHeader
                label={t.stockByLocation.price}
                column="price"
                sortKey={sort?.key}
                sortDirection={sort?.direction}
                sortAscendingLabel={t.common.sortAscending}
                sortDescendingLabel={t.common.sortDescending}
                onSort={onSort}
                className={`${LOCATION_ITEM_HEADER_CLASS} hidden md:table-cell`}
              />
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {paginated.items.map((item) => (
              <tr
                key={`${item.locationId ?? "none"}-${item.id}`}
                className="hover:bg-raised transition-colors"
              >
                <td className="px-4 sm:px-6 py-4">
                  <div className="text-sm font-medium text-ink">
                    {item.name || t.items.unnamedItem}
                  </div>
                  <div className="text-xs text-ink-3 sm:hidden mt-1">
                    {item.sku && `SKU: ${item.sku}`}
                  </div>
                </td>
                <td className="px-4 sm:px-6 py-4 text-sm text-ink-2 hidden sm:table-cell">
                  {item.sku || "-"}
                </td>
                <td className="px-4 sm:px-6 py-4">
                  <span className="font-mono tabular-nums text-sm font-medium text-ink">
                    {item.currentStock || 0}
                  </span>
                </td>
                <td className="px-4 sm:px-6 py-4 text-sm text-ink-2 hidden md:table-cell">
                  {formatPrice(item.price)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-4 sm:px-6 pb-4">
        <TablePager
          currentPage={paginated.currentPage}
          totalPages={paginated.totalPages}
          onPageChange={setPage}
          backLabel={t.common.back}
          nextLabel={t.common.next}
          pageLabel={t.common.page}
          ofLabel={t.common.of}
        />
      </div>
    </>
  );
}

export default function StockByLocationPageClient({
  initialTeam,
  initialLocations,
  initialItems,
}: StockByLocationPageClientProps) {
  const [team] = useState<Team>(initialTeam);
  const [locations] = useState<Location[]>(initialLocations);
  const [items] = useState<Item[]>(initialItems);
  const [isLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { language, t } = useTranslation();
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const tourSteps: TourStep[] = [
    { target: "tour-stock-by-location-tutorial", title: t.stockByLocation.tourTutorialTitle, description: t.stockByLocation.tourTutorialDesc },
    { target: "tour-stock-by-location-search", title: t.stockByLocation.tourSearchTitle, description: t.stockByLocation.tourSearchDesc },
    { target: "tour-stock-by-location-list", title: t.stockByLocation.tourListTitle, description: t.stockByLocation.tourListDesc },
    { target: "tour-sidebar", title: t.stockByLocation.tourSidebarTitle, description: t.stockByLocation.tourSidebarDesc },
  ];

  const formatPrice = (price: number | null) => {
    if (!price) return "-";
    const locale = language === "en" ? "en-US" : language === "fr" ? "fr-FR" : "pt-BR";
    const currency = language === "en" ? "USD" : language === "fr" ? "EUR" : "BRL";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    }).format(price);
  };

  const getStockByLocation = (): LocationStock[] => {
    let filteredItems = items;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredItems = items.filter(
        (item) =>
          item.name?.toLowerCase().includes(query) ||
          item.sku?.toLowerCase().includes(query) ||
          item.barcode?.toLowerCase().includes(query) ||
          item.locationName?.toLowerCase().includes(query)
      );
    }

    const locationMap = new Map<number, LocationStock>();

    locations.forEach((location) => {
      locationMap.set(location.id, {
        location,
        items: [],
        totalStock: 0,
        totalItems: 0,
      });
    });

    const defaultLocationStock: LocationStock = {
      location: { id: 0, name: t.stockByLocation.defaultLocation },
      items: [],
      totalStock: 0,
      totalItems: 0,
    };

    filteredItems.forEach((item) => {
      if (item.locationId && locationMap.has(item.locationId)) {
        const locationStock = locationMap.get(item.locationId)!;
        locationStock.items.push(item);
        locationStock.totalStock += item.currentStock || 0;
        locationStock.totalItems += 1;
      } else {
        defaultLocationStock.items.push(item);
        defaultLocationStock.totalStock += item.currentStock || 0;
        defaultLocationStock.totalItems += 1;
      }
    });

    const result = Array.from(locationMap.values());
    if (defaultLocationStock.items.length > 0 || searchQuery) {
      result.push(defaultLocationStock);
    }

    if (searchQuery) {
      return result.filter((ls) => ls.items.length > 0);
    }

    return result;
  };

  const stockByLocation = getStockByLocation();

  return (
    <TeamLayout team={team} activeMenuItem="stock-by-location">
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
        <div className="flex-1">
          <h1 className="text-[28px] font-medium leading-[1.15] text-ink mb-1 sm:mb-2">
            {t.stockByLocation.title}
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-ink-2">
            {t.stockByLocation.subtitle}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setIsTutorialOpen(true)}
          data-tour="tour-stock-by-location-tutorial"
          className="border-hairline text-ink-2 hover:bg-raised h-10 sm:h-11 text-xs sm:text-sm w-full sm:w-auto touch-manipulation min-h-[40px] sm:min-h-0"
        >
          <Info className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          {t.common.tutorial}
        </Button>
      </div>

      <div className="mb-4 sm:mb-6" data-tour="tour-stock-by-location-search">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-ink-3" />
          <Input
            type="text"
            placeholder={t.stockByLocation.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 sm:pl-10 h-11 text-base border-hairline focus:border-brand focus:ring-brand"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-hairline bg-white shadow-rest p-8 text-center">
          <p className="text-ink-3">{t.stockByLocation.loading}</p>
        </div>
      ) : stockByLocation.length === 0 ? (
        <div className="rounded-xl border border-hairline bg-white shadow-rest p-8 text-center">
          <Package className="h-12 w-12 text-ink-3 mx-auto mb-4" />
          <p className="text-ink-3 text-lg font-medium mb-2">
            {searchQuery ? t.stockByLocation.noItemsSearch : t.stockByLocation.noLocations}
          </p>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6" data-tour="tour-stock-by-location-list">
          {stockByLocation.map((locationStock) => (
            <div
              key={locationStock.location.id}
              className="rounded-xl border border-hairline bg-white shadow-rest overflow-hidden"
            >
              <div className="border-b border-hairline bg-raised px-4 py-3 sm:px-6 sm:py-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white sm:h-12 sm:w-12">
                      <MapPin className="h-5 w-5 text-ink-3 sm:h-6 sm:w-6" />
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-medium text-ink">
                        {locationStock.location.name}
                      </h2>
                      <div className="flex flex-wrap gap-3 sm:gap-4 mt-1">
                        <span className="text-xs sm:text-sm text-ink-2">
                          {t.stockByLocation.totalItems}:{" "}
                          <span className="font-medium text-ink">{locationStock.totalItems}</span>
                        </span>
                        <span className="text-xs sm:text-sm text-ink-2">
                          {t.stockByLocation.totalStock}:{" "}
                          <span className="font-medium text-ink">{locationStock.totalStock.toFixed(1)}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {locationStock.items.length === 0 ? (
                <div className="p-8 text-center text-ink-3">
                  {t.stockByLocation.noItems}
                </div>
              ) : (
                <LocationItemsTable
                  items={locationStock.items}
                  t={t}
                  formatPrice={formatPrice}
                />
              )}
            </div>
          ))}
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
