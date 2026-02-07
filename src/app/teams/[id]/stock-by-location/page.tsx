"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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
  Search,
  Info,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n";
import Link from "next/link";

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

export default function StockByLocationPage() {
  const router = useRouter();
  const params = useParams();
  const teamId = params?.id as string;

  const [team, setTeam] = useState<Team | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { language, setLanguage, t } = useTranslation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (teamId) {
      fetchData();
    }
  }, [teamId]);

  const fetchData = async () => {
    try {
      // Fetch team
      const teamResponse = await fetch(`/api/teams/${teamId}`);
      const teamData = await teamResponse.json();
      if (teamResponse.ok) {
        setTeam(teamData.team);
      }

      // Fetch locations
      const locationsResponse = await fetch(`/api/teams/${teamId}/locations`);
      const locationsData = await locationsResponse.json();
      if (locationsResponse.ok) {
        setLocations(locationsData.locations || []);
      }

      // Fetch items
      const itemsResponse = await fetch(`/api/teams/${teamId}/items`);
      const itemsData = await itemsResponse.json();
      if (itemsResponse.ok) {
        setItems(itemsData.items || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem("userId");
    localStorage.removeItem("userRole");
    router.push("/");
  };

  const formatPrice = (price: number | null) => {
    if (!price) return "-";
    const locale = language === "en" ? "en-US" : language === "fr" ? "fr-FR" : "pt-BR";
    const currency = language === "en" ? "USD" : language === "fr" ? "EUR" : "BRL";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency,
    }).format(price);
  };

  // Group items by location
  const getStockByLocation = (): LocationStock[] => {
    // Filter items by search query if provided
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

    // Group items by location
    const locationMap = new Map<number, LocationStock>();

    // Initialize all locations
    locations.forEach((location) => {
      locationMap.set(location.id, {
        location,
        items: [],
        totalStock: 0,
        totalItems: 0,
      });
    });

    // Add items without location to "Default Location"
    const defaultLocationStock: LocationStock = {
      location: { id: 0, name: t.stockByLocation.defaultLocation },
      items: [],
      totalStock: 0,
      totalItems: 0,
    };

    // Group items
    filteredItems.forEach((item) => {
      if (item.locationId && locationMap.has(item.locationId)) {
        const locationStock = locationMap.get(item.locationId)!;
        locationStock.items.push(item);
        locationStock.totalStock += item.currentStock || 0;
        locationStock.totalItems += 1;
      } else {
        // Item without location
        defaultLocationStock.items.push(item);
        defaultLocationStock.totalStock += item.currentStock || 0;
        defaultLocationStock.totalItems += 1;
      }
    });

    // Convert to array and filter out empty locations if no search
    const result = Array.from(locationMap.values());
    if (defaultLocationStock.items.length > 0 || searchQuery) {
      result.push(defaultLocationStock);
    }

    // Filter out locations with no items if searching
    if (searchQuery) {
      return result.filter((ls) => ls.items.length > 0);
    }

    return result;
  };

  const stockByLocation = getStockByLocation();

  const menuItems = [
    { icon: Home, label: t.menu.itemList, href: `/teams/${teamId}/items` },
    { icon: MapPin, label: t.menu.locations, href: `/teams/${teamId}/locations` },
    { icon: ArrowUp, label: t.menu.stockIn, href: `/teams/${teamId}/stock-in` },
    { icon: ArrowDown, label: t.menu.stockOut, href: `/teams/${teamId}/stock-out` },
    { icon: RotateCcw, label: t.menu.adjust, href: `/teams/${teamId}/adjust` },
    { icon: Move, label: t.menu.move, href: `/teams/${teamId}/move` },
    { icon: FileText, label: t.menu.transactions, href: `/teams/${teamId}/transactions` },
    { icon: BarChart3, label: t.menu.stockByLocation, href: `/teams/${teamId}/stock-by-location`, active: true },
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
            <h3 className="font-bold text-gray-900 text-lg">
              {team?.name || "Loading..."}
            </h3>
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
          className={`hidden lg:block bg-white min-h-[calc(100vh-73px)] border-r border-gray-200 shadow-sm relative transition-all duration-300 ${
            isSidebarCollapsed ? "w-20" : "w-64"
          }`}
        >
          <div className={`p-6 transition-all duration-300 ${isSidebarCollapsed ? "px-4" : ""}`}>
            <div className={`mb-6 pb-6 border-b border-gray-200 ${isSidebarCollapsed ? "mb-4 pb-4" : ""}`}>
              <div className={`flex items-center ${isSidebarCollapsed ? "justify-center" : "justify-between"} mb-2`}>
                {!isSidebarCollapsed ? (
                  <>
                    <h3 className="font-bold text-gray-900 text-lg truncate">
                      {team?.name || "Loading..."}
                    </h3>
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
                      {team?.name?.charAt(0).toUpperCase() || "T"}
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
          {/* Page Header */}
          <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#6B21A8] mb-1 sm:mb-2">
                {t.stockByLocation.title}
              </h1>
              <p className="text-sm sm:text-base md:text-lg text-gray-600">
                {t.stockByLocation.subtitle}
              </p>
            </div>
            <Button
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-50 h-10 sm:h-11 text-xs sm:text-sm w-full sm:w-auto touch-manipulation min-h-[40px] sm:min-h-0"
            >
              <Info className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              {t.common.tutorial}
            </Button>
          </div>

          {/* Search Bar */}
          <div className="mb-4 sm:mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
              <Input
                type="text"
                placeholder={t.stockByLocation.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 sm:pl-10 h-11 text-base border-gray-300 focus:border-[#6B21A8] focus:ring-[#6B21A8]"
              />
            </div>
          </div>

          {/* Stock by Location */}
          {isLoading ? (
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
              <p className="text-gray-500">{t.stockByLocation.loading}</p>
            </div>
          ) : stockByLocation.length === 0 ? (
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg font-medium mb-2">
                {searchQuery ? t.stockByLocation.noItemsSearch : t.stockByLocation.noLocations}
              </p>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {stockByLocation.map((locationStock) => (
                <div
                  key={locationStock.location.id}
                  className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 overflow-hidden"
                >
                  {/* Location Header */}
                  <div className="bg-gradient-to-r from-purple-50 to-purple-100 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-[#6B21A8] to-[#7C3AED] rounded-lg sm:rounded-xl flex items-center justify-center shadow-md">
                          <MapPin className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                        </div>
                        <div>
                          <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                            {locationStock.location.name}
                          </h2>
                          <div className="flex flex-wrap gap-3 sm:gap-4 mt-1">
                            <span className="text-xs sm:text-sm text-gray-600">
                              {t.stockByLocation.totalItems}: <span className="font-semibold text-gray-900">{locationStock.totalItems}</span>
                            </span>
                            <span className="text-xs sm:text-sm text-gray-600">
                              {t.stockByLocation.totalStock}: <span className="font-semibold text-gray-900">{locationStock.totalStock.toFixed(1)}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Items Table */}
                  {locationStock.items.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      {t.stockByLocation.noItems}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                              {t.stockByLocation.item}
                            </th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden sm:table-cell">
                              {t.stockByLocation.sku}
                            </th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                              {t.stockByLocation.stock}
                            </th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden md:table-cell">
                              {t.stockByLocation.price}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                          {locationStock.items.map((item) => (
                            <tr key={item.id} className="hover:bg-purple-50/50 transition-colors">
                              <td className="px-4 sm:px-6 py-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {item.name || t.items.unnamedItem}
                                </div>
                                <div className="text-xs text-gray-500 sm:hidden mt-1">
                                  {item.sku && `SKU: ${item.sku}`}
                                </div>
                              </td>
                              <td className="px-4 sm:px-6 py-4 hidden sm:table-cell">
                                <span className="text-sm text-gray-900">
                                  {item.sku || "-"}
                                </span>
                              </td>
                              <td className="px-4 sm:px-6 py-4">
                                <span className="text-sm font-semibold text-gray-900">
                                  {item.currentStock?.toFixed(1) || "0.0"}
                                </span>
                              </td>
                              <td className="px-4 sm:px-6 py-4 hidden md:table-cell">
                                <span className="text-sm text-gray-900">
                                  {formatPrice(item.price)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
