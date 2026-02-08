"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Eye,
  ArrowUpCircle,
  ArrowDownCircle,
  RotateCcw,
  Move,
  Pencil,
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

  const [item] = useState<ItemWithLocation>(initialItem);
  const [transactions] = useState<TransactionWithDetails[]>(initialTransactions);
  const [txFilter, setTxFilter] = useState<TransactionTypeFilter>("all");

  const filteredTx =
    txFilter === "all"
      ? transactions
      : transactions.filter((t) => t.transactionType === txFilter);

  const filters: { value: TransactionTypeFilter; label: string }[] = [
    { value: "all", label: t.transactions.all },
    { value: "stock_in", label: t.transactions.stockIn },
    { value: "stock_out", label: t.transactions.stockOut },
    { value: "adjust", label: t.transactions.adjust },
    { value: "move", label: t.transactions.move },
  ];

  const itemName = item.name || t.items.unnamedItem;

  return (
    <TeamLayout team={team} activeMenuItem="items">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white border border-gray-200 rounded-xl px-4 sm:px-6 py-4 mb-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Link
                href={`/teams/${teamId}/items`}
                className="text-[#6B21A8] hover:underline flex items-center gap-1"
              >
                <ArrowLeft className="h-4 w-4" />
                {t.items.backToList}
              </Link>
              <span className="text-gray-400">/</span>
              <span className="text-gray-900 font-medium truncate">{itemName}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/teams/${teamId}/stock-in`}>
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white border-0"
                >
                  <ArrowUpCircle className="h-4 w-4 mr-1" />
                  {t.menu.stockIn}
                </Button>
              </Link>
              <Link href={`/teams/${teamId}/stock-out`}>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-50"
                >
                  <ArrowDownCircle className="h-4 w-4 mr-1" />
                  {t.menu.stockOut}
                </Button>
              </Link>
              <Link href={`/teams/${teamId}/adjust`}>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-amber-300 text-amber-700 hover:bg-amber-50"
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  {t.menu.adjust}
                </Button>
              </Link>
              <Link href={`/teams/${teamId}/move`}>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-blue-300 text-blue-700 hover:bg-blue-50"
                >
                  <Move className="h-4 w-4 mr-1" />
                  {t.menu.move}
                </Button>
              </Link>
              <Link href={`/teams/${teamId}/items/${itemId}/edit`}>
                <Button size="sm" variant="outline" className="border-gray-300">
                  <Pencil className="h-4 w-4 mr-1" />
                  {t.common.edit}
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 lg:grid-rows-[auto_1fr] gap-6">
          {/* Overview */}
          <div className="lg:col-span-2 lg:row-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="h-5 w-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900">
                {t.reports.overview}
              </h2>
            </div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">
              {t.items.itemInformation}
            </p>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              <div>
                <p className="text-xs text-gray-500 uppercase mb-0.5">
                  {t.common.name}
                </p>
                <p className="font-medium text-gray-900">{itemName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase mb-0.5">
                  {t.items.sku}
                </p>
                <p className="font-medium text-gray-900">
                  {item.sku || "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase mb-0.5">
                  {t.items.type}
                </p>
                <p className="font-medium text-gray-900">
                  {item.itemType || "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase mb-0.5">
                  Barcode
                </p>
                <p className="font-mono text-sm text-gray-900">
                  {item.barcode || "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase mb-0.5">
                  {t.items.cost}
                </p>
                <p className="font-medium text-gray-900">
                  {formatPrice(item.cost, language)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase mb-0.5">
                  {t.items.price}
                </p>
                <p className="font-medium text-gray-900">
                  {formatPrice(item.price, language)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase mb-0.5">
                  Brand
                </p>
                <p className="font-medium text-gray-900">
                  {item.brand || "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase mb-0.5">
                  Location
                </p>
                <p className="font-medium text-gray-900">
                  {item.locationName || t.reports.noLocation}
                </p>
              </div>
            </div>
          </div>

          {/* Current Status */}
          <div className="lg:col-start-3 lg:row-start-1 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {t.items.currentStatus}
            </h2>
            <div className="text-center py-6">
              <p
                className="text-4xl sm:text-5xl font-bold text-[#6B21A8] mb-1"
              >
                {item.currentStock ?? 0}
              </p>
              <p className="text-sm text-gray-500">{t.reports.totalStock}</p>
            </div>
            <div className="flex flex-wrap gap-1 mb-4">
              {filters.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setTxFilter(f.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    txFilter === f.value
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {filteredTx.length === 0 ? (
                <p className="text-sm text-gray-500 py-4 text-center">
                  {t.transactions.noTransactions}
                </p>
              ) : (
                filteredTx.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg bg-gray-50 border border-gray-100"
                  >
                    <div className="min-w-0 flex-1">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${getTransactionTypeColor(
                          tx.transactionType
                        )}`}
                      >
                        {getTransactionTypeLabel(tx.transactionType, t)}
                      </span>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        {formatLocation(tx, t)} ·{" "}
                        {formatDate(tx.createdAt, language)}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-semibold shrink-0 ${
                        tx.transactionType === "stock_out"
                          ? "text-red-600"
                          : "text-green-600"
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
          <div className="lg:col-start-3 lg:row-start-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col items-center justify-center">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 w-full">
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
    </TeamLayout>
  );
}
