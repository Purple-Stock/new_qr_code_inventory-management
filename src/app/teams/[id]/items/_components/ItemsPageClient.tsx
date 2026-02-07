"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Home,
  MapPin,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Move,
  FileText,
  BarChart3,
  Tag,
  FileBarChart,
  Settings,
  LogOut,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info,
  Download,
  Plus,
  Menu,
  X,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";
import Link from "next/link";
import { TutorialTour, type TourStep } from "@/components/TutorialTour";
import { useToast } from "@/components/ui/use-toast-simple";
import { ItemsList } from "./ItemsList";
import { ItemsSearch } from "./ItemsSearch";
import { formatPrice } from "../_utils/formatPrice";
import { itemsToCsv, downloadCsv } from "../_utils/exportItemsCsv";
import type { Item, Team } from "../_types";

interface ItemsPageClientProps {
  items: Item[];
  team: Team;
}

export function ItemsPageClient({ items, team }: ItemsPageClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { language, setLanguage, t } = useTranslation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
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

  const handleSignOut = () => {
    localStorage.removeItem("userId");
    localStorage.removeItem("userRole");
    router.push("/");
  };

  const menuItems = [
    { icon: Home, label: t.menu.itemList, href: `/teams/${teamId}/items`, active: true },
    { icon: MapPin, label: t.menu.locations, href: `/teams/${teamId}/locations` },
    { icon: ArrowUp, label: t.menu.stockIn, href: `/teams/${teamId}/stock-in` },
    { icon: ArrowDown, label: t.menu.stockOut, href: `/teams/${teamId}/stock-out` },
    { icon: RotateCcw, label: t.menu.adjust, href: `/teams/${teamId}/adjust` },
    { icon: Move, label: t.menu.move, href: `/teams/${teamId}/move` },
    { icon: FileText, label: t.menu.transactions, href: `/teams/${teamId}/transactions` },
    { icon: BarChart3, label: t.menu.stockByLocation, href: `/teams/${teamId}/stock-by-location` },
    { icon: Tag, label: t.menu.labels, href: `/teams/${teamId}/labels` },
    { icon: FileBarChart, label: t.menu.reports, href: `/teams/${teamId}/reports` },
    { icon: Settings, label: t.menu.settings, href: `/teams/${teamId}/settings` },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm px-3 sm:px-4 md:px-6 py-3 sm:py-4 flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="lg:hidden p-2 text-gray-700 hover:text-[#6B21A8] hover:bg-purple-50 rounded-lg transition-all touch-manipulation"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-[#6B21A8] to-[#7C3AED] rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
            <svg
              className="w-6 h-6 sm:w-7 sm:h-7 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <span className="font-bold text-base sm:text-lg md:text-xl text-gray-900 tracking-tight truncate">
            PURPLE STOCK
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-shrink-0">
          <div className="flex items-center gap-0.5 sm:gap-1 bg-gray-100 rounded-lg p-0.5 sm:p-1">
            <button
              onClick={() => setLanguage("en")}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm rounded-md transition-all touch-manipulation min-h-[36px] sm:min-h-0 ${
                language === "en"
                  ? "bg-white text-[#6B21A8] font-semibold shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage("pt-BR")}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm rounded-md transition-all touch-manipulation min-h-[36px] sm:min-h-0 ${
                language === "pt-BR"
                  ? "bg-white text-[#6B21A8] font-semibold shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              PT
            </button>
            <button
              onClick={() => setLanguage("fr")}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm rounded-md transition-all touch-manipulation min-h-[36px] sm:min-h-0 ${
                language === "fr"
                  ? "bg-white text-[#6B21A8] font-semibold shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              FR
            </button>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 text-gray-700 hover:text-[#6B21A8] hover:bg-purple-50 rounded-lg transition-all font-medium text-xs sm:text-sm touch-manipulation min-h-[36px] sm:min-h-0"
          >
            <span className="hidden sm:inline">{t.common.signOut}</span>
            <span className="sm:hidden">{t.common.signOutShort}</span>
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white shadow-2xl z-50 lg:hidden transform transition-transform duration-300 ease-in-out ${
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-6 h-full overflow-y-auto">
          <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-200">
            <h3 className="font-bold text-gray-900 text-lg">{team.name}</h3>
            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all touch-manipulation"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mb-6">
            <Link
              href="/team_selection"
              onClick={() => setIsMobileSidebarOpen(false)}
              className="text-sm text-[#6B21A8] hover:text-[#7C3AED] hover:underline font-medium transition-colors w-full text-left block"
            >
              {t.common.changeTeam}
            </Link>
          </div>

          <nav className="space-y-1">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = item.active || false;
              const href = item.href || "#";

              if (href !== "#") {
                return (
                  <Link
                    key={index}
                    href={href}
                    onClick={() => setIsMobileSidebarOpen(false)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? "bg-gradient-to-r from-[#6B21A8] to-[#7C3AED] text-white shadow-md"
                        : "text-gray-700 hover:bg-purple-50 hover:text-[#6B21A8]"
                    }`}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              }

              return (
                <button
                  key={index}
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-[#6B21A8] to-[#7C3AED] text-white shadow-md"
                      : "text-gray-700 hover:bg-purple-50 hover:text-[#6B21A8]"
                  }`}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      <div className="flex flex-col lg:flex-row">
        {/* Desktop Sidebar */}
        <aside
          data-tour="tour-sidebar"
          className={`hidden lg:block bg-white min-h-[calc(100vh-73px)] border-r border-gray-200 shadow-sm relative transition-all duration-300 ${
            isSidebarCollapsed ? "w-20" : "w-64"
          }`}
        >
          <div className={`p-6 transition-all duration-300 ${isSidebarCollapsed ? "px-4" : ""}`}>
            <div className={`mb-6 pb-6 border-b border-gray-200 ${isSidebarCollapsed ? "mb-4 pb-4" : ""}`}>
              <div className={`flex items-center ${isSidebarCollapsed ? "justify-center" : "justify-between"} mb-2`}>
                {!isSidebarCollapsed ? (
                  <>
                    <h3 className="font-bold text-gray-900 text-lg truncate">{team.name}</h3>
                    <Link
                      href="/team_selection"
                      className="text-xs text-[#6B21A8] hover:text-[#7C3AED] hover:underline font-medium transition-colors flex-shrink-0"
                    >
                      {t.common.changeTeam}
                    </Link>
                  </>
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-br from-[#6B21A8] to-[#7C3AED] rounded-xl flex items-center justify-center shadow-md">
                    <span className="text-white font-bold text-sm">
                      {team.name?.charAt(0).toUpperCase() || "T"}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <nav className="space-y-1">
              {menuItems.map((item, index) => {
                const Icon = item.icon;
                const isActive = item.active || false;
                const href = item.href || "#";

                if (href !== "#") {
                  return (
                    <Link
                      key={index}
                      href={href}
                      className={`w-full flex items-center ${isSidebarCollapsed ? "justify-center" : "gap-3"} px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? "bg-gradient-to-r from-[#6B21A8] to-[#7C3AED] text-white shadow-md"
                          : "text-gray-700 hover:bg-purple-50 hover:text-[#6B21A8]"
                      }`}
                      title={isSidebarCollapsed ? item.label : undefined}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      {!isSidebarCollapsed && <span>{item.label}</span>}
                    </Link>
                  );
                }

                return (
                  <button
                    key={index}
                    className={`w-full flex items-center ${isSidebarCollapsed ? "justify-center" : "gap-3"} px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? "bg-gradient-to-r from-[#6B21A8] to-[#7C3AED] text-white shadow-md"
                        : "text-gray-700 hover:bg-purple-50 hover:text-[#6B21A8]"
                    }`}
                    title={isSidebarCollapsed ? item.label : undefined}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {!isSidebarCollapsed && <span>{item.label}</span>}
                  </button>
                );
              })}
            </nav>
          </div>
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-8 h-8 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center shadow-md hover:shadow-lg hover:border-[#6B21A8] transition-all z-10 touch-manipulation"
            aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isSidebarCollapsed ? (
              <ChevronRight className="h-4 w-4 text-gray-600" />
            ) : (
              <ChevronLeft className="h-4 w-4 text-gray-600" />
            )}
          </button>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 md:p-8">
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
        </main>
      </div>

      <TutorialTour
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
        steps={tourSteps}
      />
    </div>
  );
}
