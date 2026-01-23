"use client";

import { useState, useEffect, useRef } from "react";
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
  Printer,
  Download,
  CheckSquare,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/lib/i18n";
import { QRCodeDisplay } from "@/components/QRCodeDisplay";
import Link from "next/link";
import jsPDF from "jspdf";
import QRCode from "qrcode";

interface Item {
  id: number;
  name: string | null;
  sku: string | null;
  barcode: string | null;
  currentStock: number | null;
  price: number | null;
  locationName?: string | null;
}

interface Team {
  id: number;
  name: string;
}

export default function LabelsPage() {
  const router = useRouter();
  const params = useParams();
  const teamId = params?.id as string;

  const [team, setTeam] = useState<Team | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [labelsPerPage, setLabelsPerPage] = useState(12);
  const [labelSize, setLabelSize] = useState<"small" | "medium" | "large">("medium");
  const [includeQRCode, setIncludeQRCode] = useState(true);
  const [includeBarcode, setIncludeBarcode] = useState(true);
  const [includeItemName, setIncludeItemName] = useState(true);
  const [includeSKU, setIncludeSKU] = useState(true);
  const [includeStock, setIncludeStock] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { language, setLanguage, t } = useTranslation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const labelsRef = useRef<HTMLDivElement>(null);

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

  const toggleItemSelection = (itemId: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const selectAll = () => {
    setSelectedItems(new Set(filteredItems.map((item) => item.id)));
  };

  const deselectAll = () => {
    setSelectedItems(new Set());
  };

  const getSelectedItemsList = () => {
    return items.filter((item) => selectedItems.has(item.id));
  };

  const generatePDF = async () => {
    if (selectedItems.size === 0) {
      return;
    }

    setIsGenerating(true);
    try {
      const selectedItemsList = getSelectedItemsList();
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const availableWidth = pageWidth - 2 * margin;
      const availableHeight = pageHeight - 2 * margin;

      // Calculate label dimensions based on labelsPerPage
      let cols = 3;
      let rows = 4;
      if (labelsPerPage === 6) {
        cols = 2;
        rows = 3;
      } else if (labelsPerPage === 20) {
        cols = 4;
        rows = 5;
      } else if (labelsPerPage === 30) {
        cols = 5;
        rows = 6;
      }

      const labelWidth = availableWidth / cols;
      const labelHeight = availableHeight / rows;

      let currentPage = 0;
      let currentRow = 0;
      let currentCol = 0;

      for (let i = 0; i < selectedItemsList.length; i++) {
        const item = selectedItemsList[i];

        // Check if we need a new page
        if (currentRow >= rows) {
          pdf.addPage();
          currentPage++;
          currentRow = 0;
          currentCol = 0;
        }

        const x = margin + currentCol * labelWidth;
        const y = margin + currentRow * labelHeight;

        // Draw border
        pdf.setDrawColor(200, 200, 200);
        pdf.rect(x, y, labelWidth - 2, labelHeight - 2);

        // Calculate sizes based on labelSize
        let qrSize = 20;
        let fontSize = 8;
        if (labelSize === "small") {
          qrSize = 15;
          fontSize = 6;
        } else if (labelSize === "large") {
          qrSize = 30;
          fontSize = 10;
        }

        let currentY = y + 2;

        // Generate QR code as image
        if (includeQRCode && item.barcode) {
          try {
            const qrDataUrl = await QRCode.toDataURL(item.barcode, {
              width: qrSize * 4,
              margin: 1,
              color: {
                dark: "#000000",
                light: "#FFFFFF",
              },
            });
            pdf.addImage(qrDataUrl, "PNG", x + 2, currentY, qrSize, qrSize);
            currentY += qrSize + 2;
          } catch (error) {
            console.error("Error generating QR code:", error);
          }
        }

        // Add item name
        if (includeItemName && item.name) {
          pdf.setFontSize(fontSize);
          pdf.setTextColor(0, 0, 0);
          pdf.text(item.name.substring(0, 20), x + 2, currentY, {
            maxWidth: labelWidth - 4,
          });
          currentY += fontSize + 1;
        }

        // Add SKU
        if (includeSKU && item.sku) {
          pdf.setFontSize(fontSize - 1);
          pdf.setTextColor(100, 100, 100);
          pdf.text(`SKU: ${item.sku}`, x + 2, currentY, {
            maxWidth: labelWidth - 4,
          });
          currentY += fontSize;
        }

        // Add barcode text
        if (includeBarcode && item.barcode) {
          pdf.setFontSize(fontSize - 1);
          pdf.setTextColor(50, 50, 50);
          pdf.text(item.barcode, x + 2, currentY, {
            maxWidth: labelWidth - 4,
          });
        }

        // Add stock
        if (includeStock && item.currentStock !== null) {
          pdf.setFontSize(fontSize - 1);
          pdf.setTextColor(100, 100, 100);
          pdf.text(`Stock: ${item.currentStock}`, x + 2, currentY + fontSize, {
            maxWidth: labelWidth - 4,
          });
        }

        // Move to next position
        currentCol++;
        if (currentCol >= cols) {
          currentCol = 0;
          currentRow++;
        }
      }

      // Save PDF
      pdf.save(`labels-${team?.name || "items"}-${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setIsGenerating(false);
    }
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
    { icon: Tag, label: t.menu.labels, href: `/teams/${teamId}/labels`, active: true },
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
                {t.labels.title}
              </h1>
              <p className="text-sm sm:text-base md:text-lg text-gray-600">
                {t.labels.subtitle}
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

          {/* Settings Panel */}
          <div className="mb-4 sm:mb-6 bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">{t.labels.selectItems}</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">
                  {t.labels.labelsPerPage}
                </Label>
                <select
                  value={labelsPerPage}
                  onChange={(e) => setLabelsPerPage(parseInt(e.target.value))}
                  className="w-full h-11 text-base border border-gray-300 rounded-md px-3 focus:border-[#6B21A8] focus:ring-[#6B21A8]"
                >
                  <option value={6}>6</option>
                  <option value={12}>12</option>
                  <option value={20}>20</option>
                  <option value={30}>30</option>
                </select>
              </div>
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">
                  {t.labels.labelSize}
                </Label>
                <select
                  value={labelSize}
                  onChange={(e) => setLabelSize(e.target.value as "small" | "medium" | "large")}
                  className="w-full h-11 text-base border border-gray-300 rounded-md px-3 focus:border-[#6B21A8] focus:ring-[#6B21A8]"
                >
                  <option value="small">{t.labels.small}</option>
                  <option value="medium">{t.labels.medium}</option>
                  <option value="large">{t.labels.large}</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeQRCode}
                  onChange={(e) => setIncludeQRCode(e.target.checked)}
                  className="w-4 h-4 text-[#6B21A8] border-gray-300 rounded focus:ring-[#6B21A8]"
                />
                <span className="text-sm text-gray-700">{t.labels.includeQRCode}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeBarcode}
                  onChange={(e) => setIncludeBarcode(e.target.checked)}
                  className="w-4 h-4 text-[#6B21A8] border-gray-300 rounded focus:ring-[#6B21A8]"
                />
                <span className="text-sm text-gray-700">{t.labels.includeBarcode}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeItemName}
                  onChange={(e) => setIncludeItemName(e.target.checked)}
                  className="w-4 h-4 text-[#6B21A8] border-gray-300 rounded focus:ring-[#6B21A8]"
                />
                <span className="text-sm text-gray-700">{t.labels.includeItemName}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeSKU}
                  onChange={(e) => setIncludeSKU(e.target.checked)}
                  className="w-4 h-4 text-[#6B21A8] border-gray-300 rounded focus:ring-[#6B21A8]"
                />
                <span className="text-sm text-gray-700">{t.labels.includeSKU}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeStock}
                  onChange={(e) => setIncludeStock(e.target.checked)}
                  className="w-4 h-4 text-[#6B21A8] border-gray-300 rounded focus:ring-[#6B21A8]"
                />
                <span className="text-sm text-gray-700">{t.labels.includeStock}</span>
              </label>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mb-4 sm:mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
              <Input
                type="text"
                placeholder={t.labels.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 sm:pl-10 h-11 text-base border-gray-300 focus:border-[#6B21A8] focus:ring-[#6B21A8]"
              />
            </div>
          </div>

          {/* Selection Actions */}
          <div className="mb-4 sm:mb-6 flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={selectAll}
              className="border-gray-300 text-gray-700 hover:bg-gray-50 text-xs sm:text-sm touch-manipulation min-h-[40px] sm:min-h-0"
            >
              <CheckSquare className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              {t.labels.selectAll}
            </Button>
            <Button
              variant="outline"
              onClick={deselectAll}
              className="border-gray-300 text-gray-700 hover:bg-gray-50 text-xs sm:text-sm touch-manipulation min-h-[40px] sm:min-h-0"
            >
              <Square className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              {t.labels.deselectAll}
            </Button>
            <div className="ml-auto flex gap-2">
              <Button
                onClick={generatePDF}
                disabled={selectedItems.size === 0 || isGenerating}
                className="bg-gradient-to-r from-[#6B21A8] to-[#7C3AED] hover:from-[#7C3AED] hover:to-[#6B21A8] text-white shadow-lg hover:shadow-xl transition-all text-xs sm:text-sm touch-manipulation min-h-[40px] sm:min-h-0"
              >
                {isGenerating ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    {t.common.loading}
                  </>
                ) : (
                  <>
                    <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    {t.labels.generatePDF}
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Items List */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-12">
                      <input
                        type="checkbox"
                        checked={filteredItems.length > 0 && filteredItems.every((item) => selectedItems.has(item.id))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            selectAll();
                          } else {
                            deselectAll();
                          }
                        }}
                        className="w-4 h-4 text-[#6B21A8] border-gray-300 rounded focus:ring-[#6B21A8]"
                      />
                    </th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      {t.labels.item}
                    </th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden sm:table-cell">
                      {t.labels.sku}
                    </th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden md:table-cell">
                      {t.labels.barcode}
                    </th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden lg:table-cell">
                      {t.labels.location}
                    </th>
                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden md:table-cell">
                      {t.labels.stock}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-4 sm:px-6 py-8 text-center text-gray-500 text-sm">
                        {t.common.loading}
                      </td>
                    </tr>
                  ) : filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 sm:px-6 py-8 text-center text-gray-500 text-sm">
                        {searchQuery ? t.labels.noItemsSearch : t.labels.noItems}
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => (
                      <tr
                        key={item.id}
                        className={`hover:bg-purple-50/50 transition-colors cursor-pointer ${
                          selectedItems.has(item.id) ? "bg-purple-50" : ""
                        }`}
                        onClick={() => toggleItemSelection(item.id)}
                      >
                        <td className="px-4 sm:px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedItems.has(item.id)}
                            onChange={() => toggleItemSelection(item.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 text-[#6B21A8] border-gray-300 rounded focus:ring-[#6B21A8]"
                          />
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <div className="flex items-center gap-3">
                            {includeQRCode && item.barcode && (
                              <div className="hidden sm:block">
                                <QRCodeDisplay value={item.barcode} size={40} />
                              </div>
                            )}
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {item.name || t.items.unnamedItem}
                              </div>
                              {item.barcode && (
                                <div className="text-xs text-gray-500 sm:hidden mt-1">
                                  {t.labels.barcode}: {item.barcode}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 hidden sm:table-cell">
                          <span className="text-sm text-gray-900">{item.sku || "-"}</span>
                        </td>
                        <td className="px-4 sm:px-6 py-4 hidden md:table-cell">
                          <span className="text-sm text-gray-900 font-mono">
                            {item.barcode || "-"}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-4 hidden lg:table-cell">
                          <span className="text-sm text-gray-900">
                            {item.locationName || t.stockByLocation.defaultLocation}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-4 hidden md:table-cell">
                          <span className="text-sm font-semibold text-gray-900">
                            {item.currentStock?.toFixed(1) || "0.0"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary */}
          {selectedItems.size > 0 && (
            <div className="mt-4 sm:mt-6 bg-purple-50 rounded-xl sm:rounded-2xl border border-purple-200 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="text-sm sm:text-base font-semibold text-gray-700">
                Selected: <span className="text-[#6B21A8]">{selectedItems.size}</span> {selectedItems.size === 1 ? "item" : "items"}
              </div>
                <Button
                  onClick={generatePDF}
                  disabled={isGenerating}
                  className="bg-gradient-to-r from-[#6B21A8] to-[#7C3AED] hover:from-[#7C3AED] hover:to-[#6B21A8] text-white shadow-lg hover:shadow-xl transition-all w-full sm:w-auto touch-manipulation min-h-[48px] sm:min-h-0"
                >
                  {isGenerating ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      {t.common.loading}
                    </>
                  ) : (
                    <>
                      <Printer className="h-4 w-4 mr-2" />
                      {t.labels.generatePDF}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
