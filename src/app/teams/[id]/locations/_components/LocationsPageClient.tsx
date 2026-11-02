"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Info, Plus, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";
import Link from "next/link";
import { TeamLayout } from "@/components/shared/TeamLayout";
import { TablePager } from "@/components/shared/TablePager";
import { TutorialTour, type TourStep } from "@/components/TutorialTour";
import { useSortedPage } from "@/hooks/useSortedPage";
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
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [filteredLocations, setFilteredLocations] = useState<Location[]>(locations);
  const locationGetters = useMemo(
    () => ({
      name: (location: Location) => location.name,
      description: (location: Location) => location.description,
    }),
    []
  );
  const { sort, onSort, setPage, paginated } = useSortedPage(filteredLocations, locationGetters);
  const teamId = team.id.toString();
  const tourSteps: TourStep[] = [
    { target: "tour-locations-tutorial", title: t.locations.tourTutorialTitle, description: t.locations.tourTutorialDesc },
    { target: "tour-locations-search", title: t.locations.tourSearchTitle, description: t.locations.tourSearchDesc },
    { target: "tour-locations-add", title: t.locations.tourAddTitle, description: t.locations.tourAddDesc },
    { target: "tour-locations-list", title: t.locations.tourListTitle, description: t.locations.tourListDesc },
    { target: "tour-sidebar", title: t.locations.tourSidebarTitle, description: t.locations.tourSidebarDesc },
  ];

  const handleRefresh = () => {
    router.refresh();
  };

  return (
    <TeamLayout team={team} activeMenuItem="locations">
      {/* Header */}
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-medium leading-[1.15] text-ink mb-1 sm:mb-2">
            {t.locations.title}
          </h1>
          <p className="text-sm sm:text-base text-ink-2">{t.locations.subtitle}</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="outline"
            onClick={() => setIsTutorialOpen(true)}
            data-tour="tour-locations-tutorial"
            className="border-hairline text-ink-2 hover:bg-raised h-10 sm:h-11 text-xs sm:text-sm w-full sm:w-auto touch-manipulation min-h-[40px] sm:min-h-0"
          >
            <Info className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            {t.common.tutorial}
          </Button>
          <Link href={`/teams/${teamId}/locations/new`} className="w-full sm:w-auto" data-tour="tour-locations-add">
            <Button className="h-10 sm:h-11 text-xs sm:text-sm w-full sm:w-auto touch-manipulation min-h-[40px] sm:min-h-0">
              <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">{t.locations.newLocation}</span>
              <span className="sm:hidden">{t.locations.newLocationShort}</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-4 sm:mb-6" data-tour="tour-locations-search">
        <LocationsSearch
          locations={locations}
          onFilteredLocationsChange={(nextLocations) => {
            setFilteredLocations(nextLocations);
            setPage(1);
          }}
          placeholder={t.locations.searchPlaceholder}
        />
      </div>

      {/* Locations List */}
      {filteredLocations.length === 0 ? (
        <div data-tour="tour-locations-list" className="text-center py-12 sm:py-20 rounded-xl border border-hairline bg-white shadow-rest px-4 sm:px-6">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-raised text-ink-3">
            <Building2 className="h-5 w-5 text-ink-3" />
          </div>
          <p className="text-ink-2 text-lg sm:text-xl font-semibold mb-2">
            {t.locations.noLocations}
          </p>
          <p className="text-ink-3 text-sm sm:text-base mb-4 sm:mb-6">
            {t.locations.noLocationsMessage}
          </p>
          <Link href={`/teams/${teamId}/locations/new`}>
            <Button className="touch-manipulation min-h-[48px]">
              <Plus className="h-4 w-4 mr-2" />
              {t.locations.createFirstLocation}
            </Button>
          </Link>
        </div>
      ) : (
        <div data-tour="tour-locations-list">
          <LocationsList
            locations={paginated.items}
            teamId={team.id}
            t={t}
            sortKey={sort?.key}
            sortDirection={sort?.direction}
            onSort={onSort}
            onDelete={handleRefresh}
          />
        </div>
      )}
      {filteredLocations.length > 0 ? (
        <TablePager
          currentPage={paginated.currentPage}
          totalPages={paginated.totalPages}
          onPageChange={setPage}
          backLabel={t.common.back}
          nextLabel={t.common.next}
          pageLabel={t.common.page}
          ofLabel={t.common.of}
        />
      ) : null}
      <TutorialTour
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
        steps={tourSteps}
      />
    </TeamLayout>
  );
}
