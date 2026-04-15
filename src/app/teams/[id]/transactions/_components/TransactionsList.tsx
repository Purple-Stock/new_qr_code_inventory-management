"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { useTranslation } from "@/lib/i18n";
import { useToast } from "@/components/ui/use-toast-simple";
import { deleteTransactionAction } from "../_actions/deleteTransaction";
import { getTransactionTypeLabel, getTransactionTypeColor, formatQuantity, formatLocation } from "../_utils/getTransactionType";
import { formatDate } from "../_utils/formatDate";
import type { TransactionWithDetails } from "../_types";

interface TransactionsListProps {
  transactions: TransactionWithDetails[];
  teamId: number;
  onDelete: () => void;
  canDeleteTransactions: boolean;
  onSearchByTransferGroup?: (transferGroupId: string) => void;
}

export function TransactionsList({
  transactions,
  teamId,
  onDelete,
  canDeleteTransactions,
  onSearchByTransferGroup,
}: TransactionsListProps) {
  const { language, t } = useTranslation();
  const { toast } = useToast();
  const [transactionToDelete, setTransactionToDelete] = useState<TransactionWithDetails | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingTransaction, setIsDeletingTransaction] = useState(false);

  const closeDeleteModal = () => {
    if (isDeletingTransaction) {
      return;
    }

    setIsDeleteModalOpen(false);
    setTransactionToDelete(null);
  };

  const handleDeleteClick = (transaction: TransactionWithDetails) => {
    setTransactionToDelete(transaction);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!transactionToDelete) {
      return;
    }

    setIsDeletingTransaction(true);

    const result = await deleteTransactionAction(teamId, transactionToDelete.id);

    if (!result.success) {
      toast({
        variant: "destructive",
        title: t.common.error,
        description: t.transactions.failedToDeleteTransaction,
      });
      setIsDeletingTransaction(false);
      return;
    }

    toast({
      variant: "success",
      title: t.common.success,
      description: t.transactions.transactionDeleted,
    });

    setIsDeletingTransaction(false);
    closeDeleteModal();
    onDelete();
  };

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 sm:py-20 bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 px-4 sm:px-6">
        <p className="text-gray-500 text-sm sm:text-base">{t.transactions.noTransactions}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden border border-gray-100">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
            <tr>
              <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700">
                {t.transactions.date}
              </th>
              <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700">
                {t.transactions.type}
              </th>
              <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700">
                {t.transactions.item}
              </th>
              <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700">
                {t.transactions.quantity}
              </th>
              <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700 hidden sm:table-cell">
                {t.transactions.location}
              </th>
              <th
                suppressHydrationWarning
                className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700"
              >
                {t.transactions.notes || "Notas"}
              </th>
              <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700 hidden lg:table-cell">
                {t.transactions.user}
              </th>
              <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-right text-xs font-semibold text-gray-700">
                {t.transactions.actions}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {transactions.map((transaction) => (
              <tr key={transaction.id} className="hover:bg-gray-50">
                <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">
                  {formatDate(transaction.createdAt, language)}
                </td>
                <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3">
                  {transaction.destinationKind === "team" &&
                    !transaction.linkedTransactionId && (
                      <span className="mb-1 inline-flex rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                        {t.transactions.linkedPending}
                      </span>
                    )}
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getTransactionTypeColor(
                      transaction.transactionType,
                      transaction
                    )}`}
                  >
                    {getTransactionTypeLabel(transaction.transactionType, t, transaction)}
                  </span>
                  {transaction.transferGroupId && (
                    <button
                      type="button"
                      className="mt-1 block text-[11px] text-violet-700 hover:text-violet-900 underline underline-offset-2"
                      onClick={() => onSearchByTransferGroup?.(transaction.transferGroupId!)}
                    >
                      {`${t.transactions.transferGroupPrefix || "Group"} ${transaction.transferGroupId.slice(0, 8)}`}
                    </button>
                  )}
                </td>
                <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">
                  {transaction.item?.name || "-"}
                </td>
                <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-gray-900">
                  {formatQuantity(transaction.quantity, transaction.transactionType)}
                </td>
                <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-xs sm:text-sm text-gray-600 hidden sm:table-cell">
                  {formatLocation(transaction, t)}
                </td>
                <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-xs sm:text-sm text-gray-600 max-w-[240px]">
                  <span className="block truncate" title={transaction.notes || t.common.noNotes}>
                    {transaction.notes || t.common.noNotes}
                  </span>
                </td>
                <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-xs sm:text-sm text-gray-600 hidden lg:table-cell">
                  {transaction.user?.email || "-"}
                </td>
                <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-right">
                  {canDeleteTransactions ? (
                    <button
                      onClick={() => handleDeleteClick(transaction)}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all touch-manipulation min-w-[36px] min-h-[36px] flex items-center justify-center"
                      aria-label="Delete transaction"
                      title="Delete transaction"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        onConfirm={handleDeleteConfirm}
        title={t.transactions.deleteModalTitle}
        description={t.transactions.deleteModalDescription}
        confirmLabel={t.transactions.deleteModalConfirm}
        isDeleting={isDeletingTransaction}
      >
        {transactionToDelete ? (
          <dl className="rounded-xl border border-red-100 bg-red-50/40 p-4 text-sm text-gray-700">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="min-w-0 rounded-lg bg-white/80 p-3 shadow-sm">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  {t.transactions.deleteModalType}
                </dt>
                <dd className="mt-1 text-base font-semibold text-gray-900 break-words">
                  {getTransactionTypeLabel(transactionToDelete.transactionType, t, transactionToDelete)}
                </dd>
              </div>
              <div className="min-w-0 rounded-lg bg-white/80 p-3 shadow-sm">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  {t.transactions.deleteModalQuantity}
                </dt>
                <dd className="mt-1 text-base font-semibold text-gray-900 break-words">
                  {formatQuantity(transactionToDelete.quantity, transactionToDelete.transactionType)}
                </dd>
              </div>
              <div className="min-w-0 rounded-lg bg-white/80 p-3 shadow-sm">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  {t.transactions.deleteModalItem}
                </dt>
                <dd className="mt-1 text-base font-semibold text-gray-900 break-words">
                  {transactionToDelete.item?.name || "-"}
                </dd>
              </div>
              <div className="min-w-0 rounded-lg bg-white/80 p-3 shadow-sm">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  {t.transactions.deleteModalLocation}
                </dt>
                <dd className="mt-1 text-base font-semibold text-gray-900 break-words">
                  {formatLocation(transactionToDelete, t)}
                </dd>
              </div>
              <div className="min-w-0 rounded-lg bg-white/80 p-3 shadow-sm">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  {t.transactions.deleteModalDate}
                </dt>
                <dd className="mt-1 text-base font-semibold text-gray-900 break-words">
                  {formatDate(transactionToDelete.createdAt, language)}
                </dd>
              </div>
              <div className="min-w-0 rounded-lg bg-white/80 p-3 shadow-sm md:col-span-2">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  {t.transactions.deleteModalUser}
                </dt>
                <dd className="mt-1 text-base font-semibold text-gray-900 break-all">
                  {transactionToDelete.user?.email || "-"}
                </dd>
              </div>
            </div>
            <div className="mt-3 rounded-lg bg-white/80 p-3 shadow-sm">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                {t.transactions.deleteModalNotes}
              </dt>
              <dd className="mt-1 text-base font-semibold text-gray-900 break-words">
                {transactionToDelete.notes || t.common.noNotes}
              </dd>
            </div>
          </dl>
        ) : null}
      </DeleteConfirmModal>
    </div>
  );
}
