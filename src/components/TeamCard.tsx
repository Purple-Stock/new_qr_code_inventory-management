"use client";

import { Users, Package, RefreshCw, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";
import Link from "next/link";

interface TeamCardProps {
  id: number;
  name: string;
  createdAt: Date | number | string;
  notes: string | null;
  itemCount: number;
  transactionCount: number;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
  isDeleting?: boolean;
  canDelete?: boolean;
}

export function TeamCard({
  id,
  name,
  createdAt,
  notes,
  itemCount,
  transactionCount,
  onEdit,
  onDelete,
  isDeleting = false,
  canDelete = true,
}: TeamCardProps) {
  const { language, t } = useTranslation();
  
  const formatDate = (date: Date | number | string) => {
    const dateObj = date instanceof Date ? date : new Date(date);
    const locale = language === "pt-BR" ? "pt-BR" : language === "fr" ? "fr-FR" : "en-US";
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(dateObj);
  };

  return (
    <Link href={`/teams/${id}/items`} className="block group">
      <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-100 hover:border-purple-200 h-full flex flex-col">
        <div className="flex items-start justify-between mb-4 sm:mb-5">
          <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-[#6B21A8] to-[#7C3AED] rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform flex-shrink-0">
              <Users className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg sm:text-xl text-gray-900 mb-1 truncate">{name}</h3>
              <p className="text-xs text-gray-500 font-medium">
                {t.common.createdAt} {formatDate(createdAt)}
              </p>
            </div>
          </div>
        </div>

        <div className="mb-4 sm:mb-5 flex-1">
          <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">
            {notes || t.common.noNotes}
          </p>
        </div>

        <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-gray-100 gap-2 sm:gap-4">
          <div className="flex items-center gap-3 sm:gap-4 sm:gap-6 flex-1 min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 text-gray-700 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-600" />
              </div>
              <span className="text-xs sm:text-sm font-bold text-gray-900">{itemCount}</span>
              <span className="text-xs text-gray-500 hidden sm:inline">{t.items.items}</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 text-gray-700 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-600" />
              </div>
              <span className="text-xs sm:text-sm font-bold text-gray-900">{transactionCount}</span>
              <span className="text-xs text-gray-500 hidden sm:inline">{t.items.transactions}</span>
            </div>
          </div>

          <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onEdit?.(id);
              }}
              className="p-2 sm:p-2.5 text-gray-500 hover:text-[#6B21A8] hover:bg-purple-50 rounded-lg transition-all touch-manipulation min-w-[36px] min-h-[36px] sm:min-w-0 sm:min-h-0 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={t.common.edit}
              disabled={isDeleting}
            >
              <Pencil className="h-4 w-4" />
            </button>
            {canDelete && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete?.(id);
                }}
                className="p-2 sm:p-2.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all touch-manipulation min-w-[36px] min-h-[36px] sm:min-w-0 sm:min-h-0 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={t.common.delete}
                disabled={isDeleting}
              >
                <Trash2 className={`h-4 w-4 ${isDeleting ? "animate-pulse" : ""}`} />
              </button>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
