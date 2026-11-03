"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Eye,
  ArrowUpCircle,
  ArrowDownCircle,
  RotateCcw,
  Move,
  Pencil,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { QRCodeDisplay } from "@/components/QRCodeDisplay";
import { useTranslation } from "@/lib/i18n";
import { TeamLayout } from "@/components/shared/TeamLayout";
import { formatPrice } from "../../_utils/formatPrice";
import {
  getTransactionTypeLabel,
  getTransactionTypeColor,
  formatQuantity,
  formatLocation,
} from "@/app/teams/[id]/transactions/_utils/getTransactionType";
import { formatDate } from "@/app/teams/[id]/transactions/_utils/formatDate";
import type { ItemDto, TransactionDto } from "@/lib/services/types";

type TransactionTypeFilter = "all" | "stock_in" | "stock_out" | "adjust" | "move";

type ItemWithLocation = ItemDto;
type TransactionWithDetails = TransactionDto;

interface ItemDetailPageClientProps {
  team: { id: number; name: string };
  teamId: number;
  itemId: number;
  initialItem: ItemWithLocation;
  initialTransactions: TransactionWithDetails[];
}

export default function ItemDetailPageClient({
  team,
  teamId,
  itemId,
  initialItem,
  initialTransactions,
}: ItemDetailPageClientProps) {
  const { language, t } = useTranslation();

  const item = initialItem;
  const transactions = initialTransactions;
  const [txFilter, setTxFilter] = useState<TransactionTypeFilter>("all");
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);

  useEffect(() => {
    if (!isPhotoModalOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsPhotoModalOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isPhotoModalOpen]);

  const filteredTx =
    txFilter === "all"
      ? transactions
      : transactions.filter((t) => t.transactionType === txFilter);
  const customFieldEntries = Object.entries(item.customFields ?? {}).filter(
    ([, value]) => Boolean(value)
  );

  const filters: { value: TransactionTypeFilter; label: string }[] = [
    { value: "all", label: t.transactions.all },
    { value: "stock_in", label: t.transactions.stockIn },
    { value: "stock_out", label: t.transactions.stockOut },
    { value: "adjust", label: t.transactions.adjust },
    { value: "move", label: t.transactions.move },
  ];

  const itemName = item.name || t.items.unnamedItem;
  const itemPhotoSrc = item.photoData
    ? `${item.photoData}${item.photoData.includes("?") ? "&" : "?"}v=${encodeURIComponent(item.updatedAt)}`
    : null;

  return (
    <TeamLayout team={team} activeMenuItem="items">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white border border-hairline rounded-xl px-4 sm:px-6 py-4 mb-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-sm text-ink-2">
              <Link
                href={`/teams/${teamId}/items`}
                className="text-brand hover:underline flex items-center gap-1"
              >
                <ArrowLeft className="h-4 w-4" />
                {t.items.backToList}
              </Link>
              <span className="text-ink-3">/</span>
              <span className="text-ink font-medium truncate">{itemName}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/teams/${teamId}/stock-in`}>
                <Button
                  size="sm"

                >
                  <ArrowUpCircle className="h-4 w-4 mr-1" />
                  {t.menu.stockIn}
                </Button>
              </Link>
              <Link href={`/teams/${teamId}/stock-out`}>
                <Button size="sm" variant="outline" className="text-negative hover:text-negative">
                  <ArrowDownCircle className="h-4 w-4 mr-1" />
                  {t.menu.stockOut}
                </Button>
              </Link>
              <Link href={`/teams/${teamId}/adjust`}>
                <Button size="sm" variant="outline">
                  <RotateCcw className="h-4 w-4 mr-1" />
                  {t.menu.adjust}
                </Button>
              </Link>
              <Link href={`/teams/${teamId}/move`}>
                <Button size="sm" variant="outline">
                  <Move className="h-4 w-4 mr-1" />
                  {t.menu.move}
                </Button>
              </Link>
              <Link href={`/teams/${teamId}/items/${itemId}/edit`}>
                <Button size="sm" variant="outline" className="border-hairline">
                  <Pencil className="h-4 w-4 mr-1" />
                  {t.common.edit}
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 lg:grid-rows-[auto_1fr] gap-6">
          {/* Overview */}
          <div className="lg:col-span-2 lg:row-span-2 bg-white rounded-xl shadow-sm border border-hairline p-6">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="h-5 w-5 text-ink-3" />
              <h2 className="text-lg font-medium text-ink">
                {t.reports.overview}
              </h2>
            </div>
            <p className="text-xs font-medium text-ink-3 mb-4">
              {t.items.itemInformation}
            </p>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              <div>
                <p className="text-xs text-ink-3 mb-0.5">
                  {t.common.name}
                </p>
                <p className="font-medium text-ink">{itemName}</p>
              </div>
              <div>
                <p className="text-xs text-ink-3 mb-0.5">
                  {t.items.sku}
                </p>
                <p className="font-medium text-ink">
                  {item.sku || "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-ink-3 mb-0.5">
                  {t.items.type}
                </p>
                <p className="font-medium text-ink">
                  {item.itemType || "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-ink-3 mb-0.5">
                  Barcode
                </p>
                <p className="font-mono text-sm text-ink">
                  {item.barcode || "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-ink-3 mb-0.5">
                  {t.items.cost}
                </p>
                <p className="font-medium text-ink">
                  {formatPrice(item.cost, language)}
                </p>
              </div>
              <div>
                <p className="text-xs text-ink-3 mb-0.5">
                  {t.items.price}
                </p>
                <p className="font-medium text-ink">
                  {formatPrice(item.price, language)}
                </p>
              </div>
              <div>
                <p className="text-xs text-ink-3 mb-0.5">
                  Brand
                </p>
                <p className="font-medium text-ink">
                  {item.brand || "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-ink-3 mb-0.5">
                  Location
                </p>
                <p className="font-medium text-ink">
                  {item.locationName || t.reports.noLocation}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-ink-3 mb-1">{t.itemForm.tourPhotoTitle}</p>
                {itemPhotoSrc ? (
                  <button
                    type="button"
                    onClick={() => setIsPhotoModalOpen(true)}
                    className="rounded-lg overflow-hidden border border-hairline hover:border-brand transition-colors"
                  >
                    <img
                      src={itemPhotoSrc}
                      alt={itemName}
                      className="h-28 w-28 object-cover"
                    />
                  </button>
                ) : (
                  <p className="font-medium text-ink">-</p>
                )}
              </div>
              {customFieldEntries.length > 0 ? (
                <div className="col-span-2 pt-2">
                  <p className="text-xs font-medium text-ink-3">
                    {t.itemForm.customFieldsTitle}
                  </p>
                </div>
              ) : null}
              {customFieldEntries.map(([key, value]) => (
                <div key={key}>
                  <p className="text-xs text-ink-3 mb-0.5">{key}</p>
                  <p className="font-medium text-ink">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Current Status */}
          <div className="lg:col-start-3 lg:row-start-1 bg-white rounded-xl shadow-sm border border-hairline p-6">
            <h2 className="text-lg font-medium text-ink mb-4">
              {t.items.currentStatus}
            </h2>
            <div className="text-center py-6">
              <p
                className="text-4xl sm:text-5xl font-semibold font-mono tabular-nums text-brand mb-1"
              >
                {item.currentStock ?? 0}
              </p>
              <p className="text-sm text-ink-3">{t.reports.totalStock}</p>
            </div>
            <div className="flex flex-wrap gap-1 mb-4">
              {filters.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setTxFilter(f.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    txFilter === f.value
                      ? "bg-ink text-white"
                      : "bg-raised text-ink-2 hover:bg-white"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {filteredTx.length === 0 ? (
                <p className="text-sm text-ink-3 py-4 text-center">
                  {t.transactions.noTransactions}
                </p>
              ) : (
                filteredTx.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg bg-raised border border-hairline"
                  >
                    <div className="min-w-0 flex-1">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${getTransactionTypeColor(
                          tx.transactionType,
                          tx
                        )}`}
                      >
                        {getTransactionTypeLabel(tx.transactionType, t, tx)}
                      </span>
                      <p className="text-xs text-ink-3 mt-0.5 truncate">
                        {formatLocation(tx, t)} ·{" "}
                        {formatDate(tx.createdAt, language)}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-semibold shrink-0 ${
                        tx.transactionType === "stock_out"
                          ? "text-negative"
                          : "text-positive"
                      }`}
                    >
                      {formatQuantity(tx.quantity, tx.transactionType)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* QR Code */}
          <div className="lg:col-start-3 lg:row-start-2 bg-white rounded-xl shadow-sm border border-hairline p-6 flex flex-col items-center justify-center">
            <h2 className="text-lg font-medium text-ink mb-4 w-full">
              {t.items.qrCode}
            </h2>
            <QRCodeDisplay
              value={item.barcode || ""}
              size={200}
              className="rounded-xl shadow-md"
            />
          </div>
        </div>
      </div>

      {isPhotoModalOpen && itemPhotoSrc ? (
        <div
          className="fixed inset-0 z-50 bg-black/70 p-4 sm:p-6 flex items-center justify-center"
          onClick={() => setIsPhotoModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={t.itemForm.tourPhotoTitle}
        >
          <button
            type="button"
            onClick={() => setIsPhotoModalOpen(false)}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 text-white hover:text-gray-200"
            aria-label={t.common.close}
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={itemPhotoSrc}
            alt={itemName}
            className="max-h-[90vh] max-w-[90vw] rounded-lg shadow-float object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}
    </TeamLayout>
  );
}
