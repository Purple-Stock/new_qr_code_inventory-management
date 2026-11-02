"use client";

import type { ReactNode } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onSecondaryConfirm?: () => void;
  title?: string;
  description?: string;
  itemName?: string;
  isDeleting?: boolean;
  secondaryConfirmLabel?: string;
  isSecondaryDeleting?: boolean;
  confirmLabel?: string;
  children?: ReactNode;
}

export function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  onSecondaryConfirm,
  title,
  description,
  itemName,
  isDeleting = false,
  secondaryConfirmLabel,
  isSecondaryDeleting = false,
  confirmLabel,
  children,
}: DeleteConfirmModalProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-float w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-hairline bg-white px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-raised">
              <AlertTriangle className="h-5 w-5 text-ink-3" />
            </div>
            <h2 className="text-lg sm:text-xl font-medium text-ink">
              {title || t.common.delete}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-ink-3 hover:bg-raised h-8 w-8 p-0"
            disabled={isDeleting}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-raised rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-negative" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-ink text-base sm:text-lg font-semibold mb-3">
                {description || (itemName ? `${t.common.delete} "${itemName}"?` : t.common.delete)}
              </p>
              {itemName && !description && (
                <div className="bg-raised rounded-lg p-3 mb-4 border border-hairline">
                  <p className="text-ink-2 text-sm font-medium">
                    {itemName}
                  </p>
                </div>
              )}
              <p className="text-ink-2 text-sm sm:text-base leading-relaxed">
                {description 
                  ? t.common.cannotBeUndone
                  : t.teamSelection.deleteConfirm
                }
              </p>
              {children ? <div className="mt-4">{children}</div> : null}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-4 border-t border-hairline flex justify-end gap-3">
          {onSecondaryConfirm && secondaryConfirmLabel ? (
            <Button
              type="button"
              variant="outline"
              onClick={onSecondaryConfirm}
              disabled={isDeleting || isSecondaryDeleting}
              className="border-hairline text-negative hover:bg-raised"
            >
              {isSecondaryDeleting ? t.common.loading : secondaryConfirmLabel}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isDeleting || isSecondaryDeleting}
            className="text-ink-2 hover:bg-raised"
          >
            {t.common.cancel}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDeleting || isSecondaryDeleting}
          >
            {isDeleting ? (
              <>
                <span className="mr-2">{t.common.loading}</span>
              </>
            ) : (
              <>
                {confirmLabel || t.common.delete}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
