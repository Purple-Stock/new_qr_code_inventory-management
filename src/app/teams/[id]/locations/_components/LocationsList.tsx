"use client";

import { useState } from "react";
import { Pencil, Trash2, Building2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { useToast } from "@/components/ui/use-toast-simple";
import { SortableHeader } from "@/components/shared/SortableHeader";
import type { SortDirection } from "@/lib/list-table";
import { deleteLocationAction } from "../_actions/deleteLocation";
import type { Location } from "../_types";

type LocationSortKey = "name" | "description";

interface LocationsListProps {
  locations: Location[];
  teamId: number;
  t: any;
  sortKey?: LocationSortKey | null;
  sortDirection?: SortDirection;
  onSort?: (key: LocationSortKey) => void;
  onDelete: () => void;
}

export function LocationsList({
  locations,
  teamId,
  t,
  sortKey,
  sortDirection,
  onSort,
  onDelete,
}: LocationsListProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [locationToDelete, setLocationToDelete] = useState<Location | null>(null);
  const [isDeletingLocation, setIsDeletingLocation] = useState(false);

  const handleEdit = (id: number) => {
    router.push(`/teams/${teamId}/locations/${id}/edit`);
  };

  const closeDeleteModal = () => {
    if (isDeletingLocation) {
      return;
    }

    setLocationToDelete(null);
  };

  const handleDeleteClick = (location: Location) => {
    setLocationToDelete(location);
  };

  const handleDeleteConfirm = async () => {
    if (!locationToDelete) {
      return;
    }

    setIsDeletingLocation(true);

    const result = await deleteLocationAction(teamId, locationToDelete.id);

    if (!result.success) {
      toast({
        variant: "destructive",
        title: t.common.error,
        description: t.locations.deleteError,
      });
      setIsDeletingLocation(false);
      return;
    }

    toast({
      variant: "success",
      title: t.locations.deletedTitle,
      description: `${locationToDelete.name} ${t.locations.deletedDescriptionSuffix}`,
    });

    setIsDeletingLocation(false);
    setLocationToDelete(null);
    onDelete();
  };

  if (locations.length === 0) {
    return null;
  }

  return (
    <>
      {/* Mobile Card View */}
      <div className="lg:hidden space-y-3">
        {locations.map((location) => (
          <div
            key={location.id}
            className="bg-white rounded-xl shadow-md border border-gray-100 p-4"
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
                <Building2 className="h-7 w-7 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-gray-900 mb-1 truncate">
                  {location.name}
                </h3>
                {location.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">{location.description}</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                onClick={() => handleEdit(location.id)}
                className="p-2.5 text-gray-500 hover:text-[#6B21A8] hover:bg-purple-50 rounded-lg transition-all touch-manipulation min-w-[40px] min-h-[40px] flex items-center justify-center"
                aria-label="Edit location"
                title="Edit location"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleDeleteClick(location)}
                className="p-2.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all touch-manipulation min-w-[40px] min-h-[40px] flex items-center justify-center"
                aria-label="Delete location"
                title="Delete location"
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
                <SortableHeader
                  label={t.locations.name}
                  column="name"
                  sortKey={sortKey}
                  sortDirection={sortDirection}
                  sortAscendingLabel={t.common.sortAscending}
                  sortDescendingLabel={t.common.sortDescending}
                  onSort={onSort}
                />
                <SortableHeader
                  label={t.locations.description}
                  column="description"
                  sortKey={sortKey}
                  sortDirection={sortDirection}
                  sortAscendingLabel={t.common.sortAscending}
                  sortDescendingLabel={t.common.sortDescending}
                  onSort={onSort}
                />
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                  {t.common.actions}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {locations.map((location) => (
                <tr key={location.id} className="hover:bg-purple-50/50 transition-colors">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
                        <Building2 className="h-5 w-5 text-blue-600" />
                      </div>
                      <span className="text-sm font-bold text-gray-900">{location.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-sm text-gray-600">
                      {location.description || t.common.noDescription}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleEdit(location.id)}
                        className="p-2.5 text-gray-500 hover:text-[#6B21A8] hover:bg-purple-50 rounded-lg transition-all"
                        aria-label="Edit location"
                        title="Edit location"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(location)}
                        className="p-2.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        aria-label="Delete location"
                        title="Delete location"
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

      <DeleteConfirmModal
        isOpen={locationToDelete !== null}
        onClose={closeDeleteModal}
        onConfirm={handleDeleteConfirm}
        title={t.common.delete}
        description={
          locationToDelete
            ? `${t.locations.deleteConfirmPrefix} "${locationToDelete.name}"?`
            : undefined
        }
        isDeleting={isDeletingLocation}
      />
    </>
  );
}
