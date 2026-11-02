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
            className="bg-white rounded-xl shadow-md border border-hairline p-4"
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-raised">
                <Building2 className="h-7 w-7 text-ink-3" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-medium text-ink mb-1 truncate">
                  {location.name}
                </h3>
                {location.description && (
                  <p className="text-sm text-ink-2 line-clamp-2">{location.description}</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-hairline">
              <button
                onClick={() => handleEdit(location.id)}
                className="p-2.5 text-ink-3 hover:text-brand hover:bg-raised rounded-lg transition-colors duration-150 ease-craft touch-manipulation min-w-[40px] min-h-[40px] flex items-center justify-center"
                aria-label="Edit location"
                title="Edit location"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleDeleteClick(location)}
                className="p-2.5 text-ink-3 hover:text-negative hover:bg-raised rounded-lg transition-colors duration-150 ease-craft touch-manipulation min-w-[40px] min-h-[40px] flex items-center justify-center"
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
      <div className="hidden lg:block bg-white rounded-xl sm:rounded-2xl shadow-rest overflow-hidden border border-hairline">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-hairline bg-raised">
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
                <th className="px-6 py-4 text-right text-xs font-medium text-ink-3">
                  {t.common.actions}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {locations.map((location) => (
                <tr key={location.id} className="hover:bg-raised transition-colors">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-raised">
                        <Building2 className="h-5 w-5 text-ink-3" />
                      </div>
                      <span className="text-sm font-medium text-ink">{location.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-sm text-ink-2">
                      {location.description || t.common.noDescription}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleEdit(location.id)}
                        className="p-2.5 text-ink-3 hover:text-brand hover:bg-raised rounded-lg transition-colors duration-150 ease-craft"
                        aria-label="Edit location"
                        title="Edit location"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(location)}
                        className="p-2.5 text-ink-3 hover:text-negative hover:bg-raised rounded-lg transition-colors duration-150 ease-craft"
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
