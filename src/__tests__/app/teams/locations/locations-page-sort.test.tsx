// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { LocationsPageClient } from "@/app/teams/[id]/locations/_components/LocationsPageClient";
import type { Location, Team } from "@/app/teams/[id]/locations/_types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/components/shared/TeamLayout", () => ({
  TeamLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/TutorialTour", () => ({
  TutorialTour: () => null,
}));

vi.mock("@/app/teams/[id]/locations/_components/LocationsList", () => ({
  LocationsList: ({
    locations,
    onSort,
  }: {
    locations: Location[];
    onSort?: (key: "name") => void;
  }) => (
    <div>
      <button type="button" onClick={() => onSort?.("name")}>
        Ordenar nome
      </button>
      <ul>
        {locations.map((location) => (
          <li key={location.id}>{location.name}</li>
        ))}
      </ul>
    </div>
  ),
}));

vi.mock("@/lib/i18n", () => ({
  useTranslation: () => ({
    language: "pt-BR",
    t: {
      common: {
        tutorial: "Tutorial",
        back: "Voltar",
        page: "Página",
        of: "de",
        next: "Próximo",
      },
      locations: {
        title: "Localizações",
        subtitle: "Gerencie",
        searchPlaceholder: "Buscar",
        newLocation: "Nova",
        newLocationShort: "Nova",
        noLocations: "Nenhuma",
        noLocationsMessage: "Comece",
        createFirstLocation: "Criar",
        tourTutorialTitle: "T",
        tourTutorialDesc: "T",
        tourSearchTitle: "T",
        tourSearchDesc: "T",
        tourAddTitle: "T",
        tourAddDesc: "T",
        tourListTitle: "T",
        tourListDesc: "T",
        tourSidebarTitle: "T",
        tourSidebarDesc: "T",
      },
    },
  }),
}));

const NAMES = [
  "Lima",
  "Alpha",
  "Kilo",
  "Bravo",
  "Juliet",
  "Charlie",
  "India",
  "Delta",
  "Hotel",
  "Echo",
  "Golf",
  "Foxtrot",
];

const team: Team = {
  id: 1,
  name: "Time",
  itemCount: 0,
  transactionCount: 0,
};

const locations: Location[] = NAMES.map((name, index) => ({
  id: index + 1,
  name,
  description: null,
  teamId: 1,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
}));

describe("LocationsPageClient sort", () => {
  it("sorts the full list before paginating", () => {
    render(<LocationsPageClient locations={locations} team={team} />);

    fireEvent.click(screen.getByRole("button", { name: "Ordenar nome" }));

    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Juliet")).toBeInTheDocument();
    expect(screen.queryByText("Kilo")).not.toBeInTheDocument();
    expect(screen.getByText("Página 1 de 2")).toBeInTheDocument();
  });
});
