"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Info, ScanLine, Plus, Minus, Trash2, PackagePlus } from "lucide-react";
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
import { useToast } from "@/components/ui/use-toast-simple";
import { ERROR_CODES } from "@/lib/errors";
import { logoutAndRedirectToLogin } from "@/lib/client-auth";
import {
  readLocalStorageJson,
  removeLocalStorageEntry,
  writeLocalStorageJson,
} from "@/lib/local-storage";
import { BarcodeScannerModal } from "@/components/BarcodeScannerModal";
import { TeamLayout } from "@/components/shared/TeamLayout";
import { TutorialTour, type TourStep } from "@/components/TutorialTour";
import type { ItemDto } from "@/lib/services/types";
import { createStockInAction } from "../_actions/createStockTransaction";
import { CreateItemInlineModal } from "./CreateItemInlineModal";
import type { Item, Location, Team, SelectedItem } from "../_types";

interface StockInPageClientProps {
  items: Item[];
  locations: Location[];
  team: Team;
}

function looksLikeBarcode(value: string) {
  return /^\d{8,}$/.test(value.trim());
}

function normalizeItemForStockIn(item: ItemDto): Item {
  return {
    id: item.id,
    name: item.name,
    sku: item.sku,
    barcode: item.barcode,
    currentStock: item.currentStock,
    locationName: item.locationName,
  };
}

interface StockInDraft {
  selectedLocation: string;
  selectedItems: SelectedItem[];
  notes: string;
}

