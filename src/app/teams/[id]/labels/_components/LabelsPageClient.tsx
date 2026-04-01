"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Info,
  Printer,
  Download,
  Eye,
  CheckSquare,
  Square,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast-simple";
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

type QRSizePreset = "medium" | "large" | "small" | "custom";
type PreviewScaleMode = "fit" | "real";

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
  const { toast } = useToast();
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
  const [qrSizePreset, setQrSizePreset] = useState<QRSizePreset>("large");
  const [customQRScale, setCustomQRScale] = useState("125");
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
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewScaleMode, setPreviewScaleMode] = useState<PreviewScaleMode>("fit");
  const { t } = useTranslation();
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
    setSelectedItems((prev) => {
      const next = new Set(prev);
      for (const item of filteredItems) {
        next.add(item.id);
      }
      return next;
    });
  };

  const deselectAll = () => {
    setSelectedItems(new Set());
  };

  const deselectFilteredItems = () => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      for (const item of filteredItems) {
        next.delete(item.id);
      }
      return next;
    });
  };

  const getSelectedItemsList = () => {
    return items.filter((item) => selectedItems.has(item.id));
  };

  const getItemQuantity = (itemId: number) => Math.max(1, labelQuantityByItem[itemId] ?? 1);
  const getTotalLabelsCount = () =>
    Array.from(selectedItems).reduce((total, itemId) => total + getItemQuantity(itemId), 0);

  const totalSelectedLabels = getTotalLabelsCount();
  const isCustomSize = labelSizePreset === "custom";
  const previewItem = getSelectedItemsList()[0] ?? filteredItems[0] ?? items[0] ?? null;
  const previewCustomFields = customFieldOptions
    .filter((field) => includeCustomFieldKeys[field.key] && previewItem?.customFields?.[field.key])
    .map((field) => ({
      key: field.key,
      label: customFieldLabelByKey.get(field.key) ?? field.key,
      value: previewItem?.customFields?.[field.key] ?? "",
    }));

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

  const getQRScaleFactor = () => {
    switch (qrSizePreset) {
      case "small":
        return 0.85;
      case "medium":
        return 1;
      case "large":
        return 1.25;
      case "custom": {
        const parsed = Number.parseInt(customQRScale, 10);
        const safeScale = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 70), 180) : 125;
        return safeScale / 100;
      }
      default:
        return 1.25;
    }
  };

  const getQRSizePresetLabel = () => {
    switch (qrSizePreset) {
      case "small":
        return t.labels.small;
      case "medium":
        return t.labels.medium;
      case "large":
        return t.labels.large;
      case "custom":
        return `${customQRScale}%`;
      default:
        return t.labels.large;
    }
  };

  const normalizedWidthCm = getLabelDimensionsCm().widthCm;
  const normalizedHeightCm = getLabelDimensionsCm().heightCm;
  const requestedWidthCm = parseCm(customWidthCm, normalizedWidthCm);
  const requestedHeightCm = parseCm(customHeightCm, normalizedHeightCm);
  const customDimensionsAdjusted =
    isCustomSize &&
    (requestedWidthCm !== normalizedWidthCm || requestedHeightCm !== normalizedHeightCm);
  const qrScaleFactor = getQRScaleFactor();
  const previewScaleStyle = {
    transform: `scale(${Math.min(Math.max(qrScaleFactor, 0.85), 1.45)})`,
  };
  const previewSheetStyle =
    previewScaleMode === "real"
      ? {
          width: `${normalizedWidthCm}cm`,
          height: `${normalizedHeightCm}cm`,
          maxWidth: "none",
        }
      : {
          width: "100%",
          maxWidth: "320px",
          minHeight: "440px",
        };

  const resolveLogoDataUrl = async (): Promise<{
    dataUrl: string | null;
    failedToLoad: boolean;
  }> => {
    try {
      const apiResponse = await fetch(`/api/teams/${team.id}/labels/logo-data`);
      if (!apiResponse.ok) {
        return {
          dataUrl: null,
          failedToLoad: apiResponse.status !== 404,
        };
      }
      const payload = (await apiResponse.json()) as {
        dataUrl?: string;
        data?: { dataUrl?: string };
      };
      if ("dataUrl" in payload) {
        return { dataUrl: payload.dataUrl ?? null, failedToLoad: false };
      }
      return { dataUrl: payload?.data?.dataUrl ?? null, failedToLoad: false };
    } catch {
      return { dataUrl: null, failedToLoad: true };
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
      const { dataUrl: companyLogoDataUrl, failedToLoad: logoLoadFailed } =
        await resolveLogoDataUrl();
      if (logoLoadFailed) {
        toast({
          variant: "destructive",
          title: t.labels.logoLoadErrorTitle,
          description: t.labels.logoLoadErrorDescription,
        });
      }
      const { widthCm, heightCm } = getLabelDimensionsCm();
      const isZebraLayout = labelSizePreset !== "custom" && LABEL_SIZE_PRESETS[labelSizePreset].zebra;
      const invalidBarcodeItemIds = new Set<number>();
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
      let currentRow = 0;
      let currentCol = 0;

      for (let i = 0; i < labelsToPrint.length; i++) {
        const item = labelsToPrint[i];

          // Check if we need a new page
          if (currentRow >= rows) {
            pdf.addPage();
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
          const baseQRSize = isZebraLayout
            ? Math.min(34, Math.min(innerW * 0.58, innerH * 0.46))
            : Math.min(28, Math.min(innerW * 0.42, innerH * 0.44));
          const qrSize = Math.max(
            16,
            Math.min(baseQRSize * getQRScaleFactor(), Math.min(innerW * 0.82, innerH * 0.68))
          );
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
            invalidBarcodeItemIds.add(item.id);
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
      toast({
        variant: "success",
        title: t.labels.generateSuccessTitle,
        description: t.labels.generateSuccessDescription
          .replace("{count}", String(labelsToPrint.length))
          .replace("{items}", String(selectedItemsList.length)),
      });
      if (invalidBarcodeItemIds.size > 0) {
        toast({
          variant: "destructive",
          title: t.labels.invalidBarcodeTitle,
          description: t.labels.invalidBarcodeDescription.replace(
            "{count}",
            String(invalidBarcodeItemIds.size)
          ),
        });
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        variant: "destructive",
        title: t.labels.generateErrorTitle,
        description: t.labels.generateErrorDescription,
      });
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
	            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
	              <div>
	                <h2 className="text-lg font-bold text-gray-900">{t.labels.selectItems}</h2>
	                <p className="mt-1 text-sm text-gray-600">{t.labels.settingsHelper}</p>
	              </div>
	              <div className="flex flex-wrap gap-2">
	                <Button
	                  type="button"
	                  variant="outline"
	                  onClick={() => setIsPreviewOpen(true)}
	                  className="border-[#D6BCFA] bg-[#FAF5FF] text-[#6B21A8] hover:bg-[#F3E8FF]"
	                >
	                  <Eye className="mr-2 h-4 w-4" />
	                  {t.labels.previewButton}
	                </Button>
	              </div>
	            </div>

	            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
	              <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5" data-tour="tour-labels-size">
	                <div className="mb-4">
	                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
	                    {t.labels.settingsFormatTitle}
	                  </h3>
	                  <p className="mt-1 text-sm text-slate-600">{t.labels.settingsFormatDescription}</p>
	                </div>
	                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(220px,1.1fr)_minmax(140px,0.8fr)_minmax(140px,0.8fr)]">
	                  <div>
	                    <Label className="text-sm font-semibold text-gray-700 mb-2 block">
	                      {t.labels.labelSize}
	                    </Label>
	                    <select
	                      aria-label={t.labels.labelSize}
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
	                      value={isCustomSize ? customWidthCm : String(normalizedWidthCm)}
	                      onChange={(e) => setCustomWidthCm(e.target.value)}
	                      disabled={!isCustomSize}
	                      className="h-11 text-base border-gray-300 focus:border-[#6B21A8] focus:ring-[#6B21A8]"
	                    />
	                  </div>
	                  <div>
	                    <Label className="text-sm font-semibold text-gray-700 mb-2 block">
	                      {t.labels.heightCm}
	                    </Label>
	                    <Input
	                      type="text"
	                      value={isCustomSize ? customHeightCm : String(normalizedHeightCm)}
	                      onChange={(e) => setCustomHeightCm(e.target.value)}
	                      disabled={!isCustomSize}
	                      className="h-11 text-base border-gray-300 focus:border-[#6B21A8] focus:ring-[#6B21A8]"
	                    />
	                  </div>
	                </div>
	                <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
	                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
	                    {t.labels.previewLabel}
	                  </div>
	                  <div className="mt-1 text-base font-semibold text-slate-800">
	                    {`${normalizedWidthCm} x ${normalizedHeightCm} cm`}
	                  </div>
	                  {isCustomSize ? (
	                    <div className="mt-2 text-xs text-slate-600">
	                      <p>{t.labels.customSizeLimits}</p>
	                      {customDimensionsAdjusted ? (
	                        <p className="mt-1 text-amber-700">
	                          {t.labels.customSizeAdjusted
	                            .replace("{width}", String(normalizedWidthCm))
	                            .replace("{height}", String(normalizedHeightCm))}
	                        </p>
	                      ) : null}
	                    </div>
	                  ) : null}
	                </div>
	              </section>

	              <section className="rounded-2xl border border-[#E9D5FF] bg-gradient-to-br from-[#FAF5FF] via-white to-[#F8FAFC] p-4 sm:p-5">
	                <div className="mb-4">
	                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#7E22CE]">
	                    {t.labels.settingsPreviewTitle}
	                  </h3>
	                  <p className="mt-1 text-sm text-slate-600">{t.labels.settingsPreviewDescription}</p>
	                </div>
	                <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
	                  {previewItem ? (
	                    <div className="mx-auto flex min-h-[280px] max-w-[220px] flex-col rounded-[24px] border border-slate-300 bg-white p-4 shadow-inner">
	                      <div className="mb-3 flex items-start justify-between gap-3">
	                        <div>
	                          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
	                            {team.name}
	                          </p>
	                          <h4 className="mt-1 text-sm font-semibold text-slate-900">
	                            {previewItem.name || t.items.unnamedItem}
	                          </h4>
	                        </div>
	                        <div className="rounded-full bg-[#F3E8FF] px-2 py-1 text-[10px] font-semibold text-[#7E22CE]">
	                          {`${normalizedWidthCm} x ${normalizedHeightCm}`}
	                        </div>
	                      </div>
	                      {includeQRCode && previewItem.barcode ? (
	                        <div className="flex flex-1 items-center justify-center py-4">
	                          <div
	                            className="rounded-2xl border border-slate-200 bg-white p-3 transition-transform"
	                            style={previewScaleStyle}
	                          >
	                            <QRCodeDisplay value={previewItem.barcode} size={88} />
	                          </div>
	                        </div>
	                      ) : (
	                        <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
	                          {t.labels.previewNoQr}
	                        </div>
	                      )}
	                      <div className="space-y-1.5 border-t border-slate-200 pt-3 text-xs text-slate-600">
	                        {includeSKU && previewItem.sku ? <p>{`SKU: ${previewItem.sku}`}</p> : null}
	                        {includeBarcode && previewItem.barcode ? <p>{previewItem.barcode}</p> : null}
	                        {includeStock && previewItem.currentStock !== null ? (
	                          <p>{`Stock: ${previewItem.currentStock}`}</p>
	                        ) : null}
	                        {includeCompanyInfo && team.companyName ? (
	                          <p className="pt-1 font-medium text-slate-800">{team.companyName}</p>
	                        ) : null}
	                      </div>
	                    </div>
	                  ) : (
	                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
	                      {t.labels.previewEmpty}
	                    </div>
	                  )}
	                </div>
	              </section>
	            </div>

	            <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
	              <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
	                <div className="mb-4">
	                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
	                    {t.labels.settingsContentTitle}
	                  </h3>
	                  <p className="mt-1 text-sm text-slate-600">{t.labels.settingsContentDescription}</p>
	                </div>
	                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
	                  <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-3 cursor-pointer">
	                    <input
	                      type="checkbox"
	                      checked={includeQRCode}
	                      onChange={(e) => setIncludeQRCode(e.target.checked)}
	                      className="w-4 h-4 text-[#6B21A8] border-gray-300 rounded focus:ring-[#6B21A8]"
	                    />
	                    <span className="text-sm text-gray-700">{t.labels.includeQRCode}</span>
	                  </label>
	                  <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-3 cursor-pointer">
	                <input
	                  type="checkbox"
	                  checked={includeBarcode}
                  onChange={(e) => setIncludeBarcode(e.target.checked)}
                  className="w-4 h-4 text-[#6B21A8] border-gray-300 rounded focus:ring-[#6B21A8]"
                />
                <span className="text-sm text-gray-700">{t.labels.includeBarcode}</span>
	                  </label>
	                  <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-3 cursor-pointer">
	                <input
	                  type="checkbox"
	                  checked={includeItemName}
                  onChange={(e) => setIncludeItemName(e.target.checked)}
                  className="w-4 h-4 text-[#6B21A8] border-gray-300 rounded focus:ring-[#6B21A8]"
                />
                <span className="text-sm text-gray-700">{t.labels.includeItemName}</span>
	                  </label>
	                  <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-3 cursor-pointer">
	                <input
	                  type="checkbox"
	                  checked={includeSKU}
                  onChange={(e) => setIncludeSKU(e.target.checked)}
                  className="w-4 h-4 text-[#6B21A8] border-gray-300 rounded focus:ring-[#6B21A8]"
                />
                <span className="text-sm text-gray-700">{t.labels.includeSKU}</span>
	                  </label>
	                  <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-3 cursor-pointer">
	                <input
	                  type="checkbox"
	                  checked={includeStock}
                  onChange={(e) => setIncludeStock(e.target.checked)}
                  className="w-4 h-4 text-[#6B21A8] border-gray-300 rounded focus:ring-[#6B21A8]"
                />
                <span className="text-sm text-gray-700">{t.labels.includeStock}</span>
	                  </label>
	                  <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-3 cursor-pointer">
	                <input
	                  type="checkbox"
	                  checked={includeCompanyInfo}
                  onChange={(e) => setIncludeCompanyInfo(e.target.checked)}
                  className="w-4 h-4 text-[#6B21A8] border-gray-300 rounded focus:ring-[#6B21A8]"
                />
                <span className="text-sm text-gray-700">{t.labels.includeCompanyInfo}</span>
	                  </label>
	                </div>
	                {customFieldOptions.length > 0 ? (
	                  <div
	                    className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2"
	                    data-tour="tour-labels-custom-fields"
	                  >
	                  {customFieldOptions.map((field) => (
	                    <label key={field.key} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-3 cursor-pointer">
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
	              </section>

	              <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
	                <div className="mb-4">
	                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
	                    {t.labels.qrSizeLabel}
	                  </h3>
	                  <p className="mt-1 text-sm text-slate-600">{t.labels.qrPanelDescription}</p>
	                </div>
	                <div className="rounded-2xl border border-[#E9D5FF] bg-[#FAF5FF] p-4">
	                  <Label className="text-sm font-semibold text-gray-700 mb-2 block">
	                    {t.labels.qrSizeLabel}
	                  </Label>
	                  <select
	                    aria-label={t.labels.qrSizeLabel}
	                    value={qrSizePreset}
	                    onChange={(e) => setQrSizePreset(e.target.value as QRSizePreset)}
	                    className="w-full h-10 text-sm border border-gray-300 rounded-md px-3 focus:border-[#6B21A8] focus:ring-[#6B21A8]"
	                  >
	                    <option value="small">{t.labels.small}</option>
	                    <option value="medium">{t.labels.medium}</option>
	                    <option value="large">{t.labels.large}</option>
	                    <option value="custom">{t.labels.customSize}</option>
	                  </select>
	                  {qrSizePreset === "custom" ? (
	                    <div className="mt-3">
	                      <Input
	                        type="number"
	                        min={70}
	                        max={180}
	                        step={5}
	                        value={customQRScale}
	                        onChange={(e) => setCustomQRScale(e.target.value)}
	                        className="h-10 text-sm"
	                        aria-label={t.labels.qrScaleLabel}
	                      />
	                      <p className="mt-2 text-xs text-gray-500">{t.labels.qrScaleHint}</p>
	                    </div>
	                  ) : (
	                    <p className="mt-3 text-xs text-gray-500">{t.labels.qrSizeHint}</p>
	                  )}
	                </div>
	              </section>
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
	                type="button"
	                variant="outline"
	                onClick={() => setIsPreviewOpen(true)}
	                className="border-[#D6BCFA] text-[#6B21A8] hover:bg-[#FAF5FF] text-xs sm:text-sm"
	              >
	                <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
	                {t.labels.previewButton}
	              </Button>
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
                            deselectFilteredItems();
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
                {t.labels.selectedItemsSummary.replace("{count}", String(selectedItems.size))}
              </div>
              <div className="text-sm sm:text-base font-semibold text-gray-700">
                {t.labels.totalLabelsSummary.replace("{count}", String(totalSelectedLabels))}
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
            {isPreviewOpen ? (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
                <div className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-[28px] bg-white shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">{t.labels.previewModalTitle}</h2>
                      <p className="mt-1 text-sm text-slate-600">{t.labels.previewModalDescription}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setIsPreviewOpen(false)}
                      className="h-10 w-10 p-0 text-slate-500 hover:bg-slate-100"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                  <div className="grid gap-6 p-5 sm:grid-cols-[280px_minmax(0,1fr)] sm:p-6">
                    <div className="rounded-3xl border border-[#E9D5FF] bg-gradient-to-br from-[#FAF5FF] to-white p-5">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7E22CE]">
                        {t.labels.previewLabel}
                      </div>
                      <div className="mt-2 text-lg font-semibold text-slate-900">
                        {`${normalizedWidthCm} x ${normalizedHeightCm} cm`}
                      </div>
	                      <div className="mt-5 space-y-4 text-sm text-slate-600">
	                        <div>
	                          <p className="font-medium text-slate-900">{t.labels.qrSizeLabel}</p>
	                          <p>{getQRSizePresetLabel()}</p>
	                        </div>
	                        <div>
	                          <p className="font-medium text-slate-900">{t.labels.settingsContentTitle}</p>
                          <p>
                            {[
                              includeQRCode ? t.labels.includeQRCode : null,
                              includeBarcode ? t.labels.includeBarcode : null,
                              includeItemName ? t.labels.includeItemName : null,
                              includeSKU ? t.labels.includeSKU : null,
                              includeStock ? t.labels.includeStock : null,
                            ]
                              .filter(Boolean)
	                              .join(" • ")}
	                          </p>
	                        </div>
                          <div>
                            <p className="font-medium text-slate-900">{t.labels.previewScaleTitle}</p>
                            <div className="mt-2 inline-flex rounded-full border border-slate-200 bg-white p-1">
                              <button
                                type="button"
                                onClick={() => setPreviewScaleMode("fit")}
                                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                                  previewScaleMode === "fit"
                                    ? "bg-[#6B21A8] text-white"
                                    : "text-slate-600 hover:bg-slate-100"
                                }`}
                              >
                                {t.labels.previewScaleFit}
                              </button>
                              <button
                                type="button"
                                onClick={() => setPreviewScaleMode("real")}
                                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                                  previewScaleMode === "real"
                                    ? "bg-[#6B21A8] text-white"
                                    : "text-slate-600 hover:bg-slate-100"
                                }`}
                              >
                                {t.labels.previewScaleReal}
                              </button>
                            </div>
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{t.labels.previewScaleGuide}</p>
                            <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm">
                              <span className="block h-1 w-[1cm] rounded-full bg-[#6B21A8]" />
                              <span className="text-xs font-medium text-slate-600">1 cm</span>
                            </div>
                            <p className="mt-2 text-xs text-slate-500">{t.labels.previewScaleDisclaimer}</p>
                          </div>
	                      </div>
	                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
                      {previewItem ? (
                          <div className="flex max-h-[70vh] items-start justify-center overflow-auto rounded-[28px] border border-dashed border-slate-200 bg-white/70 p-4 sm:p-6">
	                        <div
                            data-testid="label-preview-sheet"
                            className="flex flex-col rounded-[12px] border border-slate-300 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.08)]"
                            style={previewSheetStyle}
                          >
                            <div className="flex flex-1 flex-col">
	                          {includeQRCode && previewItem.barcode ? (
	                            <div className="flex items-start justify-center pt-2">
	                              <div className="transition-transform" style={previewScaleStyle}>
	                                <QRCodeDisplay value={previewItem.barcode} size={previewScaleMode === "real" ? 170 : 140} />
	                              </div>
	                            </div>
	                          ) : (
	                            <div className="flex min-h-[140px] items-center justify-center rounded-[12px] border border-dashed border-slate-200 bg-white px-6 py-8 text-center text-sm text-slate-400">
	                              {t.labels.previewNoQr}
	                            </div>
	                          )}
                              {includeItemName && (previewItem.name || t.items.unnamedItem) ? (
                                <div className="pt-4 text-center">
                                  <h3 className="text-[20px] font-medium leading-tight text-slate-800">
                                    {previewItem.name || t.items.unnamedItem}
                                  </h3>
                                </div>
                              ) : null}
                              {includeSKU && previewItem.sku ? (
                                <p className="pt-1 text-center text-[15px] text-slate-600">{`SKU: ${previewItem.sku}`}</p>
                              ) : null}
                              {includeBarcode && previewItem.barcode ? (
                                <p className="pt-1 text-center text-[14px] text-slate-600">{previewItem.barcode}</p>
                              ) : null}
                              {includeStock && previewItem.currentStock !== null ? (
                                <p className="pt-1 text-center text-[14px] text-slate-600">{`Stock: ${previewItem.currentStock}`}</p>
                              ) : null}
                              {previewCustomFields.length > 0 ? (
                                <div className="pt-4 text-[14px] text-slate-600">
                                  {previewCustomFields.map((field) => (
                                    <p key={field.key} className="leading-snug">{`${field.label}: ${field.value}`}</p>
                                  ))}
                                </div>
                              ) : null}
                              <div className="mt-auto pt-5">
                                {includeCompanyInfo && (team.labelLogoUrl || team.companyName || team.labelCompanyInfo) ? (
                                  <div className="flex items-center gap-3 text-slate-600">
                                    {team.labelLogoUrl ? (
                                      <img
                                        src={team.labelLogoUrl}
                                        alt={team.companyName || team.name}
                                        className="h-16 w-16 rounded-xl border border-slate-200 object-contain bg-white"
                                      />
                                    ) : (
                                      <div className="h-16 w-16 rounded-xl border border-slate-200 bg-slate-100" />
                                    )}
                                    <div className="min-w-0">
                                      {team.companyName ? (
                                        <p className="text-[14px] font-medium leading-snug text-slate-700">{team.companyName}</p>
                                      ) : null}
                                      {team.labelCompanyInfo ? (
                                        <p className="text-[13px] leading-snug text-slate-500">{team.labelCompanyInfo}</p>
                                      ) : null}
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            </div>
	                        </div>
                          </div>
	                      ) : (
	                        <div className="flex min-h-[360px] items-center justify-center rounded-[28px] border border-dashed border-slate-200 bg-white px-6 text-center text-sm text-slate-500">
	                          {t.labels.previewEmpty}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
      </main>
    </TeamLayout>
  );
}
