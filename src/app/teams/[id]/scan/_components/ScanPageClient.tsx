"use client";

import { useState } from "react";
import { Info, ScanLine, Search, X } from "lucide-react";
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
};

interface ScanPageClientProps {
  team: TeamDto;
}

export function ScanPageClient({ team }: ScanPageClientProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lastCode, setLastCode] = useState("");
  const [multipleResults, setMultipleResults] = useState<LookupItem[]>([]);
  const [summaryItem, setSummaryItem] = useState<LookupItem | null>(null);

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

    setIsLoading(true);
    setLastCode(code);
    setMultipleResults([]);

    try {
      const result = await fetchApiResult<{ items: LookupItem[] }>(
        `/api/teams/${team.id}/items/lookup?code=${encodeURIComponent(code)}`,
        { fallbackError: t.scan.lookupError }
      );

      if (!result.ok) {
        toast({
          variant: "destructive",
          title: t.common.error,
          description: result.error.error,
        });
        return;
      }

      const items = result.data.items ?? [];
      if (items.length === 0) {
        toast({
          variant: "destructive",
          title: t.scan.itemNotFound,
          description: `${t.scan.noItemWithCode} ${code}`,
        });
        return;
      }

      if (items.length === 1) {
        toast({
          variant: "success",
          title: t.scan.itemFound,
          description: t.scan.openingSummary,
        });
        setSummaryItem(items[0]);
        return;
      }

      setMultipleResults(items);
      toast({
        variant: "default",
        title: t.scan.multipleItemsFound,
        description: t.scan.selectItemFromList,
      });
    } catch (error) {
      console.error("Error looking up item by code:", error);
      toast({
        variant: "destructive",
        title: t.common.error,
        description: t.scan.lookupError,
      });
    } finally {
      setIsLoading(false);
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
          className="border-gray-300 text-gray-700 hover:bg-gray-50 h-10 sm:h-11 text-xs sm:text-sm w-full sm:w-auto"
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
              if (event.key === "Enter" && !isLoading) {
                handleLookup(manualCode);
              }
            }}
          />
          <Button
            className="h-11 bg-[#6B21A8] hover:bg-[#7C3AED]"
            onClick={() => handleLookup(manualCode)}
            disabled={isLoading}
          >
            <Search className="h-4 w-4 mr-2" />
            {isLoading ? t.common.loading : t.scan.lookupButton}
          </Button>
        </div>
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

      {summaryItem ? (
        <div className="fixed inset-0 z-50 bg-black/50 p-4 flex items-center justify-center">
          <div className="w-full max-w-xl bg-white rounded-xl shadow-2xl overflow-hidden">
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
            <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-[160px,1fr] gap-4">
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
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </TeamLayout>
  );
}
