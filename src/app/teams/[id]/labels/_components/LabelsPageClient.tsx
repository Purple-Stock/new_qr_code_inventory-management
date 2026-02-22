"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  Info,
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
import { TeamLayout } from "@/components/shared/TeamLayout";
import { TutorialTour, type TourStep } from "@/components/TutorialTour";
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
  customFields?: Record<string, string> | null;
}

interface Team {
  id: number;
  name: string;
  itemCustomFieldSchema?: { key: string; label: string; active: boolean }[] | null;
}

interface LabelsPageClientProps {
  initialTeam: Team;
  initialItems: Item[];
}

export default function LabelsPageClient({
  initialTeam,
  initialItems,
}: LabelsPageClientProps) {
  const [team] = useState<Team>(initialTeam);
  const [items] = useState<Item[]>(initialItems);
  const [isLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [labelSizeMode, setLabelSizeMode] = useState<"default" | "custom">("default");
  const [customWidthCm, setCustomWidthCm] = useState("10");
  const [customHeightCm, setCustomHeightCm] = useState("5");
  const [includeQRCode, setIncludeQRCode] = useState(true);
  const [includeBarcode, setIncludeBarcode] = useState(true);
  const [includeItemName, setIncludeItemName] = useState(true);
  const [includeSKU, setIncludeSKU] = useState(true);
  const [includeStock, setIncludeStock] = useState(false);
  const customFieldOptions = useMemo(() => {
    if (team.itemCustomFieldSchema && team.itemCustomFieldSchema.length > 0) {
      return team.itemCustomFieldSchema;
    }
    const discovered = new Set<string>();
    for (const item of items) {
      for (const key of Object.keys(item.customFields ?? {})) {
        discovered.add(key);
      }
    }
    return Array.from(discovered).map((key) => ({ key, label: key, active: true }));
  }, [items, team.itemCustomFieldSchema]);
  const customFieldLabelByKey = useMemo(
    () =>
      new Map(
        customFieldOptions.map((field) => [
          field.key,
          field.label || field.key,
        ])
      ),
    [customFieldOptions]
  );
  const [includeCustomFieldKeys, setIncludeCustomFieldKeys] = useState<Record<string, boolean>>(
    () => Object.fromEntries(customFieldOptions.map((field) => [field.key, field.active]))
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const { t } = useTranslation();
  const labelsRef = useRef<HTMLDivElement>(null);
  const tourSteps: TourStep[] = [
    { target: "tour-labels-tutorial", title: t.labels.tourTutorialTitle, description: t.labels.tourTutorialDesc },
    { target: "tour-labels-settings", title: t.labels.tourSettingsTitle, description: t.labels.tourSettingsDesc },
    { target: "tour-labels-size", title: t.labels.tourSizeTitle, description: t.labels.tourSizeDesc },
    { target: "tour-labels-search", title: t.labels.tourSearchTitle, description: t.labels.tourSearchDesc },
    { target: "tour-labels-actions", title: t.labels.tourActionsTitle, description: t.labels.tourActionsDesc },
    { target: "tour-labels-list", title: t.labels.tourListTitle, description: t.labels.tourListDesc },
    { target: "tour-sidebar", title: t.labels.tourSidebarTitle, description: t.labels.tourSidebarDesc },
  ];

  useEffect(() => {
    setIncludeCustomFieldKeys(
      Object.fromEntries(customFieldOptions.map((field) => [field.key, field.active]))
    );
  }, [customFieldOptions]);

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

  const parseCm = (value: string, fallback: number) => {
    const parsed = Number(value.replace(",", "."));
    if (!Number.isFinite(parsed)) return fallback;
    return parsed;
  };

  const getLabelDimensionsCm = () => {
    if (labelSizeMode === "default") {
      return { widthCm: 10, heightCm: 5 };
    }

    const widthCm = Math.min(Math.max(parseCm(customWidthCm, 10), 3), 18);
    const heightCm = Math.min(Math.max(parseCm(customHeightCm, 5), 2), 12);
    return { widthCm, heightCm };
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
      const { widthCm, heightCm } = getLabelDimensionsCm();
      const labelWidth = widthCm * 10;
      const labelHeight = heightCm * 10;
      const horizontalGap = 2;
      const verticalGap = 2;
      const cols = Math.max(1, Math.floor((availableWidth + horizontalGap) / (labelWidth + horizontalGap)));
      const rows = Math.max(1, Math.floor((availableHeight + verticalGap) / (labelHeight + verticalGap)));

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

        const x = margin + currentCol * (labelWidth + horizontalGap);
        const y = margin + currentRow * (labelHeight + verticalGap);

        // Draw border
        pdf.setDrawColor(200, 200, 200);
        pdf.rect(x, y, labelWidth, labelHeight);

        const qrSize = Math.max(10, Math.min(24, labelHeight * 0.42, labelWidth * 0.38));
        const fontSize = Math.max(6, Math.min(12, labelHeight * 0.09));

        let currentY = y + 3;

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
          pdf.text(item.name.substring(0, 28), x + 2, currentY, {
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
          currentY += fontSize;
        }

        // Add stock
        if (includeStock && item.currentStock !== null) {
          pdf.setFontSize(fontSize - 1);
          pdf.setTextColor(100, 100, 100);
          pdf.text(`Stock: ${item.currentStock}`, x + 2, currentY, {
            maxWidth: labelWidth - 4,
          });
          currentY += fontSize;
        }

        for (const field of customFieldOptions) {
          if (!includeCustomFieldKeys[field.key]) {
            continue;
          }

          const fieldValue = item.customFields?.[field.key];
          if (!fieldValue) {
            continue;
          }

          pdf.setFontSize(fontSize - 1);
          pdf.setTextColor(80, 80, 80);
          const fieldLabel = customFieldLabelByKey.get(field.key) ?? field.key;
          pdf.text(`${fieldLabel}: ${fieldValue}`, x + 2, currentY, {
            maxWidth: labelWidth - 4,
          });
          currentY += fontSize;
        }

        // Move to next position
        currentCol++;
        if (currentCol >= cols) {
          currentCol = 0;
          currentRow++;
        }
      }

      // Save PDF
      pdf.save(`labels-${team.name || "items"}-${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <TeamLayout
      team={team}
      activeMenuItem="labels"
    >
      <main className="p-4 sm:p-6 md:p-8">
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
              onClick={() => setIsTutorialOpen(true)}
              data-tour="tour-labels-tutorial"
              className="border-gray-300 text-gray-700 hover:bg-gray-50 h-10 sm:h-11 text-xs sm:text-sm w-full sm:w-auto touch-manipulation min-h-[40px] sm:min-h-0"
            >
              <Info className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              {t.common.tutorial}
            </Button>
          </div>

          {/* Settings Panel */}
          <div className="mb-4 sm:mb-6 bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6" data-tour="tour-labels-settings">
            <h2 className="text-lg font-bold text-gray-900 mb-4">{t.labels.selectItems}</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4" data-tour="tour-labels-size">
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">
                  {t.labels.labelSize}
                </Label>
                <select
                  value={labelSizeMode}
                  onChange={(e) => setLabelSizeMode(e.target.value as "default" | "custom")}
                  className="w-full h-11 text-base border border-gray-300 rounded-md px-3 focus:border-[#6B21A8] focus:ring-[#6B21A8]"
                >
                  <option value="default">{t.labels.default10x5}</option>
                  <option value="custom">{t.labels.customSize}</option>
                </select>
              </div>
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">
                  {t.labels.widthCm}
                </Label>
                <Input
                  type="text"
                  value={labelSizeMode === "default" ? "10" : customWidthCm}
                  onChange={(e) => setCustomWidthCm(e.target.value)}
                  disabled={labelSizeMode === "default"}
                  className="h-11 text-base border-gray-300 focus:border-[#6B21A8] focus:ring-[#6B21A8]"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">
                  {t.labels.heightCm}
                </Label>
                <Input
                  type="text"
                  value={labelSizeMode === "default" ? "5" : customHeightCm}
                  onChange={(e) => setCustomHeightCm(e.target.value)}
                  disabled={labelSizeMode === "default"}
                  className="h-11 text-base border-gray-300 focus:border-[#6B21A8] focus:ring-[#6B21A8]"
                />
              </div>
              <div className="flex items-end">
                <div className="text-xs text-gray-600">
                  {labelSizeMode === "default" ? "10 x 5 cm" : `${getLabelDimensionsCm().widthCm} x ${getLabelDimensionsCm().heightCm} cm`}
                </div>
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
              {customFieldOptions.map((field) => (
                <label key={field.key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(includeCustomFieldKeys[field.key])}
                    onChange={(e) =>
                      setIncludeCustomFieldKeys((prev) => ({
                        ...prev,
                        [field.key]: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 text-[#6B21A8] border-gray-300 rounded focus:ring-[#6B21A8]"
                  />
                  <span className="text-sm text-gray-700">
                    {t.labels.includeCustomField}: {field.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Search Bar */}
          <div className="mb-4 sm:mb-6" data-tour="tour-labels-search">
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
          <div className="mb-4 sm:mb-6 flex flex-wrap gap-2" data-tour="tour-labels-actions">
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
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 overflow-hidden" data-tour="tour-labels-list">
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
          <TutorialTour
            isOpen={isTutorialOpen}
            onClose={() => setIsTutorialOpen(false)}
            steps={tourSteps}
          />
      </main>
    </TeamLayout>
  );
}