export function StockInPageClient({ items, locations, team }: StockInPageClientProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [selectedLocation, setSelectedLocation] = useState<string>(
    locations.length > 0 ? locations[0].id.toString() : ""
  );
  const [availableItems, setAvailableItems] = useState<Item[]>(items);
  const [itemSearch, setItemSearch] = useState("");
  const [itemSearchSource, setItemSearchSource] = useState<"search" | "barcode">("search");
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isCreateItemModalOpen, setIsCreateItemModalOpen] = useState(false);
  const [hasLoadedDraft, setHasLoadedDraft] = useState(false);
  const [createItemInitialValues, setCreateItemInitialValues] = useState({
    name: "",
    barcode: "",
  });
  const draftStorageKey = `inventory-draft:stock-in:${team.id}`;
  const tourSteps: TourStep[] = [
    { target: "tour-stock-in-tutorial", title: t.stockIn.tourTutorialTitle, description: t.stockIn.tourTutorialDesc },
    { target: "tour-stock-in-location", title: t.stockIn.tourLocationTitle, description: t.stockIn.tourLocationDesc },
    { target: "tour-stock-in-items", title: t.stockIn.tourItemsTitle, description: t.stockIn.tourItemsDesc },
    { target: "tour-stock-in-table", title: t.stockIn.tourTableTitle, description: t.stockIn.tourTableDesc },
    { target: "tour-stock-in-notes", title: t.stockIn.tourNotesTitle, description: t.stockIn.tourNotesDesc },
    { target: "tour-stock-in-submit", title: t.stockIn.tourSubmitTitle, description: t.stockIn.tourSubmitDesc },
    { target: "tour-sidebar", title: t.stockIn.tourSidebarTitle, description: t.stockIn.tourSidebarDesc },
  ];

  useEffect(() => {
    setAvailableItems(items);
  }, [items]);

  useEffect(() => {
    const draft = readLocalStorageJson<StockInDraft>(draftStorageKey);

    if (draft) {
      setSelectedLocation(draft.selectedLocation || "");
      setSelectedItems(Array.isArray(draft.selectedItems) ? draft.selectedItems : []);
      setNotes(draft.notes || "");
    }

    setHasLoadedDraft(true);
  }, [draftStorageKey]);

  useEffect(() => {
    if (!hasLoadedDraft) {
      return;
    }

    if (selectedItems.length === 0 && notes.trim() === "") {
      removeLocalStorageEntry(draftStorageKey);
      return;
    }

    writeLocalStorageJson<StockInDraft>(draftStorageKey, {
      selectedLocation,
      selectedItems,
      notes,
    });
  }, [draftStorageKey, hasLoadedDraft, notes, selectedItems, selectedLocation]);

  const normalizedSearch = itemSearch.trim().toLowerCase();
  const hasItemFilters = normalizedSearch.length > 0;

  const filteredItems = availableItems.filter((item) => {
    if (!hasItemFilters) return false;
    return Boolean(
      item.name?.toLowerCase().includes(normalizedSearch) ||
        item.sku?.toLowerCase().includes(normalizedSearch) ||
        item.barcode?.toLowerCase().includes(normalizedSearch)
    );
  });

  const showCreateItemState = hasItemFilters && filteredItems.length === 0;

  const openCreateItemModal = (value: string, source: "search" | "barcode") => {
    const trimmedValue = value.trim();

    setCreateItemInitialValues({
      name: source === "search" ? trimmedValue : "",
      barcode:
        source === "barcode" || looksLikeBarcode(trimmedValue) ? trimmedValue : "",
    });
    setIsCreateItemModalOpen(true);
  };

  const handleAddItem = (item: Item) => {
    const exists = selectedItems.find((si) => si.item.id === item.id);
    if (exists) {
      setSelectedItems((currentItems) =>
        currentItems.map((si) =>
          si.item.id === item.id ? { ...si, quantity: si.quantity + 1 } : si
        )
      );
    } else {
      setSelectedItems((currentItems) => [...currentItems, { item, quantity: 1 }]);
    }
    setItemSearch("");
    setItemSearchSource("search");
  };

  const handleBarcodeScan = async (barcode: string) => {
    const foundItem = availableItems.find((item) => item.barcode === barcode);

    if (foundItem) {
      handleAddItem(foundItem);
      toast({
        variant: "success",
        title: t.stockIn.itemFound,
        description: `${foundItem.name || t.items.unnamedItem} ${t.stockIn.itemAddedToList}`,
      });
    } else {
      setItemSearchSource("barcode");
      setItemSearch(barcode);
      toast({
        variant: "default",
        title: t.stockIn.itemNotFound,
        description: `${t.stockIn.noItemWithBarcode} ${barcode}. ${t.stockIn.createMissingItemHint}`,
      });
    }
  };

  const handleCreateItemSuccess = async (item: ItemDto) => {
    const normalizedItem = normalizeItemForStockIn(item);

    setAvailableItems((currentItems) => {
      if (currentItems.some((currentItem) => currentItem.id === normalizedItem.id)) {
        return currentItems;
      }

      return [normalizedItem, ...currentItems];
    });

    handleAddItem(normalizedItem);
    setIsCreateItemModalOpen(false);
    toast({
      variant: "success",
      title: t.common.success,
      description: t.stockIn.createItemSuccessAndAdded,
    });
  };

  const handleQuantityChange = (itemId: number, quantity: number) => {
    if (quantity < 0) return;
    setSelectedItems(
      selectedItems.map((si) => (si.item.id === itemId ? { ...si, quantity } : si))
    );
  };

  const handleRemoveItem = (itemId: number) => {
    setSelectedItems(selectedItems.filter((si) => si.item.id !== itemId));
  };

  const totalItems = selectedItems.reduce((sum, si) => sum + si.quantity, 0);

  const handleSubmit = async () => {
    if (!selectedLocation) {
      toast({
        variant: "destructive",
        title: t.common.error,
        description: t.stockIn.selectLocationFirst,
      });
      return;
    }

    if (selectedItems.length === 0) {
      toast({
        variant: "destructive",
        title: t.common.error,
        description: t.stockIn.noItemsSelected,
      });
      return;
    }

    const invalidItem = selectedItems.find((si) => !si.quantity || si.quantity <= 0);
    if (invalidItem) {
      toast({
        variant: "destructive",
        title: t.common.error,
        description: t.stockIn.quantityRequired,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const results = await Promise.all(
        selectedItems.map((si) =>
          createStockInAction(team.id, {
            itemId: si.item.id,
            quantity: si.quantity,
            locationId: selectedLocation ? parseInt(selectedLocation, 10) : null,
            notes: notes || null,
          })
        )
      );

      const firstError = results.find((result) => !result.success);
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
          description: firstError.error || t.stockIn.partialAddError,
        });
        return;
      }

      toast({
        variant: "success",
        title: t.common.success,
        description: t.stockIn.stockAddedSuccess,
      });

      removeLocalStorageEntry(draftStorageKey);
      setSelectedItems([]);
      setNotes("");
      setItemSearch("");
      setItemSearchSource("search");
    } catch (error) {
      console.error("Error adding stock:", error);
      toast({
        variant: "destructive",
        title: t.common.error,
        description: t.stockIn.addError,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <TeamLayout team={team} activeMenuItem="stock-in">
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-green-600 mb-1 sm:mb-2">
            {t.stockIn.title}
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-gray-600">{t.stockIn.subtitle}</p>
        </div>
        <Button
          variant="outline"
          onClick={() => setIsTutorialOpen(true)}
          data-tour="tour-stock-in-tutorial"
          className="border-gray-300 text-gray-700 hover:bg-gray-50 h-10 sm:h-11 text-xs sm:text-sm w-full sm:w-auto touch-manipulation min-h-[40px] sm:min-h-0"
        >
          <Info className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          {t.common.tutorial}
        </Button>
      </div>

      <div className="mb-4 sm:mb-6" data-tour="tour-stock-in-location">
        <Label htmlFor="location" className="text-sm font-semibold text-gray-700 mb-2 block">
          {t.stockIn.locationRequired}
        </Label>
        <Select value={selectedLocation} onValueChange={setSelectedLocation}>
          <SelectTrigger
            id="location"
            className="w-full h-11 text-base border-gray-300 focus:border-[#6B21A8] focus:ring-[#6B21A8]"
          >
            <SelectValue placeholder={t.stockIn.defaultLocation} />
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

      <div className="mb-4 sm:mb-6" data-tour="tour-stock-in-items">
        <Label htmlFor="items" className="text-sm font-semibold text-gray-700 mb-2 block">
          {t.stockIn.items}
        </Label>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
            <Input
              id="items"
              type="text"
              placeholder={t.stockIn.searchItem}
              value={itemSearch}
              onChange={(e) => {
                setItemSearchSource("search");
                setItemSearch(e.target.value);
              }}
              className="pl-9 sm:pl-10 h-11 text-base border-gray-300 focus:border-[#6B21A8] focus:ring-[#6B21A8]"
            />
            {hasItemFilters && filteredItems.length > 0 ? (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleAddItem(item)}
                    className="w-full text-left px-4 py-3 hover:bg-purple-50 transition-colors border-b border-gray-100 last:border-b-0"
                  >
                    <div className="font-medium text-gray-900">
                      {item.name || t.items.unnamedItem}
                    </div>
                    {item.sku ? <div className="text-xs text-gray-500">SKU: {item.sku}</div> : null}
                    {item.currentStock !== null ? (
                      <div className="text-xs text-gray-500">
                        {t.stockIn.currentStockLabel}: {item.currentStock}
                      </div>
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setItemSearch("");
              setItemSearchSource("search");
            }}
            className="border-gray-300 text-gray-700 hover:bg-gray-50 h-11 text-xs sm:text-sm touch-manipulation min-h-[44px] sm:min-h-0"
          >
            {t.common.clearFilter}
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsScannerOpen(true)}
            className="border-gray-300 text-gray-700 hover:bg-gray-50 h-11 text-xs sm:text-sm touch-manipulation min-h-[44px] sm:min-h-0"
          >
            <ScanLine className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">{t.stockIn.scanBarcode}</span>
            <span className="sm:hidden">Scan</span>
          </Button>
        </div>

        {showCreateItemState ? (
          <div className="mt-3 rounded-xl border border-dashed border-purple-200 bg-purple-50/60 px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {t.stockIn.noSearchResultsCreate}
              </p>
              <p className="text-xs sm:text-sm text-gray-600">
                {t.stockIn.noSearchResultsCreateHint}
              </p>
            </div>
            <Button
              type="button"
              onClick={() => openCreateItemModal(itemSearch, itemSearchSource)}
              className="bg-[#6B21A8] hover:bg-[#6B21A8]/90 text-white w-full sm:w-auto"
            >
              <PackagePlus className="h-4 w-4 mr-2" />
              {t.stockIn.createItemCta}
            </Button>
          </div>
        ) : null}
      </div>

      <div className="mb-4 sm:mb-6 bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 overflow-hidden" data-tour="tour-stock-in-table">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
              <tr>
                <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  {t.stockIn.item}
                </th>
                <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden sm:table-cell">
                  {t.stockIn.currentStock}
                </th>
                <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden md:table-cell">
                  {t.items.sku}
                </th>
                <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  {t.stockIn.quantityToAdd}
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
                    {t.stockIn.noItemsSelected}
                  </td>
                </tr>
              ) : (
                selectedItems.map((selectedItem) => (
                  <tr key={selectedItem.item.id} className="hover:bg-purple-50/50 transition-colors">
                    <td className="px-4 sm:px-6 py-4 sm:py-5">
                      <div>
                        <div className="text-sm font-bold text-gray-900">
                          {selectedItem.item.name || t.items.unnamedItem}
                        </div>
                        <div className="text-xs text-gray-500 sm:hidden mt-1">
                          {t.stockIn.currentStockLabel}: {selectedItem.item.currentStock ?? 0}
                        </div>
                        <div className="text-xs text-gray-500 sm:hidden mt-1">
                          {t.items.sku}: {selectedItem.item.sku || "-"}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 sm:py-5 hidden sm:table-cell">
                      <span className="text-sm font-medium text-gray-900">
                        {selectedItem.item.currentStock ?? 0}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 sm:py-5 hidden md:table-cell">
                      <span className="text-sm font-medium text-gray-900">
                        {selectedItem.item.sku || "-"}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 sm:py-5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            handleQuantityChange(selectedItem.item.id, selectedItem.quantity - 1)
                          }
                          className="p-1.5 text-gray-500 hover:text-[#6B21A8] hover:bg-purple-50 rounded-lg transition-all touch-manipulation min-w-[36px] min-h-[36px] flex items-center justify-center"
                          disabled={selectedItem.quantity <= 1}
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <Input
                          type="number"
                          min="1"
                          value={selectedItem.quantity}
                          onChange={(e) =>
                            handleQuantityChange(
                              selectedItem.item.id,
                              parseInt(e.target.value, 10) || 0
                            )
                          }
                          className="w-20 sm:w-24 h-9 sm:h-10 text-center text-sm font-semibold border-gray-300 focus:border-[#6B21A8] focus:ring-[#6B21A8]"
                        />
                        <button
                          onClick={() =>
                            handleQuantityChange(selectedItem.item.id, selectedItem.quantity + 1)
                          }
                          className="p-1.5 text-gray-500 hover:text-[#6B21A8] hover:bg-purple-50 rounded-lg transition-all touch-manipulation min-w-[36px] min-h-[36px] flex items-center justify-center"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 sm:py-5 text-right">
                      <button
                        onClick={() => handleRemoveItem(selectedItem.item.id)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all touch-manipulation min-w-[36px] min-h-[36px] flex items-center justify-center"
                        aria-label="Remove item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mb-4 sm:mb-6" data-tour="tour-stock-in-notes">
        <Label htmlFor="notes" className="text-sm font-semibold text-gray-700 mb-2 block">
          {t.stockIn.notes}
        </Label>
        <Textarea
          id="notes"
          placeholder={t.stockIn.notesPlaceholder}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="min-h-[100px] text-base border-gray-300 focus:border-[#6B21A8] focus:ring-[#6B21A8] resize-y"
          rows={4}
        />
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-gray-200" data-tour="tour-stock-in-submit">
        <div className="text-sm sm:text-base font-semibold text-gray-700">
          {t.stockIn.totalItemsToAdd}: <span className="text-[#6B21A8]">{totalItems}</span>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || selectedItems.length === 0 || !selectedLocation}
          className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all w-full sm:w-auto touch-manipulation min-h-[48px] sm:min-h-0 px-6 sm:px-8"
        >
          {isSubmitting ? t.common.loading : t.stockIn.addStock}
        </Button>
      </div>

      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScan}
        onManualEnter={handleBarcodeScan}
      />
      <CreateItemInlineModal
        isOpen={isCreateItemModalOpen}
        team={team}
        initialValues={createItemInitialValues}
        onClose={() => setIsCreateItemModalOpen(false)}
        onSuccess={handleCreateItemSuccess}
      />
      <TutorialTour
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
        steps={tourSteps}
      />
    </TeamLayout>
  );
}
