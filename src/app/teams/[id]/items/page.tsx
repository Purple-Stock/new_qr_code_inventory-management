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
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  Info,
  Download,
  Plus,
  Edit,
  Copy,
  Trash2,
  QrCode,
  Package,
  Menu,
  X,
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
  itemType: string | null;
  currentStock: number | null;
  price: number | null;
  locationName?: string | null;
}

interface Team {
  id: number;
  name: string;
  itemCount: number;
  transactionCount: number;
}

export default function ItemsPage() {
  const router = useRouter();
  const params = useParams();
  const teamId = params?.id as string;

  const [items, setItems] = useState<Item[]>([]);
  const [team, setTeam] = useState<Team | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { language, setLanguage, t } = useTranslation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (teamId) {
      fetchTeamAndItems();
    }
  }, [teamId]);

  const fetchTeamAndItems = async () => {
    try {
      // Fetch team info
      const teamResponse = await fetch(`/api/teams/${teamId}`);
      const teamData = await teamResponse.json();
      if (teamResponse.ok) {
        setTeam(teamData.team);
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
    router.push("/");
  };

  const filteredItems = items.filter((item) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.name?.toLowerCase().includes(query) ||
      item.sku?.toLowerCase().includes(query) ||
      item.barcode?.toLowerCase().includes(query)
    );
  });

  const formatPrice = (price: number | null) => {
    if (!price) return "-";
    const locale = language === "en" ? "en-US" : language === "fr" ? "fr-FR" : "pt-BR";
    const currency = language === "en" ? "USD" : language === "fr" ? "EUR" : "BRL";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency,
    }).format(price);
  };

  const menuItems = [
    { icon: Home, label: t.menu.itemList, href: `/teams/${teamId}/items`, active: true },
    { icon: MapPin, label: t.menu.locations, href: `/teams/${teamId}/locations` },
    { icon: ArrowUp, label: t.menu.stockIn, href: `/teams/${teamId}/stock-in` },
    { icon: ArrowDown, label: t.menu.stockOut },
    { icon: RotateCcw, label: t.menu.adjust },
    { icon: Move, label: t.menu.move },
    { icon: FileText, label: t.menu.transactions },
    { icon: BarChart3, label: t.menu.stockByLocation },
    { icon: Tag, label: t.menu.labels },
    { icon: FileBarChart, label: t.menu.reports },
    { icon: Settings, label: t.menu.settings },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm px-3 sm:px-4 md:px-6 py-3 sm:py-4 flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          {/* Mobile Menu Button */}
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
          <span className="font-bold text-base sm:text-lg md:text-xl text-gray-900 tracking-tight truncate">PURPLE STOCK</span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-shrink-0">
          <button className="hidden md:block text-sm text-gray-700 hover:text-[#6B21A8] transition-colors font-medium">
            {t.common.subscribe}
          </button>
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
          {/* Mobile Sidebar Header */}
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

          {/* Change Team Link */}
          <div className="mb-6">
                    <Link href="/team_selection" onClick={() => setIsMobileSidebarOpen(false)}>
                      <button className="text-sm text-[#6B21A8] hover:text-[#7C3AED] hover:underline font-medium transition-colors w-full text-left">
                        {t.common.changeTeam}
                      </button>
                    </Link>
          </div>

          {/* Navigation Menu */}
          <nav className="space-y-1">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = item.active || false;
              const href = item.href || "#";

              if (href !== "#") {
                return (
                  <Link key={index} href={href} onClick={() => setIsMobileSidebarOpen(false)}>
                    <button
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? "bg-gradient-to-r from-[#6B21A8] to-[#7C3AED] text-white shadow-md"
                          : "text-gray-700 hover:bg-purple-50 hover:text-[#6B21A8]"
                      }`}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      <span>{item.label}</span>
                    </button>
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
        <aside className={`hidden lg:block bg-white min-h-[calc(100vh-73px)] border-r border-gray-200 shadow-sm relative transition-all duration-300 ${
          isSidebarCollapsed ? "w-20" : "w-64"
        }`}>
          <div className={`p-6 transition-all duration-300 ${isSidebarCollapsed ? "px-4" : ""}`}>
            {/* Team Selection */}
            <div className={`mb-6 pb-6 border-b border-gray-200 ${isSidebarCollapsed ? "mb-4 pb-4" : ""}`}>
              <div className={`flex items-center ${isSidebarCollapsed ? "justify-center" : "justify-between"} mb-2`}>
                {!isSidebarCollapsed ? (
                  <>
                    <h3 className="font-bold text-gray-900 text-lg truncate">
                      {team?.name || "Loading..."}
                    </h3>
                    <Link href="/team_selection">
                      <button className="text-xs text-[#6B21A8] hover:text-[#7C3AED] hover:underline font-medium transition-colors flex-shrink-0">
                        {t.common.changeTeam}
                      </button>
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

            {/* Navigation Menu */}
            <nav className="space-y-1">
              {menuItems.map((item, index) => {
                const Icon = item.icon;
                const isActive = item.active || false;
                const href = item.href || "#";

                if (href !== "#") {
                  return (
                    <Link key={index} href={href}>
                      <button
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
          {/* Header Section */}
          <div className="mb-4 sm:mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">{t.items.title}</h1>
            <p className="text-sm sm:text-base text-gray-600">{t.items.subtitle}</p>
          </div>

          {/* Search and Filter Bar */}
          <div className="mb-4 sm:mb-6 space-y-3">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
              <Input
                type="text"
                placeholder={t.items.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 sm:pl-10 h-11 sm:h-11 text-base border-gray-300 focus:border-[#6B21A8] focus:ring-[#6B21A8]"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Button
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-50 h-10 sm:h-11 text-xs sm:text-sm flex-1 sm:flex-initial touch-manipulation min-h-[40px] sm:min-h-0"
              >
                <Info className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">{t.common.tutorial}</span>
                <span className="sm:hidden">{t.common.tutorial}</span>
              </Button>
              <Button
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-50 h-10 sm:h-11 text-xs sm:text-sm flex-1 sm:flex-initial touch-manipulation min-h-[40px] sm:min-h-0"
              >
                <span className="hidden sm:inline">{t.items.allCategories}</span>
                <span className="sm:hidden">{t.items.categories}</span>
                <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 ml-1 sm:ml-2" />
              </Button>
              <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all h-10 sm:h-11 text-xs sm:text-sm flex-1 sm:flex-initial touch-manipulation min-h-[40px] sm:min-h-0">
                <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">{t.items.exportCsv}</span>
                <span className="sm:hidden">{t.items.exportCsvShort}</span>
              </Button>
              <Link href={`/teams/${teamId}/items/new`} className="flex-1 sm:flex-initial w-full sm:w-auto">
                <Button className="bg-gradient-to-r from-[#6B21A8] to-[#7C3AED] hover:from-[#5B1A98] hover:to-[#6D28D9] text-white shadow-lg hover:shadow-xl transition-all h-10 sm:h-11 text-xs sm:text-sm w-full sm:w-auto touch-manipulation min-h-[40px] sm:min-h-0">
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">{t.items.addItem}</span>
                  <span className="sm:hidden">{t.items.addItemShort}</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* Items Table */}
          {isLoading ? (
            <div className="text-center py-12 sm:py-20">
              <div className="inline-block animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-4 border-[#6B21A8] border-t-transparent mb-4"></div>
              <p className="text-gray-600 text-base sm:text-lg font-medium">{t.items.loadingItems}</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 sm:py-20 bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 px-4 sm:px-6">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <Package className="h-8 w-8 sm:h-10 sm:w-10 text-purple-600" />
              </div>
              <p className="text-gray-700 text-lg sm:text-xl font-semibold mb-2">
                {searchQuery
                  ? t.items.noItemsSearch
                  : t.items.noItems}
              </p>
              <p className="text-gray-500 text-sm sm:text-base mb-4 sm:mb-6">
                {searchQuery
                  ? t.items.noItemsSearchMessage
                  : t.items.noItemsMessage}
              </p>
              <Link href={`/teams/${teamId}/items/new`}>
                <Button className="bg-gradient-to-r from-[#6B21A8] to-[#7C3AED] hover:from-[#5B1A98] hover:to-[#6D28D9] text-white shadow-lg hover:shadow-xl transition-all touch-manipulation min-h-[48px]">
                  <Plus className="h-4 w-4 mr-2" />
                  {t.items.addFirstItem}
                </Button>
              </Link>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="lg:hidden space-y-3">
                {filteredItems.map((item) => (
                  <div key={item.id} className="bg-white rounded-xl shadow-md border border-gray-100 p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-14 h-14 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
                        <QrCode className="h-7 w-7 text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-gray-900 mb-1 truncate">
                          {item.name || t.items.unnamedItem}
                        </h3>
                        {item.sku && (
                          <p className="text-xs text-gray-500 mb-1">SKU: {item.sku}</p>
                        )}
                        {item.barcode && (
                          <p className="text-xs text-gray-500 font-mono bg-gray-50 px-2 py-1 rounded inline-block">
                            {item.barcode}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                        {item.itemType || "Type"}
                      </span>
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                          (item.currentStock || 0) === 0
                            ? "bg-red-100 text-red-700"
                            : (item.currentStock || 0) < 10
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        Stock: {item.currentStock ?? 0}
                      </span>
                      <span className="text-sm font-bold text-gray-900">
                        {formatPrice(item.price)}
                      </span>
                    </div>

                    {item.locationName && (
                      <div className="text-xs text-gray-500 mb-3 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {item.locationName}
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                      <button
                        className="p-2.5 text-gray-500 hover:text-[#6B21A8] hover:bg-purple-50 rounded-lg transition-all touch-manipulation min-w-[40px] min-h-[40px] flex items-center justify-center"
                        aria-label="Edit item"
                        title="Edit item"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        className="p-2.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all touch-manipulation min-w-[40px] min-h-[40px] flex items-center justify-center"
                        aria-label="Copy item"
                        title="Copy item"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        className="p-2.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all touch-manipulation min-w-[40px] min-h-[40px] flex items-center justify-center"
                        aria-label="Delete item"
                        title="Delete item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden lg:block bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden border border-gray-100">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                      <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        {t.items.qrCode}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        {t.items.item}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        {t.items.sku}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        {t.items.type}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        {t.items.stock}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        {t.items.price}
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                        {t.common.actions}
                      </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {filteredItems.map((item) => (
                        <tr key={item.id} className="hover:bg-purple-50/50 transition-colors">
                          <td className="px-6 py-5 whitespace-nowrap">
                            <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center shadow-md">
                              <QrCode className="h-8 w-8 text-purple-600" />
                            </div>
                          </td>
                          <td className="px-6 py-5">
                          <div>
                            <div className="text-sm font-bold text-gray-900 mb-1">
                              {item.name || t.items.unnamedItem}
                            </div>
                              {item.barcode && (
                                <div className="text-xs text-gray-500 font-mono bg-gray-50 px-2 py-1 rounded inline-block">
                                  {item.barcode}
                                </div>
                              )}
                              {item.locationName && (
                                <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {item.locationName}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <span className="text-sm font-medium text-gray-900">
                              {item.sku || (
                                <span className="text-gray-400 italic">-</span>
                              )}
                            </span>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                              {item.itemType || "Type"}
                            </span>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${
                                (item.currentStock || 0) === 0
                                  ? "bg-red-100 text-red-700"
                                  : (item.currentStock || 0) < 10
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-green-100 text-green-700"
                              }`}
                            >
                              {item.currentStock ?? 0}
                            </span>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <span className="text-sm font-bold text-gray-900">
                              {formatPrice(item.price)}
                            </span>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                className="p-2.5 text-gray-500 hover:text-[#6B21A8] hover:bg-purple-50 rounded-lg transition-all"
                                aria-label="Edit item"
                                title="Edit item"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                className="p-2.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                aria-label="Copy item"
                                title="Copy item"
                              >
                                <Copy className="h-4 w-4" />
                              </button>
                              <button
                                className="p-2.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                aria-label="Delete item"
                                title="Delete item"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
