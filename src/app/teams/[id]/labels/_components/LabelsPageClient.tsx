"use client";

import { useEffect, useMemo, useState, useRef } from "react";
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
  companyName?: string | null;
  labelCompanyInfo?: string | null;
  labelLogoUrl?: string | null;
}

interface LabelsPageClientProps {
  initialTeam: Team;
  initialItems: Item[];
}

type LabelSizePreset =
  | "default_10x5"
  | "custom"
  | "zebra_100x150"
  | "zebra_60x40"
  | "zebra_110x64"
  | "zebra_170x64";

const LABEL_SIZE_PRESETS: Record<
  Exclude<LabelSizePreset, "custom">,
  { widthCm: number; heightCm: number; label: string; zebra: boolean }
> = {
  default_10x5: { widthCm: 10, heightCm: 5, label: "Padrão (10 x 5 cm)", zebra: false },
  zebra_100x150: { widthCm: 10, heightCm: 15, label: "Zebra 100 x 150 mm", zebra: true },
  zebra_60x40: { widthCm: 6, heightCm: 4, label: "Zebra 60 x 40 mm", zebra: true },
  zebra_110x64: { widthCm: 11, heightCm: 6.4, label: "Zebra 110 x 64 mm", zebra: true },
  zebra_170x64: { widthCm: 17, heightCm: 6.4, label: "Zebra 170 x 64 mm", zebra: true },
};

