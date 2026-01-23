import { Users, Package, RefreshCw, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface TeamCardProps {
  id: number;
  name: string;
  createdAt: Date | number;
  notes: string | null;
  itemCount: number;
  transactionCount: number;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
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
}: TeamCardProps) {
  const formatDate = (date: Date | number) => {
    const dateObj = date instanceof Date ? date : new Date(date);
    return new Intl.DateTimeFormat("pt-BR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(dateObj);
  };

  return (
    <Link href={`/teams/${id}/items`} className="block group">
      <div className="bg-white rounded-2xl p-6 hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-100 hover:border-purple-200 h-full flex flex-col">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-4 flex-1">
            <div className="w-14 h-14 bg-gradient-to-br from-[#6B21A8] to-[#7C3AED] rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <Users className="h-7 w-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-xl text-gray-900 mb-1 truncate">{name}</h3>
              <p className="text-xs text-gray-500 font-medium">
                Criado em {formatDate(createdAt)}
              </p>
            </div>
          </div>
        </div>

        <div className="mb-5 flex-1">
          <p className="text-sm text-gray-600 line-clamp-2">
            {notes || "No notes."}
          </p>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-gray-700">
              <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
                <Package className="h-4 w-4 text-purple-600" />
              </div>
              <span className="text-sm font-bold text-gray-900">{itemCount}</span>
              <span className="text-xs text-gray-500">items</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
                <RefreshCw className="h-4 w-4 text-purple-600" />
              </div>
              <span className="text-sm font-bold text-gray-900">{transactionCount}</span>
              <span className="text-xs text-gray-500">transactions</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onEdit?.(id);
              }}
              className="p-2.5 text-gray-500 hover:text-[#6B21A8] hover:bg-purple-50 rounded-lg transition-all"
              aria-label="Edit team"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete?.(id);
              }}
              className="p-2.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
              aria-label="Delete team"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
