"use client";

import { Trash2 } from "lucide-react";
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
}

export function TransactionsList({ transactions, teamId, onDelete }: TransactionsListProps) {
  const { language, t } = useTranslation();
  const { toast } = useToast();

  const handleDelete = async (transactionId: number) => {
    if (!confirm(t.transactions.deleteConfirm)) {
      return;
    }

    const result = await deleteTransactionAction(teamId, transactionId);

    if (!result.success) {
      toast({
        variant: "destructive",
        title: t.common.error,
        description: t.transactions.failedToDeleteTransaction,
      });
      return;
    }

    toast({
      variant: "success",
      title: t.common.success,
      description: t.transactions.transactionDeleted,
    });

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
              <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-semibold text-gray-700 hidden md:table-cell">
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
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getTransactionTypeColor(
                      transaction.transactionType
                    )}`}
                  >
                    {getTransactionTypeLabel(transaction.transactionType, t)}
                  </span>
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
                <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-xs sm:text-sm text-gray-600 hidden md:table-cell">
                  {transaction.user?.email || "-"}
                </td>
                <td className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-right">
                  <button
                    onClick={() => handleDelete(transaction.id)}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all touch-manipulation min-w-[36px] min-h-[36px] flex items-center justify-center"
                    aria-label="Delete transaction"
                    title="Delete transaction"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