export default function LabelsPageClient({
  initialTeam,
  initialItems,
}: LabelsPageClientProps) {
  const [team] = useState<Team>(initialTeam);
  const [items] = useState<Item[]>(initialItems);
  const [isLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [labelSizePreset, setLabelSizePreset] = useState<LabelSizePreset>("zebra_100x150");
  const [customWidthCm, setCustomWidthCm] = useState("10");
  const [customHeightCm, setCustomHeightCm] = useState("5");
  const [labelQuantityByItem, setLabelQuantityByItem] = useState<Record<number, number>>({});
  const [includeQRCode, setIncludeQRCode] = useState(true);
  const [includeBarcode, setIncludeBarcode] = useState(false);
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
  const [includeCompanyInfo, setIncludeCompanyInfo] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const { t } = useTranslation();
  const labelsRef = useRef<HTMLDivElement>(null);
  const tourSteps: TourStep[] = [
    { target: "tour-labels-tutorial", title: t.labels.tourTutorialTitle, description: t.labels.tourTutorialDesc },
    { target: "tour-labels-settings", title: t.labels.tourSettingsTitle, description: t.labels.tourSettingsDesc },
    { target: "tour-labels-size", title: t.labels.tourSizeTitle, description: t.labels.tourSizeDesc },
    { target: "tour-labels-custom-fields", title: t.labels.tourCustomFieldsTitle, description: t.labels.tourCustomFieldsDesc },
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
      setLabelQuantityByItem((prev) => (prev[itemId] ? prev : { ...prev, [itemId]: 1 }));
    }
    setSelectedItems(newSelected);
  };

  const selectAll = () => {
    setLabelQuantityByItem((prev) => {
      const next = { ...prev };
      for (const item of filteredItems) {
        if (!next[item.id] || next[item.id] < 1) next[item.id] = 1;
      }
      return next;
    });
    setSelectedItems(new Set(filteredItems.map((item) => item.id)));
  };

  const deselectAll = () => {
    setSelectedItems(new Set());
  };

  const getSelectedItemsList = () => {
    return items.filter((item) => selectedItems.has(item.id));
  };

  const getItemQuantity = (itemId: number) => Math.max(1, labelQuantityByItem[itemId] ?? 1);

  const updateItemQuantity = (itemId: number, rawValue: string) => {
    const parsed = Number.parseInt(rawValue, 10);
    const normalized = Number.isFinite(parsed) ? Math.max(1, parsed) : 1;
    setLabelQuantityByItem((prev) => ({ ...prev, [itemId]: normalized }));
  };

  const parseCm = (value: string, fallback: number) => {
    const parsed = Number(value.replace(",", "."));
    if (!Number.isFinite(parsed)) return fallback;
    return parsed;
  };

  const getLabelDimensionsCm = () => {
    if (labelSizePreset !== "custom") {
      const preset = LABEL_SIZE_PRESETS[labelSizePreset];
      return { widthCm: preset.widthCm, heightCm: preset.heightCm };
    }

    const widthCm = Math.min(Math.max(parseCm(customWidthCm, 10), 3), 18);
    const heightCm = Math.min(Math.max(parseCm(customHeightCm, 5), 2), 12);
    return { widthCm, heightCm };
  };

  const resolveLogoDataUrl = async (): Promise<string | null> => {
    try {
      const apiResponse = await fetch(`/api/teams/${team.id}/labels/logo-data`);
      if (!apiResponse.ok) return null;
      const payload = (await apiResponse.json()) as {
        dataUrl?: string;
        data?: { dataUrl?: string };
      };
      if ("dataUrl" in payload) {
        return payload.dataUrl ?? null;
      }
      return payload?.data?.dataUrl ?? null;
    } catch {
      return null;
    }
  };

  const generatePDF = async () => {
    if (selectedItems.size === 0) {
      return;
    }

    setIsGenerating(true);
    try {
      const selectedItemsList = getSelectedItemsList();
      const labelsToPrint = selectedItemsList.flatMap((item) =>
        Array.from({ length: getItemQuantity(item.id) }, () => item)
      );
      const companyLogoDataUrl = await resolveLogoDataUrl();
      const { widthCm, heightCm } = getLabelDimensionsCm();
      const isZebraLayout = labelSizePreset !== "custom" && LABEL_SIZE_PRESETS[labelSizePreset].zebra;
      const pdf = isZebraLayout
        ? new jsPDF({
            orientation: heightCm >= widthCm ? "p" : "l",
            unit: "mm",
            format: [widthCm * 10, heightCm * 10],
          })
        : new jsPDF("p", "mm", "a4");

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = isZebraLayout ? 2 : 10;
      const availableWidth = pageWidth - 2 * margin;
      const availableHeight = pageHeight - 2 * margin;
      const labelWidth = isZebraLayout ? availableWidth : widthCm * 10;
      const labelHeight = isZebraLayout ? availableHeight : heightCm * 10;
      const horizontalGap = isZebraLayout ? 0 : 2;
      const verticalGap = isZebraLayout ? 0 : 2;
      const cols = isZebraLayout
        ? 1
        : Math.max(1, Math.floor((availableWidth + horizontalGap) / (labelWidth + horizontalGap)));
      const rows = isZebraLayout
        ? 1
        : Math.max(1, Math.floor((availableHeight + verticalGap) / (labelHeight + verticalGap)));
      let currentPage = 0;
      let currentRow = 0;
      let currentCol = 0;

      for (let i = 0; i < labelsToPrint.length; i++) {
        const item = labelsToPrint[i];

          // Check if we need a new page
          if (currentRow >= rows) {
            pdf.addPage();
            currentPage++;
            currentRow = 0;
            currentCol = 0;
          }

          const x = margin + currentCol * (labelWidth + horizontalGap);
          const y = margin + currentRow * (labelHeight + verticalGap);
          const innerPadding = 2;
          const innerX = x + innerPadding;
          const innerY = y + innerPadding;
          const innerW = labelWidth - innerPadding * 2;
          const innerH = labelHeight - innerPadding * 2;
          const innerBottom = innerY + innerH;

          // Draw border
          pdf.setDrawColor(200, 200, 200);
          pdf.rect(x, y, labelWidth, labelHeight);

          const titleFont = Math.max(7, Math.min(11, labelHeight * 0.14));
          const bodyFont = Math.max(6, Math.min(9, labelHeight * 0.12));
          const metaFont = Math.max(5, bodyFont - 1);
          const lineStep = Math.max(2.5, bodyFont * 0.45);
          const qrSize = Math.max(14, Math.min(28, innerH * 0.46));
          const logoSize = Math.max(8, Math.min(14, innerH * 0.24));
          const centerX = innerX + innerW / 2;

          let currentY = innerY;

        const addFittedText = (text: string, options: {
          fontSize: number;
          maxWidth: number;
          maxLines: number;
          color: [number, number, number];
          x: number;
          y: number;
        }): number => {
          if (!text.trim()) return 0;
          pdf.setFontSize(options.fontSize);
          pdf.setTextColor(...options.color);
          const splitRaw = pdf.splitTextToSize(text, options.maxWidth);
          const lines = (Array.isArray(splitRaw) ? splitRaw : [splitRaw]).slice(0, options.maxLines);
          if (lines.length === 0) return 0;
          pdf.text(lines, options.x, options.y, {
            maxWidth: options.maxWidth,
          });
          return lines.length;
        };

        const addCenteredText = (text: string, options: {
          fontSize: number;
          maxWidth: number;
          maxLines: number;
          color: [number, number, number];
          y: number;
        }): number => {
          if (!text.trim()) return 0;
          pdf.setFontSize(options.fontSize);
          pdf.setTextColor(...options.color);
          const splitRaw = pdf.splitTextToSize(text, options.maxWidth);
          const lines = (Array.isArray(splitRaw) ? splitRaw : [splitRaw]).slice(0, options.maxLines);
          if (lines.length === 0) return 0;
          pdf.text(lines, centerX, options.y, {
            align: "center",
            maxWidth: options.maxWidth,
          });
          return lines.length;
        };

        const normalizeToEan13 = (raw: string): string | null => {
          const digits = raw.replace(/\D/g, "");
          if (digits.length !== 12 && digits.length !== 13) {
            return null;
          }

          const base12 = digits.slice(0, 12);
          const expectedCheck = (() => {
            let sum = 0;
            for (let idx = 0; idx < base12.length; idx++) {
              const num = Number(base12[idx]);
              sum += idx % 2 === 0 ? num : num * 3;
            }
            return (10 - (sum % 10)) % 10;
          })();

          if (digits.length === 13) {
            const providedCheck = Number(digits[12]);
            if (providedCheck !== expectedCheck) {
              return null;
            }
            return digits;
          }

          return `${base12}${expectedCheck}`;
        };

        const drawEan13Barcode = (ean13: string, options: {
          centerX: number;
          y: number;
          maxWidth: number;
          height: number;
        }): { renderedWidth: number } => {
          const leftOdd = ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"];
          const leftEven = ["0100111", "0110011", "0011011", "0100001", "0011101", "0111001", "0000101", "0010001", "0001001", "0010111"];
          const right = ["1110010", "1100110", "1101100", "1000010", "1011100", "1001110", "1010000", "1000100", "1001000", "1110100"];
          const parity = ["AAAAAA", "AABABB", "AABBAB", "AABBBA", "ABAABB", "ABBAAB", "ABBBAA", "ABABAB", "ABABBA", "ABBABA"];

          const firstDigit = Number(ean13[0]);
          const leftDigits = ean13.slice(1, 7).split("").map(Number);
          const rightDigits = ean13.slice(7).split("").map(Number);

          let pattern = "101";
          const leftParity = parity[firstDigit];
          for (let i = 0; i < 6; i++) {
            pattern += leftParity[i] === "A" ? leftOdd[leftDigits[i]] : leftEven[leftDigits[i]];
          }
          pattern += "01010";
          for (let i = 0; i < 6; i++) {
            pattern += right[rightDigits[i]];
          }
          pattern += "101";

          const patternModules = pattern.length; // 95 modules (EAN-13 bars only)
          const quietModules = 7;
          const totalModules = patternModules + quietModules * 2; // 109 with quiet zones
          // Keep proper EAN proportions to avoid stretched appearance.
          let moduleWidth = Math.max(0.22, Math.min(0.45, options.height / 18));
          moduleWidth = Math.min(moduleWidth, options.maxWidth / totalModules);
          const renderedWidth = totalModules * moduleWidth;
          const startX = options.centerX - renderedWidth / 2 + quietModules * moduleWidth;
          const guardHeight = options.height * 1.08;
          let cursorX = startX;
          pdf.setFillColor(0, 0, 0);
          for (let i = 0; i < pattern.length; i++) {
            if (pattern[i] === "1") {
              const isGuard =
                i < 3 ||
                (i >= 45 && i < 50) ||
                i >= pattern.length - 3;
              pdf.rect(cursorX, options.y, moduleWidth, isGuard ? guardHeight : options.height, "F");
            }
            cursorX += moduleWidth;
          }
          return { renderedWidth };
        };

        // MAIN block: centered and stacked
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
            const qrX = centerX - qrSize / 2;
            pdf.addImage(qrDataUrl, "PNG", qrX, currentY, qrSize, qrSize);
            currentY += qrSize + 1.5;
          } catch (error) {
            console.error("Error generating QR code:", error);
          }
        }

        // Item name (centered)
        if (includeItemName && item.name) {
          const titleLines = addCenteredText(item.name, {
            fontSize: titleFont,
            maxWidth: innerW,
            maxLines: 2,
            color: [15, 23, 42],
            y: currentY + lineStep,
          });
          currentY += Math.max(lineStep, titleLines * lineStep) + 1;
        }

        // Main text info (centered)
        if (includeSKU && item.sku) {
          const used = addCenteredText(`SKU: ${item.sku}`, {
            fontSize: metaFont,
            maxWidth: innerW,
            maxLines: 1,
            color: [75, 85, 99],
            y: currentY + lineStep,
          });
          currentY += Math.max(lineStep, used * lineStep);
        }

        if (includeBarcode && item.barcode) {
          const ean13 = normalizeToEan13(item.barcode);
          if (!ean13) {
            const safeY = Math.min(currentY + lineStep, innerBottom - 0.8);
            addCenteredText(item.barcode, {
              fontSize: metaFont,
              maxWidth: innerW,
              maxLines: 1,
              color: [30, 41, 59],
              y: safeY,
            });
            currentY = Math.max(currentY, safeY + lineStep);
          } else {
            const barcodeHeight = Math.max(4, lineStep * 1.6);
            const barcodeMaxWidth = innerW * 0.9;
            const barcodeY = currentY + 1;
            const barcodeTextY = barcodeY + barcodeHeight + Math.max(1.2, lineStep * 0.75);

            if (barcodeTextY + 0.5 <= innerBottom) {
              const rendered = drawEan13Barcode(ean13, {
                centerX,
                y: barcodeY,
                maxWidth: barcodeMaxWidth,
                height: barcodeHeight,
              });
              addCenteredText(ean13, {
                fontSize: Math.max(4.8, metaFont - 0.5),
                maxWidth: Math.max(rendered.renderedWidth, innerW * 0.45),
                maxLines: 1,
                color: [30, 41, 59],
                y: barcodeTextY,
              });
              currentY = barcodeTextY + 0.8;
            } else {
              const safeY = Math.min(currentY + lineStep, innerBottom - 0.8);
              addCenteredText(ean13, {
                fontSize: metaFont,
                maxWidth: innerW,
                maxLines: 1,
                color: [30, 41, 59],
                y: safeY,
              });
              currentY = Math.max(currentY, safeY + lineStep);
            }
          }
        }

        if (includeStock && item.currentStock !== null && currentY + lineStep <= innerBottom) {
          const used = addCenteredText(`Stock: ${item.currentStock}`, {
            fontSize: metaFont,
            maxWidth: innerW,
            maxLines: 1,
            color: [100, 100, 100],
            y: currentY + lineStep,
          });
          currentY += Math.max(lineStep, used * lineStep);
        }

        for (const field of customFieldOptions) {
          if (!includeCustomFieldKeys[field.key]) {
            continue;
          }

          const fieldValue = item.customFields?.[field.key];
          if (!fieldValue || currentY + lineStep > innerBottom) {
            continue;
          }

          const fieldLabel = customFieldLabelByKey.get(field.key) ?? field.key;
          const availableLines = Math.max(1, Math.floor((innerBottom - currentY) / lineStep));
          const used = addFittedText(`${fieldLabel}: ${fieldValue}`, {
            fontSize: metaFont,
            maxWidth: innerW,
            maxLines: Math.min(2, availableLines),
            color: [80, 80, 80],
            x: innerX,
            y: currentY + lineStep,
          });
          currentY += Math.max(lineStep, used * lineStep);
        }

        currentY += 1.5;

        // Company block: logo left, company name and extras on the right
        if (
          includeCompanyInfo &&
          (companyLogoDataUrl || team.companyName || team.labelCompanyInfo) &&
          currentY + lineStep <= innerBottom
        ) {
          const companyBlockY = currentY;
          const rightTextX = companyLogoDataUrl ? innerX + logoSize + 2 : innerX;
          const rightTextW = companyLogoDataUrl ? innerW - logoSize - 2 : innerW;
          let rightTextY = companyBlockY;

          if (companyLogoDataUrl) {
            const logoFormat = companyLogoDataUrl.includes("data:image/jpeg") ? "JPEG" : "PNG";
            pdf.addImage(companyLogoDataUrl, logoFormat, innerX, companyBlockY, logoSize, logoSize);
          }

          if (team.companyName && rightTextY + lineStep <= innerBottom) {
            const remainingLines = Math.max(1, Math.floor((innerBottom - rightTextY) / lineStep));
            const used = addFittedText(team.companyName, {
              fontSize: bodyFont,
              maxWidth: rightTextW,
              maxLines: Math.min(1, remainingLines),
              color: [55, 65, 81],
              x: rightTextX,
              y: rightTextY + lineStep,
            });
            rightTextY += Math.max(lineStep, used * lineStep);
          }

          if (team.labelCompanyInfo && rightTextY + lineStep <= innerBottom) {
            const remainingLines = Math.max(1, Math.floor((innerBottom - rightTextY) / lineStep));
            addFittedText(team.labelCompanyInfo, {
              fontSize: metaFont,
              maxWidth: rightTextW,
              maxLines: Math.min(2, remainingLines),
              color: [107, 114, 128],
              x: rightTextX,
              y: rightTextY + lineStep,
            });
          }
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
                  value={labelSizePreset}
                  onChange={(e) => setLabelSizePreset(e.target.value as LabelSizePreset)}
                  className="w-full h-11 text-base border border-gray-300 rounded-md px-3 focus:border-[#6B21A8] focus:ring-[#6B21A8]"
                >
                  <option value="default_10x5">{t.labels.default10x5}</option>
                  <option value="zebra_100x150">Zebra 100 x 150 mm</option>
                  <option value="zebra_60x40">Zebra 60 x 40 mm</option>
                  <option value="zebra_110x64">Zebra 110 x 64 mm</option>
                  <option value="zebra_170x64">Zebra 170 x 64 mm</option>
                  <option value="custom">{t.labels.customSize}</option>
                </select>
              </div>
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">
                  {t.labels.widthCm}
                </Label>
                <Input
                  type="text"
                  value={labelSizePreset === "custom" ? customWidthCm : String(getLabelDimensionsCm().widthCm)}
                  onChange={(e) => setCustomWidthCm(e.target.value)}
                  disabled={labelSizePreset !== "custom"}
                  className="h-11 text-base border-gray-300 focus:border-[#6B21A8] focus:ring-[#6B21A8]"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">
                  {t.labels.heightCm}
                </Label>
                <Input
                  type="text"
                  value={labelSizePreset === "custom" ? customHeightCm : String(getLabelDimensionsCm().heightCm)}
                  onChange={(e) => setCustomHeightCm(e.target.value)}
                  disabled={labelSizePreset !== "custom"}
                  className="h-11 text-base border-gray-300 focus:border-[#6B21A8] focus:ring-[#6B21A8]"
                />
              </div>
              <div className="flex items-end">
                <div className="text-xs text-gray-600">
                  {`${getLabelDimensionsCm().widthCm} x ${getLabelDimensionsCm().heightCm} cm`}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
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
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeCompanyInfo}
                  onChange={(e) => setIncludeCompanyInfo(e.target.checked)}
                  className="w-4 h-4 text-[#6B21A8] border-gray-300 rounded focus:ring-[#6B21A8]"
                />
                <span className="text-sm text-gray-700">{t.labels.includeCompanyInfo}</span>
              </label>
              {customFieldOptions.length > 0 ? (
                <div
                  className="col-span-2 sm:col-span-3 lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
                  data-tour="tour-labels-custom-fields"
                >
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
              ) : null}
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
                    <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      {t.labels.quantityPerItem}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="px-4 sm:px-6 py-8 text-center text-gray-500 text-sm">
                        {t.common.loading}
                      </td>
                    </tr>
                  ) : filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 sm:px-6 py-8 text-center text-gray-500 text-sm">
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
                        <td className="px-4 sm:px-6 py-4">
                          <Input
                            type="number"
                            min={1}
                            step={1}
                            value={getItemQuantity(item.id)}
                            onChange={(e) => updateItemQuantity(item.id, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="h-9 w-20 text-sm"
                            disabled={!selectedItems.has(item.id)}
                            aria-label={`${t.labels.quantityPerItem} ${item.name || item.sku || item.id}`}
                          />
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
