"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Info, ScanLine, Plus, Minus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/lib/i18n";
import { fetchApiJsonResult } from "@/lib/api-client";
import { ERROR_CODES } from "@/lib/errors";
import { logoutAndRedirectToLogin } from "@/lib/client-auth";
import {
  readLocalStorageJson,
  removeLocalStorageEntry,
  writeLocalStorageJson,
} from "@/lib/local-storage";
import { useToast } from "@/components/ui/use-toast-simple";
import { BarcodeScannerModal } from "@/components/BarcodeScannerModal";
import { TeamLayout } from "@/components/shared/TeamLayout";
import { TutorialTour, type TourStep } from "@/components/TutorialTour";
import { createMoveAction } from "../_actions/createStockTransaction";
import { parseDecimalInput } from "@/lib/utils/parse-decimal-input";
import type { DestinationTeam, Item, Location, Team, SelectedItem } from "../_types";

interface MovePageClientProps {
  items: Item[];
  locations: Location[];
  destinationTeams: DestinationTeam[];
  team: Team;
}

interface MoveDraft {
  activeTab: "location" | "team";
  sourceLocation: string;
  destinationLocation: string;
  destinationTeamId: string;
  selectedItems: SelectedItem[];
  notes: string;
}

export function MovePageClient({
  items,
  locations,
  destinationTeams,
  team,
}: MovePageClientProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"location" | "team">("location");
  const [sourceLocation, setSourceLocation] = useState<string>(
    locations.length > 0 ? locations[0].id.toString() : ""
  );
  const [destinationLocation, setDestinationLocation] = useState<string>("");
  const [destinationTeamId, setDestinationTeamId] = useState<string>("");
  const [itemSearch, setItemSearch] = useState("");
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isSyncingBilling, setIsSyncingBilling] = useState(false);
  const [hasLoadedDraft, setHasLoadedDraft] = useState(false);
  const draftStorageKey = `inventory-draft:move:${team.id}`;
  const hasDestinationTeams = destinationTeams.length > 0;
  const isTeamTransferUnavailable = activeTab === "team" && !hasDestinationTeams;
  const tourSteps: TourStep[] = [
    {
      target: "tour-move-tutorial",
      title: t.move.tourTutorialTitle,
      description: t.move.tourTutorialDesc,
    },
    {
      target: "tour-move-locations",
      title: t.move.tourLocationsTitle,
      description: t.move.tourLocationsDesc,
    },
    {
      target: "tour-move-items",
      title: t.move.tourItemsTitle,
      description: t.move.tourItemsDesc,
    },
    {
      target: "tour-move-table",
      title: t.move.tourTableTitle,
      description: t.move.tourTableDesc,
    },
    {
      target: "tour-move-notes",
      title: t.move.tourNotesTitle,
      description: t.move.tourNotesDesc,
    },
    {
      target: "tour-move-submit",
      title: t.move.tourSubmitTitle,
      description: t.move.tourSubmitDesc,
    },
    {
      target: "tour-sidebar",
      title: t.move.tourSidebarTitle,
      description: t.move.tourSidebarDesc,
    },
  ];

  const normalizedSearch = itemSearch.trim().toLowerCase();
  const hasItemFilters = normalizedSearch.length > 0;

  const filteredItems = items.filter((item) => {
    if (!hasItemFilters) return false;
    return Boolean(
      item.name?.toLowerCase().includes(normalizedSearch) ||
        item.sku?.toLowerCase().includes(normalizedSearch) ||
        item.barcode?.toLowerCase().includes(normalizedSearch)
    );
  });

  useEffect(() => {
    const draft = readLocalStorageJson<MoveDraft>(draftStorageKey);

    if (draft) {
      setActiveTab(draft.activeTab || "location");
      setSourceLocation(draft.sourceLocation || "");
      setDestinationLocation(draft.destinationLocation || "");
      setDestinationTeamId(draft.destinationTeamId || "");
      setSelectedItems(Array.isArray(draft.selectedItems) ? draft.selectedItems : []);
      setNotes(draft.notes || "");
    }

    setHasLoadedDraft(true);
  }, [draftStorageKey]);

  useEffect(() => {
    if (!hasLoadedDraft) {
      return;
    }

    if (
      selectedItems.length === 0 &&
      notes.trim() === "" &&
      activeTab === "location" &&
      destinationLocation === "" &&
      destinationTeamId === ""
    ) {
      removeLocalStorageEntry(draftStorageKey);
      return;
    }

    writeLocalStorageJson<MoveDraft>(draftStorageKey, {
      activeTab,
      sourceLocation,
      destinationLocation,
      destinationTeamId,
      selectedItems,
      notes,
    });
  }, [
    activeTab,
    destinationLocation,
    destinationTeamId,
    draftStorageKey,
    hasLoadedDraft,
    notes,
    selectedItems,
    sourceLocation,
  ]);

  const handleAddItem = (item: Item) => {
    const exists = selectedItems.find((si) => si.item.id === item.id);
    if (exists) {
      setSelectedItems(
        selectedItems.map((si) =>
          si.item.id === item.id ? { ...si, quantity: si.quantity + 1 } : si
        )
      );
    } else {
      setSelectedItems([...selectedItems, { item, quantity: 1 }]);
    }
    setItemSearch("");
  };

  const handleBarcodeScan = async (barcode: string) => {
    const foundItem = items.find((item) => item.barcode === barcode);

    if (foundItem) {
      handleAddItem(foundItem);
      toast({
        variant: "success",
        title: t.move.itemFound,
        description: `${foundItem.name || t.items.unnamedItem} ${t.move.itemAddedToList}`,
      });
    } else {
      toast({
        variant: "destructive",
        title: t.move.itemNotFound,
        description: `${t.move.noItemWithBarcode} ${barcode}`,
      });
    }
  };

  const handleQuantityChange = (itemId: number, quantity: number) => {
    if (quantity < 0) return;
    const item = selectedItems.find((si) => si.item.id === itemId);
    const maxStock = item?.item.currentStock ?? 0;
    if (quantity > maxStock) {
      toast({
        variant: "destructive",
        title: t.common.error,
        description: t.move.quantityExceedsStock,
      });
      return;
    }
    setSelectedItems(
      selectedItems.map((si) => (si.item.id === itemId ? { ...si, quantity } : si))
    );
  };

  const handleRemoveItem = (itemId: number) => {
    setSelectedItems(selectedItems.filter((si) => si.item.id !== itemId));
  };

  const totalItems = selectedItems.reduce((sum, si) => sum + si.quantity, 0);
  const totalQuantity = selectedItems.reduce((sum, si) => sum + si.quantity, 0);
  const selectedDestinationTeam =
    activeTab === "team"
      ? destinationTeams.find((destinationTeam) => destinationTeam.id.toString() === destinationTeamId)
      : null;

  const handleSubmit = async () => {
    if (isSubmitting) {
      return;
    }

    if (!sourceLocation) {
      toast({
        variant: "destructive",
        title: t.common.error,
        description: t.move.selectSourceLocationFirst,
      });
      return;
    }

    if (activeTab === "location") {
      if (!destinationLocation) {
        toast({
          variant: "destructive",
          title: t.common.error,
          description: t.move.selectLocationsFirst,
        });
        return;
      }
      if (sourceLocation === destinationLocation) {
        toast({
          variant: "destructive",
          title: t.common.error,
          description: t.move.sameLocationError,
        });
        return;
      }
    } else if (!destinationTeamId) {
      toast({
        variant: "destructive",
        title: t.common.error,
        description: hasDestinationTeams
          ? t.move.selectDestinationTeamFirst
          : t.move.noActiveDestinationTeams,
      });
      return;
    }

    if (selectedItems.length === 0) {
      toast({
        variant: "destructive",
        title: t.common.error,
        description: t.move.noItemsSelected,
      });
      return;
    }

    const invalidItem = selectedItems.find((si) => !si.quantity || si.quantity <= 0);
    if (invalidItem) {
      toast({
        variant: "destructive",
        title: t.common.error,
        description: t.move.quantityRequired,
      });
      return;
    }

    const exceedsStock = selectedItems.find((si) => {
      const currentStock = si.item.currentStock ?? 0;
      return si.quantity > currentStock;
    });

    if (exceedsStock) {
      toast({
        variant: "destructive",
        title: t.common.error,
        description: t.move.quantityExceedsStock,
      });
      return;
    }

    const batchTransferGroupId =
      activeTab === "team"
        ? (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`)
        : null;

    if (activeTab === "team") {
      const summaryLines = selectedItems.map((si) => {
        const itemName = si.item.name || t.items.unnamedItem;
        return `- ${itemName}: ${si.quantity}`;
      });
      const confirmMessage = [
        t.move.reviewTransferImpact,
        `${team.name} -> ${selectedDestinationTeam?.name || t.move.destinationTeamPlaceholder}`,
        ...summaryLines,
      ].join("\n");

      if (!window.confirm(confirmMessage)) {
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const results = await Promise.all(
        selectedItems.map((si) =>
          createMoveAction(team.id, {
            itemId: si.item.id,
            quantity: si.quantity,
            sourceLocationId: sourceLocation ? parseInt(sourceLocation, 10) : null,
            destinationLocationId:
              activeTab === "location" && destinationLocation
                ? parseInt(destinationLocation, 10)
                : null,
            destinationKind: activeTab === "team" ? "team" : "location",
            destinationTeamId:
              activeTab === "team" && destinationTeamId
                ? parseInt(destinationTeamId, 10)
                : null,
            transferGroupId: batchTransferGroupId,
            notes: notes || null,
          })
        )
      );

      const firstError = results.find((r) => !r.success);
      if (firstError) {
        if (firstError.errorCode === ERROR_CODES.USER_NOT_AUTHENTICATED) {
          await logoutAndRedirectToLogin({
            message: firstError.error || "User not authenticated",
            title: t.common.error,
            toast,
            router,
          });
          return;
        }

        toast({
          variant: "destructive",
          title: t.common.error,
          description:
            firstError.error ||
            (activeTab === "team" ? t.move.partialTeamTransferError : t.move.partialMoveError),
        });
        return;
      }

      toast({
        variant: "success",
        title: t.common.success,
        description:
          activeTab === "team"
            ? `${t.move.stockTransferredTeamSuccess} ${selectedItems.length} ${
                t.move.items.toLowerCase()
              } (${totalQuantity}) ${t.move.transferSummaryToTeamPrefix} ${
                selectedDestinationTeam?.name || "-"
              }.`
            : t.move.stockMovedSuccess,
      });

      removeLocalStorageEntry(draftStorageKey);
      setActiveTab("location");
      setDestinationLocation("");
      setDestinationTeamId("");
      setSelectedItems([]);
      setNotes("");
      setItemSearch("");
    } catch (error) {
      console.error("Error moving stock:", error);
      toast({
        variant: "destructive",
        title: t.common.error,
        description: activeTab === "team" ? t.move.teamTransferError : t.move.moveError,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSyncDestinationTeams = async () => {
    if (isSyncingBilling) {
      return;
    }

    setIsSyncingBilling(true);
    try {
      const result = await fetchApiJsonResult<{ synced: boolean; subscriptionStatus: string | null }>(
        `/api/teams/${team.id}/billing/sync`,
        {
          method: "POST",
          fallbackError: t.move.syncBillingError,
        }
      );

      if (!result.ok) {
        toast({
          variant: "destructive",
          title: t.common.error,
          description: result.error.error || t.move.syncBillingError,
        });
        return;
      }

      toast({
        variant: "success",
        title: t.common.success,
        description: t.move.syncBillingSuccess,
      });
      router.refresh();
    } catch (error) {
      console.error("Error syncing destination team billing:", error);
      toast({
        variant: "destructive",
        title: t.common.error,
        description: t.move.syncBillingError,
      });
    } finally {
      setIsSyncingBilling(false);
    }
  };

  return (
    <TeamLayout team={team} activeMenuItem="move">
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-blue-600 mb-1 sm:mb-2">
            {t.move.title}
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-gray-600">{t.move.subtitle}</p>
        </div>
        <Button
          variant="outline"
          onClick={() => setIsTutorialOpen(true)}
          data-tour="tour-move-tutorial"
          className="border-gray-300 text-gray-700 hover:bg-gray-50 h-10 sm:h-11 text-xs sm:text-sm w-full sm:w-auto touch-manipulation min-h-[40px] sm:min-h-0"
        >
          <Info className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          {t.common.tutorial}
        </Button>
      </div>

      <div className="mb-4 sm:mb-6" data-tour="tour-move-locations">
        <div className="inline-flex bg-gray-100 rounded-lg p-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab("location");
            }}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
              activeTab === "location"
                ? "bg-white text-[#6B21A8] shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {t.move.tabByLocation}
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("team");
              if (!destinationTeamId && destinationTeams.length > 0) {
                setDestinationTeamId(destinationTeams[0].id.toString());
              }
            }}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
              activeTab === "team"
                ? "bg-white text-[#6B21A8] shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {t.move.tabByTeam}
          </button>
        </div>
      </div>

      <div className="mb-4 sm:mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4" data-tour="tour-move-locations">
        <div>
          <Label htmlFor="sourceLocation" className="text-sm font-semibold text-gray-700 mb-2 block">
            {t.move.sourceLocationRequired}
          </Label>
          <Select value={sourceLocation} onValueChange={setSourceLocation}>
            <SelectTrigger
              id="sourceLocation"
              className="w-full h-11 text-base border-gray-300 focus:border-[#6B21A8] focus:ring-[#6B21A8]"
            >
              <SelectValue placeholder={t.move.defaultLocation} />
            </SelectTrigger>
            <SelectContent>
              {locations.map((location) => (
                <SelectItem key={location.id} value={location.id.toString()}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {activeTab === "location" ? (
          <div>
            <Label
              htmlFor="destinationLocation"
              className="text-sm font-semibold text-gray-700 mb-2 block"
            >
              {t.move.destinationLocationRequired}
            </Label>
            <Select value={destinationLocation} onValueChange={setDestinationLocation}>
              <SelectTrigger
                id="destinationLocation"
                className="w-full h-11 text-base border-gray-300 focus:border-[#6B21A8] focus:ring-[#6B21A8]"
              >
                <SelectValue placeholder={t.move.defaultLocation} />
              </SelectTrigger>
              <SelectContent>
                {locations.map((location) => (
                  <SelectItem key={location.id} value={location.id.toString()}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div>
            <Label
              htmlFor="destinationTeam"
              className="text-sm font-semibold text-gray-700 mb-2 block"
            >
              {t.move.destinationTeamRequired}
            </Label>
            <Select value={destinationTeamId} onValueChange={setDestinationTeamId}>
              <SelectTrigger
                id="destinationTeam"
                className="w-full h-11 text-base border-gray-300 focus:border-[#6B21A8] focus:ring-[#6B21A8]"
              >
                <SelectValue placeholder={t.move.destinationTeamPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {destinationTeams.map((destinationTeam) => (
                  <SelectItem key={destinationTeam.id} value={destinationTeam.id.toString()}>
                    {destinationTeam.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!hasDestinationTeams && (
              <div className="mt-2 space-y-2">
                <p className="text-sm text-amber-700">{t.move.noActiveDestinationTeams}</p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSyncDestinationTeams}
                  disabled={isSyncingBilling}
                  className="h-8 px-3 text-xs"
                >
                  {isSyncingBilling ? t.move.syncBillingInProgress : t.move.syncBillingCta}
                </Button>
                <Link
                  href="/team_selection"
                  className="inline-flex text-xs text-[#6B21A8] underline underline-offset-2 hover:text-[#581c87]"
                >
                  {t.move.manageTeamsCta}
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mb-4 sm:mb-6" data-tour="tour-move-items">
        <Label htmlFor="items" className="text-sm font-semibold text-gray-700 mb-2 block">
          {t.move.items}
        </Label>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
            <Input
              id="items"
              type="text"
              placeholder={t.move.searchItem}
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
              className="pl-9 sm:pl-10 h-11 text-base border-gray-300 focus:border-[#6B21A8] focus:ring-[#6B21A8]"
            />
            {hasItemFilters && filteredItems.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleAddItem(item)}
                    className="w-full text-left px-4 py-3 hover:bg-purple-50 transition-colors border-b border-gray-100 last:border-b-0"
                  >
                    <div className="font-medium text-gray-900">{item.name || t.items.unnamedItem}</div>
                    {item.sku && <div className="text-xs text-gray-500">SKU: {item.sku}</div>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setItemSearch("")}
            className="border-gray-300 text-gray-700 hover:bg-gray-50 h-11 text-xs sm:text-sm"
          >
            {t.common.clearFilter}
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsScannerOpen(true)}
            className="border-gray-300 text-gray-700 hover:bg-gray-50 h-11 text-xs sm:text-sm"
          >
            <ScanLine className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">{t.move.scanBarcode}</span>
            <span className="sm:hidden">Scan</span>
          </Button>
        </div>
      </div>

      <div
        className="mb-4 sm:mb-6 bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 overflow-hidden"
        data-tour="tour-move-table"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
              <tr>
                <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  {t.move.item}
                </th>
                <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden sm:table-cell">
                  {t.move.currentStock}
                </th>
                <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden md:table-cell">
                  {t.items.sku}
                </th>
                <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  {t.move.quantityToMove}
                </th>
                <th className="px-4 sm:px-6 py-3 sm:py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                  {t.common.actions}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {selectedItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 sm:px-6 py-8 text-center text-gray-500 text-sm">
                    {t.move.noItemsSelected}
                  </td>
                </tr>
              ) : (
                selectedItems.map((selectedItem) => {
                  const maxStock = selectedItem.item.currentStock ?? 0;
                  return (
                    <tr key={selectedItem.item.id} className="hover:bg-purple-50/50 transition-colors">
                      <td className="px-4 sm:px-6 py-4 sm:py-5">
                        <div className="text-sm font-bold text-gray-900">
                          {selectedItem.item.name || t.items.unnamedItem}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 sm:py-5 hidden sm:table-cell text-sm text-gray-900">
                        {maxStock}
                      </td>
                      <td className="px-4 sm:px-6 py-4 sm:py-5 hidden md:table-cell text-sm text-gray-900">
                        {selectedItem.item.sku || "-"}
                      </td>
                      <td className="px-4 sm:px-6 py-4 sm:py-5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              handleQuantityChange(selectedItem.item.id, selectedItem.quantity - 1)
                            }
                            className="p-1.5 text-gray-500 hover:text-[#6B21A8] hover:bg-purple-50 rounded-lg transition-all"
                            disabled={selectedItem.quantity <= 1}
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <Input
                            type="number"
                            min="0.1"
                            step="0.1"
                            max={maxStock}
                            value={selectedItem.quantity}
                            onChange={(e) =>
                              handleQuantityChange(
                                selectedItem.item.id,
                                parseDecimalInput(e.target.value)
                              )
                            }
                            className="w-24 h-10 text-center border-gray-300"
                          />
                          <button
                            onClick={() =>
                              handleQuantityChange(selectedItem.item.id, selectedItem.quantity + 1)
                            }
                            className="p-1.5 text-gray-500 hover:text-[#6B21A8] hover:bg-purple-50 rounded-lg transition-all"
                            disabled={selectedItem.quantity >= maxStock}
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 sm:py-5 text-right">
                        <button
                          onClick={() => handleRemoveItem(selectedItem.item.id)}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mb-4 sm:mb-6" data-tour="tour-move-notes">
        <Label htmlFor="notes" className="text-sm font-semibold text-gray-700 mb-2 block">
          {t.move.notes}
        </Label>
        <Textarea
          id="notes"
          placeholder={t.move.notesPlaceholder}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="min-h-[100px] border-gray-300 focus:border-[#6B21A8] focus:ring-[#6B21A8]"
        />
      </div>

      <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6" data-tour="tour-move-submit">
        {activeTab === "team" && (
          <div className="mb-4 rounded-lg border border-violet-200 bg-violet-50 p-3 text-sm text-violet-900">
            <p className="font-semibold">{t.move.reviewTransferImpact}</p>
            <p className="mt-1">
              {`${team.name} -> ${selectedDestinationTeam?.name || t.move.destinationTeamPlaceholder} | ${selectedItems.length} ${t.move.items.toLowerCase()} | ${totalQuantity} ${t.move.quantityToMove.toLowerCase()}`}
            </p>
            {selectedItems.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-xs text-violet-800">
                {selectedItems.map((selectedItem) => (
                  <li key={selectedItem.item.id}>
                    {(selectedItem.item.name || t.items.unnamedItem) + `: ${selectedItem.quantity}`}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm text-gray-600">{t.move.totalItemsToMove}</p>
            <p className="text-2xl font-bold text-gray-900">{totalItems}</p>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              selectedItems.length === 0 ||
              isTeamTransferUnavailable
            }
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 h-auto"
          >
            {isSubmitting
              ? t.common.loading
              : activeTab === "team"
                ? t.move.transferBetweenTeams
                : t.move.moveStock}
          </Button>
        </div>
      </div>

      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScan}
      />

      <TutorialTour isOpen={isTutorialOpen} onClose={() => setIsTutorialOpen(false)} steps={tourSteps} />
    </TeamLayout>
  );
}
