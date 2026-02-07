"use client";

import { useEffect, useState } from "react";
import {
  ChevronDown,
  Download,
  Info,
  Package,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";
import { TutorialTour, type TourStep } from "@/components/TutorialTour";
import { useToast } from "@/components/ui/use-toast-simple";
import { TeamLayout } from "@/components/shared/TeamLayout";
import { ItemsList } from "./ItemsList";
import { ItemsSearch } from "./ItemsSearch";
import { formatPrice } from "../_utils/formatPrice";
import { downloadCsv, itemsToCsv } from "../_utils/exportItemsCsv";
import type { Item, Team } from "../_types";

interface ItemsPageClientProps {
  items: Item[];
  team: Team;
}

export function ItemsPageClient({ items, team }: ItemsPageClientProps) {
  const { toast } = useToast();
  const { language, t } = useTranslation();
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [filteredItems, setFilteredItems] = useState<Item[]>(items);
  const teamId = team.id.toString();

  const handleExportCsv = () => {
    if (filteredItems.length === 0) {
      toast({ variant: "destructive", title: t.items.exportNoItems, description: "" });
      return;
    }

    const csv = itemsToCsv(filteredItems, {
      name: t.common.name,
      sku: t.items.sku,
      barcode: t.items.csvHeaderBarcode,
      type: t.items.type,
      stock: t.items.stock,
      price: t.items.price,
      location: t.items.csvHeaderLocation,
    });
    const slug = team.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "items";
    const date = new Date().toISOString().slice(0, 10);
    downloadCsv(csv, `items-${slug}-${date}.csv`);
    toast({ variant: "success", title: t.items.exportSuccess, description: "" });
  };

  const tourSteps: TourStep[] = [
    { target: "tour-search", title: t.items.tourSearchTitle, description: t.items.tourSearchDesc },
    { target: "tour-tutorial", title: t.items.tourTutorialTitle, description: t.items.tourTutorialDesc },
    { target: "tour-categories", title: t.items.tourCategoriesTitle, description: t.items.tourCategoriesDesc },
    { target: "tour-export", title: t.items.tourExportTitle, description: t.items.tourExportDesc },
    { target: "tour-add-item", title: t.items.tourAddItemTitle, description: t.items.tourAddItemDesc },
    { target: "tour-sidebar", title: t.items.tourSidebarTitle, description: t.items.tourSidebarDesc },
    { target: "tour-list", title: t.items.tourListTitle, description: t.items.tourListDesc },
  ];

  useEffect(() => {
    setFilteredItems(items);
  }, [items]);

  return (
    <TeamLayout team={team} activeMenuItem="items">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">{t.items.title}</h1>
        <p className="text-sm sm:text-base text-gray-600">{t.items.subtitle}</p>
      </div>

      <div className="mb-4 sm:mb-6 space-y-3">
        <div data-tour="tour-search" className="w-full">
          <ItemsSearch
            items={items}
            onFilteredItemsChange={setFilteredItems}
            placeholder={t.items.searchPlaceholder}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Button
            variant="outline"
            onClick={() => setIsTutorialOpen(true)}
            data-tour="tour-tutorial"
            className="border-gray-300 text-gray-700 hover:bg-gray-50 h-10 sm:h-11 text-xs sm:text-sm flex-1 sm:flex-initial touch-manipulation min-h-[40px] sm:min-h-0"
          >
            <Info className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            {t.common.tutorial}
          </Button>
          <Button
            variant="outline"
            data-tour="tour-categories"
            className="border-gray-300 text-gray-700 hover:bg-gray-50 h-10 sm:h-11 text-xs sm:text-sm flex-1 sm:flex-initial touch-manipulation min-h-[40px] sm:min-h-0"
          >
            <span className="hidden sm:inline">{t.items.allCategories}</span>
            <span className="sm:hidden">{t.items.categories}</span>
            <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 ml-1 sm:ml-2" />
          </Button>
          <Button
            type="button"
            onClick={handleExportCsv}
            disabled={filteredItems.length === 0}
            data-tour="tour-export"
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all h-10 sm:h-11 text-xs sm:text-sm flex-1 sm:flex-initial touch-manipulation min-h-[40px] sm:min-h-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">{t.items.exportCsv}</span>
            <span className="sm:hidden">{t.items.exportCsvShort}</span>
          </Button>
          <Link
            href={`/teams/${teamId}/items/new`}
            className="flex-1 sm:flex-initial w-full sm:w-auto"
            data-tour="tour-add-item"
          >
            <Button className="bg-gradient-to-r from-[#6B21A8] to-[#7C3AED] hover:from-[#5B1A98] hover:to-[#6D28D9] text-white shadow-lg hover:shadow-xl transition-all h-10 sm:h-11 text-xs sm:text-sm w-full sm:w-auto touch-manipulation min-h-[40px] sm:min-h-0">
              <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">{t.items.addItem}</span>
              <span className="sm:hidden">{t.items.addItemShort}</span>
            </Button>
          </Link>
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div
          data-tour="tour-list"
          className="text-center py-12 sm:py-20 bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 px-4 sm:px-6"
        >
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
            <Package className="h-8 w-8 sm:h-10 sm:w-10 text-purple-600" />
          </div>
          <p className="text-gray-700 text-lg sm:text-xl font-semibold mb-2">{t.items.noItems}</p>
          <p className="text-gray-500 text-sm sm:text-base mb-4 sm:mb-6">{t.items.noItemsMessage}</p>
          <Link href={`/teams/${teamId}/items/new`}>
            <Button className="bg-gradient-to-r from-[#6B21A8] to-[#7C3AED] hover:from-[#5B1A98] hover:to-[#6D28D9] text-white shadow-lg hover:shadow-xl transition-all touch-manipulation min-h-[48px]">
              <Plus className="h-4 w-4 mr-2" />
              {t.items.addFirstItem}
            </Button>
          </Link>
        </div>
      ) : (
        <div data-tour="tour-list">
          <ItemsList items={filteredItems} teamId={teamId} formatPrice={(p) => formatPrice(p, language)} t={t} />
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
