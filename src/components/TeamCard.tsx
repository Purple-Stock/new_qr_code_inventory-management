"use client";

import { Package, RefreshCw, Pencil, Trash2 } from "lucide-react";
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
    <Link href={`/teams/${id}/items`} className="block">
      <div className="flex h-full flex-col rounded-xl border border-hairline bg-white p-5 shadow-rest transition-colors duration-150 ease-craft hover:border-brand/30">
        <div className="mb-4 min-w-0">
          <h3 className="truncate text-lg font-medium text-ink">{name}</h3>
          <p className="mt-1 text-xs text-ink-3">
            {t.common.createdAt} {formatDate(createdAt)}
          </p>
        </div>

        <p className="mb-4 flex-1 text-sm text-ink-2 line-clamp-2">
          {notes || t.common.noNotes}
        </p>

        <div className="flex items-center justify-between gap-3 border-t border-hairline pt-4">
          <div className="flex items-center gap-4 font-mono text-sm tabular-nums text-ink">
            <span className="flex items-center gap-1.5">
              <Package className="h-4 w-4 text-ink-3" strokeWidth={1.5} />
              {itemCount}
              <span className="hidden font-sans text-xs text-ink-3 sm:inline">{t.items.items}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <RefreshCw className="h-4 w-4 text-ink-3" strokeWidth={1.5} />
              {transactionCount}
              <span className="hidden font-sans text-xs text-ink-3 sm:inline">{t.items.transactions}</span>
            </span>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onEdit?.(id);
              }}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-3 hover:bg-raised hover:text-ink"
              aria-label={t.common.edit}
              disabled={isDeleting}
            >
              <Pencil className="h-4 w-4" strokeWidth={1.5} />
            </button>
            {canDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete?.(id);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-3 hover:bg-red-50 hover:text-negative"
                aria-label={t.common.delete}
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4" strokeWidth={1.5} />
              </button>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
