"use client";

import Link from "next/link";
import { DollarSign, FileText, QrCode, Square, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface ItemFormValues {
  name: string;
  sku: string;
  barcode: string;
  cost: string;
  price: string;
  itemType: string;
  brand: string;
}

interface ItemFormProps {
  t: any;
  values: ItemFormValues;
  isLoading: boolean;
  cancelHref: string;
  mode: "create" | "edit";
  onSubmit: (e: React.FormEvent) => void;
  onValueChange: (field: keyof ItemFormValues, value: string) => void;
  onGenerateSKU: () => void;
  onGenerateBarcode: () => void;
}

export function ItemForm({
  t,
  values,
  isLoading,
  cancelHref,
  mode,
  onSubmit,
  onValueChange,
  onGenerateSKU,
  onGenerateBarcode,
}: ItemFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">{t.itemForm.itemInformation}</h2>
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-gray-900">
              {t.itemForm.nameLabel} <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                id="name"
                type="text"
                placeholder={t.itemForm.itemNamePlaceholder}
                value={values.name}
                onChange={(e) => onValueChange("name", e.target.value)}
                className="w-full pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sku" className="text-gray-900">
              {t.itemForm.skuLabel}
            </Label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Input
                  id="sku"
                  type="text"
                  placeholder={t.itemForm.skuPlaceholder}
                  value={values.sku}
                  onChange={(e) => onValueChange("sku", e.target.value)}
                  className="w-full"
                />
              </div>
              <button
                type="button"
                onClick={onGenerateSKU}
                className="text-sm text-[#6B21A8] hover:underline whitespace-nowrap"
              >
                {t.itemForm.generate}
              </button>
              <button type="button" className="p-2 text-gray-400 hover:text-gray-600">
                <QrCode className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="barcode" className="text-gray-900">
              {t.itemForm.barcodeLabel} <span className="text-red-500">*</span>
            </Label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Input
                  id="barcode"
                  type="text"
                  placeholder={t.itemForm.barcodePlaceholder}
                  value={values.barcode}
                  onChange={(e) => onValueChange("barcode", e.target.value)}
                  className="w-full"
                  required
                />
              </div>
              <button
                type="button"
                onClick={onGenerateBarcode}
                className="text-sm text-[#6B21A8] hover:underline whitespace-nowrap"
              >
                {t.itemForm.generate}
              </button>
              <button type="button" className="p-2 text-gray-400 hover:text-gray-600">
                <QrCode className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cost" className="text-gray-900">
                {t.itemForm.costLabel}
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="cost"
                  type="text"
                  placeholder="0.00"
                  value={values.cost}
                  onChange={(e) => onValueChange("cost", e.target.value.replace(/[^\d.]/g, ""))}
                  className="w-full pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="price" className="text-gray-900">
                {t.itemForm.priceLabel}
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="price"
                  type="text"
                  placeholder="0.00"
                  value={values.price}
                  onChange={(e) => onValueChange("price", e.target.value.replace(/[^\d.]/g, ""))}
                  className="w-full pl-10"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">{t.itemForm.itemAttributes}</h2>
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="itemType" className="text-gray-900">
              {t.itemForm.typeLabel}
            </Label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                id="itemType"
                type="text"
                placeholder={t.itemForm.itemTypePlaceholder}
                value={values.itemType}
                onChange={(e) => onValueChange("itemType", e.target.value)}
                className="w-full pl-10"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="brand" className="text-gray-900">
              {t.itemForm.brandLabel}
            </Label>
            <div className="relative">
              <Square className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                id="brand"
                type="text"
                placeholder={t.itemForm.brandPlaceholder}
                value={values.brand}
                onChange={(e) => onValueChange("brand", e.target.value)}
                className="w-full pl-10"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 pt-4">
        <Button
          type="submit"
          disabled={isLoading}
          className="bg-[#6B21A8] hover:bg-[#6B21A8]/90 text-white font-semibold px-8 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {mode === "create"
            ? isLoading
              ? t.itemForm.creating
              : t.itemForm.createAction
            : isLoading
            ? t.itemForm.updating
            : t.itemForm.updateAction}
        </Button>
        <Link href={cancelHref}>
          <Button
            type="button"
            variant="outline"
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            {t.common.cancel}
          </Button>
        </Link>
      </div>
    </form>
  );
}
