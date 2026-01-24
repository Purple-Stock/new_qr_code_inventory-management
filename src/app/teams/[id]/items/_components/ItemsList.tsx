"use client";

import Link from "next/link";
import { QRCodeDisplay } from "@/components/QRCodeDisplay";
import { MapPin, Edit, Copy, Trash2 } from "lucide-react";
import type { Item } from "../_types";

interface ItemsListProps {
  items: Item[];
  teamId: string;
  formatPrice: (price: number | null) => string;
  t: any;
}

export function ItemsList({ items, teamId, formatPrice, t }: ItemsListProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <>
      {/* Mobile Card View */}
      <div className="lg:hidden space-y-3">
        {items.map((item) => (
          <div key={item.id} className="bg-white rounded-xl shadow-md border border-gray-100 p-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="flex-shrink-0">
                <QRCodeDisplay
                  value={item.barcode || ""}
                  size={56}
                  className="rounded-xl shadow-md"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-gray-900 mb-1 truncate">
                  {item.name || t.items.unnamedItem}
                </h3>
                {item.sku && (
                  <p className="text-xs text-gray-500 mb-1">SKU: {item.sku}</p>
                )}
                {item.barcode && (
                  <p className="text-xs text-gray-500 font-mono bg-gray-50 px-2 py-1 rounded inline-block">
                    {item.barcode}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                {item.itemType || "Type"}
              </span>
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                  (item.currentStock || 0) === 0
                    ? "bg-red-100 text-red-700"
                    : (item.currentStock || 0) < 10
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-green-100 text-green-700"
                }`}
              >
                Stock: {item.currentStock ?? 0}
              </span>
              <span className="text-sm font-bold text-gray-900">
                {formatPrice(item.price)}
              </span>
            </div>

            {item.locationName && (
              <div className="text-xs text-gray-500 mb-3 flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {item.locationName}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
              <Link
                href={`/teams/${teamId}/items/${item.id}/edit`}
                className="p-2.5 text-gray-500 hover:text-[#6B21A8] hover:bg-purple-50 rounded-lg transition-all touch-manipulation min-w-[40px] min-h-[40px] flex items-center justify-center"
                aria-label="Edit item"
                title="Edit item"
              >
                <Edit className="h-4 w-4" />
              </Link>
              <button
                className="p-2.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all touch-manipulation min-w-[40px] min-h-[40px] flex items-center justify-center"
                aria-label="Copy item"
                title="Copy item"
              >
                <Copy className="h-4 w-4" />
              </button>
              <button
                className="p-2.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all touch-manipulation min-w-[40px] min-h-[40px] flex items-center justify-center"
                aria-label="Delete item"
                title="Delete item"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  {t.items.qrCode}
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  {t.items.item}
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  {t.items.sku}
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  {t.items.type}
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  {t.items.stock}
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  {t.items.price}
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                  {t.common.actions}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-purple-50/50 transition-colors">
                  <td className="px-6 py-5 whitespace-nowrap">
                    <QRCodeDisplay
                      value={item.barcode || ""}
                      size={64}
                      className="rounded-xl shadow-md"
                    />
                  </td>
                  <td className="px-6 py-5">
                    <div>
                      <div className="text-sm font-bold text-gray-900 mb-1">
                        {item.name || t.items.unnamedItem}
                      </div>
                      {item.barcode && (
                        <div className="text-xs text-gray-500 font-mono bg-gray-50 px-2 py-1 rounded inline-block">
                          {item.barcode}
                        </div>
                      )}
                      {item.locationName && (
                        <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {item.locationName}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">
                      {item.sku || (
                        <span className="text-gray-400 italic">-</span>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                      {item.itemType || "Type"}
                    </span>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${
                        (item.currentStock || 0) === 0
                          ? "bg-red-100 text-red-700"
                          : (item.currentStock || 0) < 10
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {item.currentStock ?? 0}
                    </span>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <span className="text-sm font-bold text-gray-900">
                      {formatPrice(item.price)}
                    </span>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/teams/${teamId}/items/${item.id}/edit`}
                        className="p-2.5 text-gray-500 hover:text-[#6B21A8] hover:bg-purple-50 rounded-lg transition-all"
                        aria-label="Edit item"
                        title="Edit item"
                      >
                        <Edit className="h-4 w-4" />
                      </Link>
                      <button
                        className="p-2.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        aria-label="Copy item"
                        title="Copy item"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        className="p-2.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        aria-label="Delete item"
                        title="Delete item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
