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
  Menu,
  X,
  RefreshCw,
  TrendingUp,
  Package,
  MapPin as MapPinIcon,
  Activity,
  AlertTriangle,
  DollarSign,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n";
import Link from "next/link";
import type { ReportStats } from "@/lib/db/reports";

interface Team {
  id: number;
  name: string;
}

export default function ReportsPage() {
  const router = useRouter();
  const params = useParams();
  const teamId = params?.id as string;

  const [team, setTeam] = useState<Team | null>(null);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { language, setLanguage, t } = useTranslation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    if (teamId) {
      fetchData();
    }
  }, [teamId, startDate, endDate]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      // Fetch team
      const teamResponse = await fetch(`/api/teams/${teamId}`);
      const teamData = await teamResponse.json();
      if (teamResponse.ok) {
        setTeam(teamData.team);
      }

      // Fetch report stats
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      const queryString = params.toString();
      const reportsResponse = await fetch(`/api/teams/${teamId}/reports${queryString ? `?${queryString}` : ""}`);
      const reportsData = await reportsResponse.json();
      if (reportsResponse.ok) {
        setStats(reportsData.stats);
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
        return "bg-green-100 text-green-800 border-green-200";
      case "stock_out":
        return "bg-red-100 text-red-800 border-red-200";
      case "adjust":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "move":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
  };

  const menuItems = [
    { icon: Home, label: t.menu.itemList, href: `/teams/${teamId}/items` },
    { icon: MapPin, label: t.menu.locations, href: `/teams/${teamId}/locations` },
    { icon: ArrowUp, label: t.menu.stockIn, href: `/teams/${teamId}/stock-in` },
    { icon: ArrowDown, label: t.menu.stockOut, href: `/teams/${teamId}/stock-out` },
    { icon: RotateCcw, label: t.menu.adjust, href: `/teams/${teamId}/adjust` },
    { icon: Move, label: t.menu.move, href: `/teams/${teamId}/move` },
    { icon: FileText, label: t.menu.transactions, href: `/teams/${teamId}/transactions` },
    { icon: BarChart3, label: t.menu.stockByLocation, href: `/teams/${teamId}/stock-by-location` },
    { icon: Tag, label: t.menu.labels, href: `/teams/${teamId}/labels` },
    { icon: FileBarChart, label: t.menu.reports, href: `/teams/${teamId}/reports`, active: true },
    { icon: Settings, label: t.menu.settings, href: `/teams/${teamId}/settings` },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm px-3 sm:px-4 md:px-6 py-3 sm:py-4 flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-shrink-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-md">
            <span className="text-white text-xs sm:text-sm font-bold">PS</span>
          </div>
          <h1 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 hidden sm:block">
            PURPLE STOCK
          </h1>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-shrink-0">
          <button
            onClick={() => setLanguage("en")}
            className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors touch-manipulation min-h-[40px] sm:min-h-0 ${
              language === "en"
                ? "bg-purple-100 text-purple-700"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            EN
          </button>
          <button
            onClick={() => setLanguage("pt-BR")}
            className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors touch-manipulation min-h-[40px] sm:min-h-0 ${
              language === "pt-BR"
                ? "bg-purple-100 text-purple-700"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            PT
          </button>
          <button
            onClick={() => setLanguage("fr")}
            className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors touch-manipulation min-h-[40px] sm:min-h-0 ${
              language === "fr"
                ? "bg-purple-100 text-purple-700"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            FR
          </button>
          <button
            onClick={handleSignOut}
            className="px-2 sm:px-3 py-1 sm:py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-md text-xs sm:text-sm font-medium transition-colors touch-manipulation min-h-[40px] sm:min-h-0"
          >
            <span className="hidden sm:inline">{t.common.signOut}</span>
            <span className="sm:hidden">{t.common.signOutShort}</span>
          </button>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row">
        {/* Sidebar */}
        <aside
          className={`bg-white min-h-[calc(100vh-73px)] border-r border-gray-200 p-6 shadow-sm transition-all duration-300 ${
            isSidebarCollapsed ? "w-20" : "w-64"
          } hidden lg:block`}
        >
          <div className="flex items-center justify-between mb-6">
            {!isSidebarCollapsed && (
              <h2 className="text-lg font-bold text-gray-900">{team?.name || "Team"}</h2>
            )}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {isSidebarCollapsed ? (
                <X className="h-5 w-5 text-gray-600" />
              ) : (
                <X className="h-5 w-5 text-gray-600" />
              )}
            </button>
          </div>

          <nav className="space-y-2">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              if (item.href) {
                return (
                  <Link
                    key={index}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                      item.active
                        ? "bg-purple-100 text-purple-700 font-semibold"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {!isSidebarCollapsed && <span className="text-sm">{item.label}</span>}
                  </Link>
                );
              }
              return (
                <div
                  key={index}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-not-allowed opacity-50 ${
                    item.active ? "bg-purple-100 text-purple-700 font-semibold" : "text-gray-700"
                  }`}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {!isSidebarCollapsed && <span className="text-sm">{item.label}</span>}
                </div>
              );
            })}
          </nav>
        </aside>

        {/* Mobile Sidebar */}
        {isMobileSidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}
        <aside
          className={`fixed top-[73px] left-0 h-[calc(100vh-73px)] bg-white border-r border-gray-200 p-6 shadow-lg z-50 transition-transform duration-300 lg:hidden ${
            isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
          } w-64`}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">{team?.name || "Team"}</h2>
            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          <nav className="space-y-2">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              if (item.href) {
                return (
                  <Link
                    key={index}
                    href={item.href}
                    onClick={() => setIsMobileSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                      item.active
                        ? "bg-purple-100 text-purple-700 font-semibold"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span className="text-sm">{item.label}</span>
                  </Link>
                );
              }
              return (
                <div
                  key={index}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-not-allowed opacity-50 ${
                    item.active ? "bg-purple-100 text-purple-700 font-semibold" : "text-gray-700"
                  }`}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span className="text-sm">{item.label}</span>
                </div>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 md:p-8">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="lg:hidden mb-4 p-2 bg-white rounded-lg shadow-sm border border-gray-200"
          >
            <Menu className="h-5 w-5 text-gray-600" />
          </button>

          {/* Header */}
          <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">
                {t.reports.title}
              </h1>
              <p className="text-sm sm:text-base text-gray-600">{t.reports.subtitle}</p>
            </div>
            <Button
              onClick={fetchData}
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-50 h-10 sm:h-11 text-xs sm:text-sm w-full sm:w-auto touch-manipulation min-h-[40px] sm:min-h-0"
            >
              <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              {t.reports.refresh}
            </Button>
          </div>

          {/* Date Range Filter */}
          <div className="mb-4 sm:mb-6 bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">{t.reports.dateRange}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
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
                <label className="block text-sm font-semibold text-gray-700 mb-2">
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
                  className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  {t.reports.clearFilter}
                </Button>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-600">{t.reports.loading}</p>
            </div>
          ) : stats ? (
            <>
              {/* Overview Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm sm:text-base font-semibold text-gray-600">
                      {t.reports.totalItems}
                    </h3>
                    <Package className="h-5 w-5 sm:h-6 sm:w-6 text-purple-500" />
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.totalItems}</p>
                </div>

                <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm sm:text-base font-semibold text-gray-600">
                      {t.reports.totalLocations}
                    </h3>
                    <MapPinIcon className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                    {stats.totalLocations}
                  </p>
                </div>

                <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm sm:text-base font-semibold text-gray-600">
                      {t.reports.totalTransactions}
                    </h3>
                    <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-green-500" />
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                    {stats.totalTransactions}
                  </p>
                </div>

                <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm sm:text-base font-semibold text-gray-600">
                      {t.reports.totalStockValue}
                    </h3>
                    <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500" />
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                    {formatPrice(stats.totalStockValue)}
                  </p>
                </div>

                <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm sm:text-base font-semibold text-gray-600">
                      {t.reports.lowStockItems}
                    </h3>
                    <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500" />
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                    {stats.lowStockItems}
                  </p>
                </div>

                <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm sm:text-base font-semibold text-gray-600">
                      {t.reports.outOfStockItems}
                    </h3>
                    <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-red-500" />
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                    {stats.outOfStockItems}
                  </p>
                </div>
              </div>

              {/* Transactions by Type */}
              <div className="mb-4 sm:mb-6 bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
                  {t.reports.transactionsByType}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-700">
                      {stats.transactionsByType.stock_in}
                    </p>
                    <p className="text-sm text-green-600 mt-1">{t.reports.stockIn}</p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <p className="text-2xl font-bold text-red-700">
                      {stats.transactionsByType.stock_out}
                    </p>
                    <p className="text-sm text-red-600 mt-1">{t.reports.stockOut}</p>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <p className="text-2xl font-bold text-yellow-700">
                      {stats.transactionsByType.adjust}
                    </p>
                    <p className="text-sm text-yellow-600 mt-1">{t.reports.adjust}</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-700">
                      {stats.transactionsByType.move}
                    </p>
                    <p className="text-sm text-blue-600 mt-1">{t.reports.move}</p>
                  </div>
                </div>
              </div>

              {/* Recent Transactions */}
              <div className="mb-4 sm:mb-6 bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
                  {t.reports.recentTransactions}
                </h2>
                {stats.recentTransactions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">
                            {t.reports.date}
                          </th>
                          <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">
                            {t.reports.type}
                          </th>
                          <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">
                            {t.reports.item}
                          </th>
                          <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">
                            {t.reports.quantity}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {stats.recentTransactions.map((transaction) => (
                          <tr key={transaction.id} className="hover:bg-gray-50">
                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">
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
                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">
                              {transaction.itemName || "-"}
                            </td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">
                              {transaction.quantity.toFixed(1)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">{t.reports.noData}</p>
                )}
              </div>

              {/* Top Items by Value */}
              <div className="mb-4 sm:mb-6 bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
                  {t.reports.topItemsByValue}
                </h2>
                {stats.topItemsByValue.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">
                            {t.reports.item}
                          </th>
                          <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">
                            {t.reports.sku}
                          </th>
                          <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">
                            {t.reports.currentStock}
                          </th>
                          <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">
                            {t.reports.price}
                          </th>
                          <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">
                            {t.reports.value}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {stats.topItemsByValue.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">
                              {item.name || "-"}
                            </td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600">
                              {item.sku || "-"}
                            </td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">
                              {item.currentStock?.toFixed(1) || "0"}
                            </td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">
                              {item.price ? formatPrice(item.price) : "-"}
                            </td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-900">
                              {formatPrice(item.totalValue)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">{t.reports.noData}</p>
                )}
              </div>

              {/* Stock by Location */}
              <div className="mb-4 sm:mb-6 bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
                  {t.reports.stockByLocation}
                </h2>
                {stats.stockByLocation.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">
                            {t.reports.location}
                          </th>
                          <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">
                            {t.reports.itemCount}
                          </th>
                          <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">
                            {t.reports.totalStock}
                          </th>
                          <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">
                            {t.reports.totalValue}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {stats.stockByLocation.map((location, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">
                              {location.locationName || t.reports.noLocation}
                            </td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">
                              {location.itemCount}
                            </td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">
                              {location.totalStock.toFixed(1)}
                            </td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-900">
                              {formatPrice(location.totalValue)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">{t.reports.noData}</p>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600">{t.reports.noData}</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
