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
    <Link href={`/teams/${id}/items`} className="block">
      <div className="bg-purple-50 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-200 rounded-lg flex items-center justify-center">
              <Users className="h-5 w-5 text-purple-700" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-gray-900">{name}</h3>
              <p className="text-sm text-gray-600">
                Criado em {formatDate(createdAt)}
              </p>
            </div>
          </div>
        </div>

      <div className="mb-4">
        <p className="text-sm text-gray-600">
          {notes || "No notes."}
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-gray-600">
            <Package className="h-4 w-4" />
            <span className="text-sm font-medium">{itemCount}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <RefreshCw className="h-4 w-4" />
            <span className="text-sm font-medium">{transactionCount}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onEdit?.(id);
            }}
            className="p-2 text-gray-600 hover:text-purple-700 hover:bg-purple-100 rounded transition-colors"
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
            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
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
