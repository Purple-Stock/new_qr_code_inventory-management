"use client";

import { useState } from "react";
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
import { useToast } from "@/components/ui/use-toast-simple";
import { BarcodeScannerModal } from "@/components/BarcodeScannerModal";
import { TeamLayout } from "@/components/shared/TeamLayout";
import { TutorialTour, type TourStep } from "@/components/TutorialTour";
import { createStockOutAction } from "../_actions/createStockTransaction";
import type { Item, Location, Team, SelectedItem } from "../_types";

interface StockOutPageClientProps {
  items: Item[];
  locations: Location[];
  team: Team;
}

export function StockOutPageClient({ items, locations, team }: StockOutPageClientProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [selectedLocation, setSelectedLocation] = useState<string>(
    locations.length > 0 ? locations[0].id.toString() : ""
  );
  const [itemSearch, setItemSearch] = useState("");
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const tourSteps: TourStep[] = [
    { target: "tour-stock-out-tutorial", title: t.stockOut.tourTutorialTitle, description: t.stockOut.tourTutorialDesc },
    { target: "tour-stock-out-location", title: t.stockOut.tourLocationTitle, description: t.stockOut.tourLocationDesc },
    { target: "tour-stock-out-items", title: t.stockOut.tourItemsTitle, description: t.stockOut.tourItemsDesc },
    { target: "tour-stock-out-table", title: t.stockOut.tourTableTitle, description: t.stockOut.tourTableDesc },
    { target: "tour-stock-out-notes", title: t.stockOut.tourNotesTitle, description: t.stockOut.tourNotesDesc },
    { target: "tour-stock-out-submit", title: t.stockOut.tourSubmitTitle, description: t.stockOut.tourSubmitDesc },
    { target: "tour-sidebar", title: t.stockOut.tourSidebarTitle, description: t.stockOut.tourSidebarDesc },
  ];

  const filteredItems = items.filter((item) => {
    if (!itemSearch) return false;
    const query = itemSearch.toLowerCase();
    return (
      item.name?.toLowerCase().includes(query) ||
      item.sku?.toLowerCase().includes(query) ||
      item.barcode?.toLowerCase().includes(query)
    );
  });

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
        title: t.stockOut.itemFound,
        description: `${foundItem.name || t.items.unnamedItem} ${t.stockOut.itemAddedToList}`,
      });
    } else {
      toast({
        variant: "destructive",
        title: t.stockOut.itemNotFound,
        description: `${t.stockOut.noItemWithBarcode} ${barcode}`,
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
        description: t.stockOut.quantityExceedsStock,
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

  const handleSubmit = async () => {
    if (!selectedLocation) {
      toast({
        variant: "destructive",
        title: t.common.error,
        description: t.stockOut.selectLocationFirst,
      });
      return;
    }

    if (selectedItems.length === 0) {
      toast({
        variant: "destructive",
        title: t.common.error,
        description: t.stockOut.noItemsSelected,
      });
      return;
    }

    const invalidItem = selectedItems.find((si) => !si.quantity || si.quantity <= 0);
    if (invalidItem) {
      toast({
        variant: "destructive",
        title: t.common.error,
        description: t.stockOut.quantityRequired,
      });
      return;
    }

    // Check if any item exceeds stock
    const exceedsStock = selectedItems.find((si) => {
      const currentStock = si.item.currentStock ?? 0;
      return si.quantity > currentStock;
    });

    if (exceedsStock) {
      toast({
        variant: "destructive",
        title: t.common.error,
        description: t.stockOut.quantityExceedsStock,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Create transactions using Server Action
      const results = await Promise.all(
        selectedItems.map((si) =>
          createStockOutAction(team.id, {
            itemId: si.item.id,
            quantity: si.quantity,
            locationId: selectedLocation ? parseInt(selectedLocation) : null,
            notes: notes || null,
          })
        )
      );

      const hasError = results.some((r) => !r.success);
      if (hasError) {
        toast({
          variant: "destructive",
          title: t.common.error,
          description: t.stockOut.partialRemoveError,
        });
        return;
      }

      toast({
        variant: "success",
        title: t.common.success,
        description: t.stockOut.stockRemovedSuccess,
      });

      // Reset form
      setSelectedItems([]);
      setNotes("");
      setItemSearch("");
    } catch (error) {
      console.error("Error removing stock:", error);
      toast({
        variant: "destructive",
        title: t.common.error,
        description: t.stockOut.removeError,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <TeamLayout team={team} activeMenuItem="stock-out">
      {/* Page Header */}
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-red-600 mb-1 sm:mb-2">
            {t.stockOut.title}
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-gray-600">{t.stockOut.subtitle}</p>
        </div>
        <Button
          variant="outline"
          onClick={() => setIsTutorialOpen(true)}
          data-tour="tour-stock-out-tutorial"
          className="border-gray-300 text-gray-700 hover:bg-gray-50 h-10 sm:h-11 text-xs sm:text-sm w-full sm:w-auto touch-manipulation min-h-[40px] sm:min-h-0"
        >
          <Info className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          {t.common.tutorial}
        </Button>
      </div>

      {/* Location Section */}
      <div className="mb-4 sm:mb-6" data-tour="tour-stock-out-location">
        <Label htmlFor="location" className="text-sm font-semibold text-gray-700 mb-2 block">
          {t.stockOut.locationRequired}
        </Label>
        <Select value={selectedLocation} onValueChange={setSelectedLocation}>
          <SelectTrigger
            id="location"
            className="w-full h-11 text-base border-gray-300 focus:border-[#6B21A8] focus:ring-[#6B21A8]"
          >
            <SelectValue placeholder={t.stockOut.defaultLocation} />
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

      {/* Items Section */}
      <div className="mb-4 sm:mb-6" data-tour="tour-stock-out-items">
        <Label htmlFor="items" className="text-sm font-semibold text-gray-700 mb-2 block">
          {t.stockOut.items}
        </Label>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
            <Input
              id="items"
              type="text"
              placeholder={t.stockOut.searchItem}
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
              className="pl-9 sm:pl-10 h-11 text-base border-gray-300 focus:border-[#6B21A8] focus:ring-[#6B21A8]"
            />
            {itemSearch && filteredItems.length > 0 && (
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
                    {item.sku && <div className="text-xs text-gray-500">SKU: {item.sku}</div>}
                    {item.currentStock !== null && (
                      <div className="text-xs text-gray-500">
                        {t.stockOut.currentStockLabel}: {item.currentStock}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button
            variant="outline"
            onClick={() => setIsScannerOpen(true)}
            className="border-gray-300 text-gray-700 hover:bg-gray-50 h-11 text-xs sm:text-sm touch-manipulation min-h-[44px] sm:min-h-0"
          >
            <ScanLine className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">{t.stockOut.scanBarcode}</span>
            <span className="sm:hidden">Scan</span>
          </Button>
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-4 sm:mb-6 bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 overflow-hidden" data-tour="tour-stock-out-table">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
              <tr>
                <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  {t.stockOut.item}
                </th>
                <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden sm:table-cell">
                  {t.stockOut.currentStock}
                </th>
                <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  {t.stockOut.quantityToRemove}
                </th>
                <th className="px-4 sm:px-6 py-3 sm:py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                  {t.common.actions}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {selectedItems.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 sm:px-6 py-8 text-center text-gray-500 text-sm">
                    {t.stockOut.noItemsSelected}
                  </td>
                </tr>
              ) : (
                selectedItems.map((selectedItem) => {
                  const maxStock = selectedItem.item.currentStock ?? 0;
                  return (
                    <tr key={selectedItem.item.id} className="hover:bg-purple-50/50 transition-colors">
                      <td className="px-4 sm:px-6 py-4 sm:py-5">
                        <div>
                          <div className="text-sm font-bold text-gray-900">
                            {selectedItem.item.name || t.items.unnamedItem}
                          </div>
                          <div className="text-xs text-gray-500 sm:hidden mt-1">
                            {t.stockOut.currentStockLabel}: {maxStock}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 sm:py-5 hidden sm:table-cell">
                        <span className="text-sm font-medium text-gray-900">{maxStock}</span>
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
                            max={maxStock}
                            value={selectedItem.quantity}
                            onChange={(e) =>
                              handleQuantityChange(
                                selectedItem.item.id,
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="w-20 sm:w-24 h-9 sm:h-10 text-center text-sm font-semibold border-gray-300 focus:border-[#6B21A8] focus:ring-[#6B21A8]"
                          />
                          <button
                            onClick={() =>
                              handleQuantityChange(selectedItem.item.id, selectedItem.quantity + 1)
                            }
                            className="p-1.5 text-gray-500 hover:text-[#6B21A8] hover:bg-purple-50 rounded-lg transition-all touch-manipulation min-w-[36px] min-h-[36px] flex items-center justify-center"
                            disabled={selectedItem.quantity >= maxStock}
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Notes Section */}
      <div className="mb-4 sm:mb-6" data-tour="tour-stock-out-notes">
        <Label htmlFor="notes" className="text-sm font-semibold text-gray-700 mb-2 block">
          {t.stockOut.notes}
        </Label>
        <Textarea
          id="notes"
          placeholder={t.stockOut.notesPlaceholder}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="min-h-[100px] text-base border-gray-300 focus:border-[#6B21A8] focus:ring-[#6B21A8] resize-y"
          rows={4}
        />
      </div>

      {/* Summary and Submit */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-gray-200" data-tour="tour-stock-out-submit">
        <div className="text-sm sm:text-base font-semibold text-gray-700">
          {t.stockOut.totalItemsToRemove}: <span className="text-[#6B21A8]">{totalItems}</span>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || selectedItems.length === 0 || !selectedLocation}
          className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-lg hover:shadow-xl transition-all w-full sm:w-auto touch-manipulation min-h-[48px] sm:min-h-0 px-6 sm:px-8"
        >
          {isSubmitting ? t.common.loading : t.stockOut.removeStock}
        </Button>
      </div>

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScan}
        onManualEnter={handleBarcodeScan}
      />
      <TutorialTour
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
        steps={tourSteps}
      />
    </TeamLayout>
  );
}
