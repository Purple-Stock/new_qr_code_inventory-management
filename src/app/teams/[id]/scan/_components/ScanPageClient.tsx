"use client";

import { useState } from "react";
import { Info, ScanLine, Search, X, CheckCircle2, AlertCircle, Layers3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast-simple";
import { useTranslation } from "@/lib/i18n";
import { TeamLayout } from "@/components/shared/TeamLayout";
import { BarcodeScannerModal } from "@/components/BarcodeScannerModal";
import { fetchApiResult } from "@/lib/api-client";
import type { TeamDto } from "@/lib/services/types";

type LookupItem = {
  id: number;
  name: string | null;
  sku: string | null;
  barcode: string | null;
  currentStock: number | null;
  locationName: string | null;
  photoData: string | null;
  customFields: Record<string, string> | null;
};

interface ScanPageClientProps {
  team: TeamDto;
  initialItems: LookupItem[];
  preferServerLookup: boolean;
}

type ScanFeedbackState = "idle" | "loading" | "success" | "multiple" | "not_found" | "error";

export function ScanPageClient({
  team,
  initialItems,
  preferServerLookup,
}: ScanPageClientProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lastCode, setLastCode] = useState("");
  const [multipleResults, setMultipleResults] = useState<LookupItem[]>([]);
  const [summaryItem, setSummaryItem] = useState<LookupItem | null>(null);
  const [scanState, setScanState] = useState<ScanFeedbackState>("idle");
  const [scanMessage, setScanMessage] = useState("");
  const summaryCustomFields = Object.entries(summaryItem?.customFields ?? {}).filter(
    ([, value]) => Boolean(value)
  );
  const customFieldLabelByKey = new Map(
    (team.itemCustomFieldSchema ?? [])
      .filter((field) => field.active)
      .map((field) => [field.key, field.label])
  );

  const idsKey = (items: LookupItem[]) =>
    items
      .map((item) => item.id)
      .sort((a, b) => a - b)
      .join(",");

  const applyLookupResult = (
    code: string,
    items: LookupItem[],
    options: { emitToast: boolean }
  ) => {
    if (items.length === 0) {
      setScanState("not_found");
      setScanMessage(`${t.scan.noItemWithCode} ${code}`);
      if (options.emitToast) {
        toast({
          variant: "destructive",
          title: t.scan.itemNotFound,
          description: `${t.scan.noItemWithCode} ${code}`,
        });
      }
      return;
    }

    if (items.length === 1) {
      setScanState("success");
      setScanMessage(t.scan.openingSummary);
      if (options.emitToast) {
        toast({
          variant: "success",
          title: t.scan.itemFound,
          description: t.scan.openingSummary,
        });
      }
      setSummaryItem(items[0]);
      return;
    }

    setMultipleResults(items);
    setScanState("multiple");
    setScanMessage(`${t.scan.multipleItemsFound} (${items.length})`);
    if (options.emitToast) {
      toast({
        variant: "default",
        title: t.scan.multipleItemsFound,
        description: t.scan.selectItemFromList,
      });
    }
  };

  const lookupFromServer = async (
    code: string,
    options: { emitToast: boolean; showLoading: boolean }
  ): Promise<LookupItem[] | null> => {
    if (options.showLoading) {
      // When server lookup starts, close scanner and show fullscreen loader.
      setIsScannerOpen(false);
      setIsLoading(true);
      setScanState("loading");
      setScanMessage(t.common.loading);
    }
    try {
      const result = await fetchApiResult<{ items: LookupItem[] }>(
        `/api/teams/${team.id}/items/lookup?code=${encodeURIComponent(code)}`,
        { fallbackError: t.scan.lookupError }
      );
      if (!result.ok) {
        setScanState("error");
        setScanMessage(result.error.error);
        if (options.emitToast) {
          toast({
            variant: "destructive",
            title: t.common.error,
            description: result.error.error,
          });
        }
        return null;
      }
      return result.data.items ?? [];
    } catch (error) {
      console.error("Error looking up item by code:", error);
      setScanState("error");
      setScanMessage(t.scan.lookupError);
      if (options.emitToast) {
        toast({
          variant: "destructive",
          title: t.common.error,
          description: t.scan.lookupError,
        });
      }
      return null;
    } finally {
      if (options.showLoading) {
        setIsLoading(false);
      }
    }
  };

  const handleLookup = async (rawCode: string) => {
    const code = rawCode.trim();
    if (!code) {
      toast({
        variant: "destructive",
        title: t.common.error,
        description: t.scan.codeRequired,
      });
      return;
    }

    setLastCode(code);
    setMultipleResults([]);
    if (preferServerLookup) {
      const serverItems = await lookupFromServer(code, {
        emitToast: true,
        showLoading: true,
      });
      if (serverItems) {
        applyLookupResult(code, serverItems, { emitToast: true });
      }
      return;
    }

    const localItems = initialItems.filter((item) => item.barcode === code);
    if (localItems.length > 0) {
      applyLookupResult(code, localItems, { emitToast: true });

      // Validate in background to keep UI fast and still consistent with server state.
      void (async () => {
        const serverItems = await lookupFromServer(code, {
          emitToast: false,
          showLoading: false,
        });
        if (!serverItems) return;
        if (idsKey(serverItems) !== idsKey(localItems)) {
          applyLookupResult(code, serverItems, { emitToast: false });
        }
      })();
      return;
    }

    const serverItems = await lookupFromServer(code, {
      emitToast: true,
      showLoading: true,
    });
    if (serverItems) {
      applyLookupResult(code, serverItems, { emitToast: true });
    }
  };

  return (
    <TeamLayout team={team} activeMenuItem="scan">
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#6B21A8] mb-1 sm:mb-2">
            {t.scan.title}
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-gray-600">{t.scan.subtitle}</p>
        </div>
        <Button
          variant="outline"
          className="hidden sm:inline-flex border-gray-300 text-gray-700 hover:bg-gray-50 h-10 sm:h-11 text-xs sm:text-sm w-full sm:w-auto"
          onClick={() => setIsScannerOpen(true)}
        >
          <ScanLine className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          {t.scan.openScanner}
        </Button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 mb-6 space-y-3">
        <p className="text-sm text-gray-600">{t.scan.manualLookupHint}</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            value={manualCode}
            onChange={(event) => setManualCode(event.target.value)}
            placeholder={t.scan.codePlaceholder}
            className="h-11"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void handleLookup(manualCode);
              }
            }}
          />
          <Button
            className="h-11 bg-[#6B21A8] hover:bg-[#7C3AED]"
            onClick={() => void handleLookup(manualCode)}
            disabled={isLoading}
          >
            <Search className="h-4 w-4 mr-2" />
            {isLoading ? t.common.loading : t.scan.lookupButton}
          </Button>
        </div>

        {scanState !== "idle" ? (
          <div
            className={`rounded-lg border px-3 py-2 sm:px-4 sm:py-3 transition-all ${
              scanState === "loading"
                ? "bg-blue-50 border-blue-200"
                : scanState === "success"
                  ? "bg-green-50 border-green-200"
                  : scanState === "multiple"
                    ? "bg-amber-50 border-amber-200"
                    : scanState === "not_found" || scanState === "error"
                      ? "bg-red-50 border-red-200"
                      : "bg-gray-50 border-gray-200"
            }`}
          >
            <div className="flex items-start gap-2 sm:gap-3">
              {scanState === "loading" ? (
                <div className="h-4 w-4 mt-0.5 rounded-full border-2 border-blue-300 border-t-blue-600 animate-spin" />
              ) : null}
              {scanState === "success" ? (
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-700" />
              ) : null}
              {scanState === "multiple" ? (
                <Layers3 className="h-4 w-4 mt-0.5 text-amber-700" />
              ) : null}
              {scanState === "not_found" || scanState === "error" ? (
                <AlertCircle className="h-4 w-4 mt-0.5 text-red-700" />
              ) : null}
              <div className="min-w-0">
                <p
                  className={`text-xs sm:text-sm font-semibold ${
                    scanState === "loading"
                      ? "text-blue-800"
                      : scanState === "success"
                        ? "text-green-800"
                        : scanState === "multiple"
                          ? "text-amber-800"
                          : "text-red-800"
                  }`}
                >
                  {scanState === "loading"
                    ? t.common.loading
                    : scanState === "success"
                      ? t.scan.itemFound
                      : scanState === "multiple"
                        ? t.scan.multipleItemsFound
                        : t.common.error}
                </p>
                <p className="text-xs sm:text-sm text-gray-700 break-words">{scanMessage}</p>
                {lastCode ? (
                  <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">
                    QR: <span className="font-mono">{lastCode}</span>
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Info className="h-4 w-4 text-gray-500" />
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">{t.scan.resultsTitle}</h2>
        </div>

        {multipleResults.length === 0 ? (
          <p className="text-sm text-gray-500">
            {lastCode ? t.scan.noMultipleResults : t.scan.resultsEmptyHint}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead>
                <tr className="text-left text-gray-600">
                  <th className="px-3 py-2 font-semibold">{t.items.item}</th>
                  <th className="px-3 py-2 font-semibold">{t.items.sku}</th>
                  <th className="px-3 py-2 font-semibold">{t.items.stock}</th>
                  <th className="px-3 py-2 font-semibold">{t.locations.title}</th>
                  <th className="px-3 py-2 font-semibold">{t.common.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {multipleResults.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-900">{item.name || t.items.unnamedItem}</td>
                    <td className="px-3 py-2 text-gray-700">{item.sku || "-"}</td>
                    <td className="px-3 py-2 text-gray-700">{item.currentStock ?? 0}</td>
                    <td className="px-3 py-2 text-gray-700">{item.locationName || t.reports.noLocation}</td>
                    <td className="px-3 py-2">
                      <Button
                        variant="outline"
                        className="border-gray-300"
                        onClick={() => setSummaryItem(item)}
                      >
                        {t.scan.openSummary}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleLookup}
        onManualEnter={handleLookup}
      />

      {isLoading ? (
        <div className="fixed inset-0 z-50 bg-white/85 backdrop-blur-[1px] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 rounded-full border-4 border-[#C4B5FD] border-t-[#6B21A8] animate-spin" />
            <p className="text-sm font-medium text-gray-700">{t.common.loading}</p>
          </div>
        </div>
      ) : null}

      <Button
        onClick={() => setIsScannerOpen(true)}
        className="sm:hidden fixed bottom-5 left-1/2 -translate-x-1/2 z-40 h-20 w-20 rounded-full p-0 bg-[#6B21A8] hover:bg-[#7C3AED] shadow-xl border-2 border-white"
        aria-label={t.scan.openScanner}
        title={t.scan.openScanner}
      >
        <ScanLine className="h-8 w-8" />
      </Button>

      {summaryItem ? (
        <div className="fixed inset-0 z-50 bg-black/50 p-4 flex items-center justify-center">
          <div className="w-full max-w-xl max-h-[85vh] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">{t.scan.summaryTitle}</h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setSummaryItem(null)}
                aria-label={t.common.close}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-[160px,1fr] gap-4 overflow-y-auto">
              <div>
                {summaryItem.photoData ? (
                  <img
                    src={summaryItem.photoData}
                    alt={summaryItem.name || t.items.unnamedItem}
                    className="w-full h-40 object-cover rounded-lg border border-gray-200"
                  />
                ) : (
                  <div className="w-full h-40 rounded-lg border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-xs text-gray-500 text-center px-2">
                    {t.scan.noPhoto}
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs uppercase text-gray-500">{t.items.item}</p>
                  <p className="font-medium text-gray-900">{summaryItem.name || t.items.unnamedItem}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">{t.items.sku}</p>
                  <p className="font-medium text-gray-900">{summaryItem.sku || "-"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">{t.labels.barcode}</p>
                  <p className="font-mono text-sm text-gray-900">{summaryItem.barcode || "-"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">{t.items.stock}</p>
                  <p className="font-medium text-gray-900">{summaryItem.currentStock ?? 0}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">{t.locations.title}</p>
                  <p className="font-medium text-gray-900">{summaryItem.locationName || t.reports.noLocation}</p>
                </div>
                {summaryCustomFields.length > 0 ? (
                  <div>
                    <p className="text-xs uppercase text-gray-500">{t.itemForm.customFieldsTitle}</p>
                    <div className="mt-2 space-y-2">
                      {summaryCustomFields.map(([key, value]) => (
                        <div key={key} className="rounded-md border border-gray-200 px-3 py-2">
                          <p className="text-[11px] uppercase tracking-wide text-gray-500">
                            {customFieldLabelByKey.get(key) ?? key}
                          </p>
                          <p className="text-sm font-medium text-gray-900 break-words">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </TeamLayout>
  );
}
