"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Info, Plus, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";
import Link from "next/link";
import { TeamLayout } from "@/components/shared/TeamLayout";
import { LocationsList } from "./LocationsList";
import { LocationsSearch } from "./LocationsSearch";
import type { Location, Team } from "../_types";

interface LocationsPageClientProps {
  locations: Location[];
  team: Team;
}

export function LocationsPageClient({ locations, team }: LocationsPageClientProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [filteredLocations, setFilteredLocations] = useState<Location[]>(locations);
  const teamId = team.id.toString();

  const handleRefresh = () => {
    router.refresh();
  };

  return (
    <TeamLayout team={team} activeMenuItem="locations">
      {/* Header */}
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">
            {t.locations.title}
          </h1>
          <p className="text-sm sm:text-base text-gray-600">{t.locations.subtitle}</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="outline"
            className="border-gray-300 text-gray-700 hover:bg-gray-50 h-10 sm:h-11 text-xs sm:text-sm w-full sm:w-auto touch-manipulation min-h-[40px] sm:min-h-0"
          >
            <Info className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            {t.common.tutorial}
          </Button>
          <Link href={`/teams/${teamId}/locations/new`} className="w-full sm:w-auto">
            <Button className="bg-gradient-to-r from-[#6B21A8] to-[#7C3AED] hover:from-[#5B1A98] hover:to-[#6D28D9] text-white shadow-lg hover:shadow-xl transition-all h-10 sm:h-11 text-xs sm:text-sm w-full sm:w-auto touch-manipulation min-h-[40px] sm:min-h-0">
              <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">{t.locations.newLocation}</span>
              <span className="sm:hidden">{t.locations.newLocationShort}</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-4 sm:mb-6">
        <LocationsSearch
          locations={locations}
          onFilteredLocationsChange={setFilteredLocations}
          placeholder={t.locations.searchPlaceholder}
        />
      </div>

      {/* Locations List */}
      {filteredLocations.length === 0 ? (
        <div className="text-center py-12 sm:py-20 bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 px-4 sm:px-6">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
            <Building2 className="h-8 w-8 sm:h-10 sm:w-10 text-blue-600" />
          </div>
          <p className="text-gray-700 text-lg sm:text-xl font-semibold mb-2">
            {t.locations.noLocations}
          </p>
          <p className="text-gray-500 text-sm sm:text-base mb-4 sm:mb-6">
            {t.locations.noLocationsMessage}
          </p>
          <Link href={`/teams/${teamId}/locations/new`}>
            <Button className="bg-gradient-to-r from-[#6B21A8] to-[#7C3AED] hover:from-[#5B1A98] hover:to-[#6D28D9] text-white shadow-lg hover:shadow-xl transition-all touch-manipulation min-h-[48px]">
              <Plus className="h-4 w-4 mr-2" />
              {t.locations.createFirstLocation}
            </Button>
          </Link>
        </div>
      ) : (
        <LocationsList
          locations={filteredLocations}
          teamId={team.id}
          t={t}
          onDelete={handleRefresh}
        />
      )}
    </TeamLayout>
  );
}
