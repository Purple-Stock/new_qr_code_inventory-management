import { getTeamWithStats } from "@/lib/db/teams";
import { getTeamItems, getItemByIdWithLocation } from "@/lib/db/items";
import { getLocationById, getTeamLocations } from "@/lib/db/locations";
import type { TeamMemberRole } from "@/db/schema";
import { getActiveTeamMemberRole, getCompanyTeams } from "@/lib/db/team-members";
import { getTeamReportStats } from "@/lib/db/reports";
import {
  getItemStockTransactionsWithDetails,
  getTeamStockTransactions,
  getTeamStockTransactionsWithDetails,
} from "@/lib/db/stock-transactions";
import {
  itemsWithLocationBalancesFromLedger,
  reportStockByLocationFromLedger,
} from "@/lib/stock-by-location-ledger";
import {
  toItemDto,
  toLocationDto,
  toReportStatsDto,
  toTeamDto,
  toTransactionDto,
} from "@/lib/services/mappers";
import { hasActiveTeamSubscription } from "@/lib/services/subscription-access";
import type { ReportStatsDto } from "@/lib/services/types";

const EMPTY_REPORT_STATS: ReportStatsDto = {
  totalItems: 0,
  totalLocations: 0,
  totalTransactions: 0,
  totalStockValue: 0,
  lowStockItems: 0,
  outOfStockItems: 0,
  transactionsByType: { stock_in: 0, stock_out: 0, adjust: 0, move: 0 },
  recentTransactions: [],
  topItemsByValue: [],
  stockByLocation: [],
  transactionsByDate: [],
};

interface TeamDashboardOptions {
  allowInactiveSubscription?: boolean;
  requestUserId?: number | null;
}

type TeamWithStats = NonNullable<Awaited<ReturnType<typeof getTeamWithStats>>>;

type DashboardAccess =
  | { ok: false; subscriptionRequired: boolean }
  | { ok: true; team: TeamWithStats; teamRole: TeamMemberRole };

async function authorizeDashboardTeam(
  teamId: number,
  options: TeamDashboardOptions
): Promise<DashboardAccess> {
  if (!options.requestUserId) {
    return { ok: false, subscriptionRequired: false };
  }

  const team = await getTeamWithStats(teamId);
  if (!team) {
    return { ok: false, subscriptionRequired: false };
  }

  const teamRole = await getActiveTeamMemberRole(teamId, options.requestUserId);
  if (!teamRole) {
    return { ok: false, subscriptionRequired: false };
  }

  if (!options.allowInactiveSubscription && !hasActiveTeamSubscription(team)) {
    return { ok: false, subscriptionRequired: true };
  }

  return { ok: true, team, teamRole };
}

async function teamItemsFromLedger(teamId: number) {
  const [locations, items, transactions] = await Promise.all([
    getTeamLocations(teamId),
    getTeamItems(teamId),
    getTeamStockTransactions(teamId),
  ]);
  const locationDtos = locations.map(toLocationDto);
  return {
    locations: locationDtos,
    items: itemsWithLocationBalancesFromLedger(
      items.map((item) => toItemDto(item)),
      transactions,
      locationDtos
    ),
  };
}

export async function getTeamReportsData(
  teamId: number,
  startDate?: Date,
  endDate?: Date,
  options: TeamDashboardOptions = {}
) {
  const access = await authorizeDashboardTeam(teamId, options);
  if (!access.ok) {
    return {
      team: null,
      stats: EMPTY_REPORT_STATS,
      subscriptionRequired: access.subscriptionRequired,
    };
  }

  const [stats, locations, items, transactions] = await Promise.all([
    getTeamReportStats(teamId, startDate, endDate),
    getTeamLocations(teamId),
    getTeamItems(teamId),
    getTeamStockTransactions(teamId),
  ]);
  return {
    team: toTeamDto(access.team),
    stats: toReportStatsDto({
      ...stats,
      stockByLocation: reportStockByLocationFromLedger(
        items.map((item) => toItemDto(item)),
        transactions,
        locations.map(toLocationDto)
      ),
    }),
    subscriptionRequired: false,
  };
}

export async function getTeamStockByLocationData(
  teamId: number,
  options: TeamDashboardOptions = {}
) {
  const access = await authorizeDashboardTeam(teamId, options);
  if (!access.ok) {
    return {
      team: null,
      locations: [],
      items: [],
      destinationTeams: [],
      subscriptionRequired: access.subscriptionRequired,
    };
  }

  const { locations: locationDtos, items: itemDtos } =
    await teamItemsFromLedger(teamId);

  return {
    team: toTeamDto(access.team),
    locations: locationDtos,
    items: itemDtos,
    subscriptionRequired: false,
  };
}

export async function getTeamLabelsData(
  teamId: number,
  options: TeamDashboardOptions = {}
) {
  const access = await authorizeDashboardTeam(teamId, options);
  if (!access.ok) {
    return {
      team: null,
      items: [],
      subscriptionRequired: access.subscriptionRequired,
    };
  }

  const items = await getTeamItems(teamId);
  return {
    team: toTeamDto(access.team),
    items: items.map((item) => toItemDto(item)),
    subscriptionRequired: false,
  };
}

export async function getItemDetailsData(
  teamId: number,
  itemId: number,
  options: TeamDashboardOptions = {}
) {
  const access = await authorizeDashboardTeam(teamId, options);
  if (!access.ok) {
    return {
      team: null,
      item: null,
      transactions: [],
      subscriptionRequired: access.subscriptionRequired,
    };
  }

  const [item, transactions] = await Promise.all([
    getItemByIdWithLocation(itemId),
    getItemStockTransactionsWithDetails(teamId, itemId),
  ]);

  if (!item || item.teamId !== teamId) {
    return {
      team: toTeamDto(access.team),
      item: null,
      transactions: [],
      subscriptionRequired: false,
    };
  }

  return {
    team: toTeamDto(access.team),
    item: toItemDto(item),
    transactions: transactions.map(toTransactionDto),
    subscriptionRequired: false,
  };
}

export async function getTeamItemsData(
  teamId: number,
  options: TeamDashboardOptions = {}
) {
  const access = await authorizeDashboardTeam(teamId, options);
  if (!access.ok) {
    return {
      team: null,
      items: [],
      subscriptionRequired: access.subscriptionRequired,
    };
  }

  const { items } = await teamItemsFromLedger(teamId);
  return {
    team: toTeamDto(access.team),
    items,
    subscriptionRequired: false,
  };
}

export async function getTeamLocationsData(
  teamId: number,
  options: TeamDashboardOptions = {}
) {
  const access = await authorizeDashboardTeam(teamId, options);
  if (!access.ok) {
    return {
      team: null,
      locations: [],
      subscriptionRequired: access.subscriptionRequired,
    };
  }

  const locations = await getTeamLocations(teamId);
  return {
    team: toTeamDto(access.team),
    locations: locations.map(toLocationDto),
    subscriptionRequired: false,
  };
}

export async function getTeamTransactionsData(
  teamId: number,
  searchQuery?: string,
  requestUserId?: number | null,
  options: TeamDashboardOptions = {}
) {
  const access = await authorizeDashboardTeam(teamId, {
    ...options,
    requestUserId: requestUserId ?? options.requestUserId,
  });
  if (!access.ok) {
    return {
      team: null,
      transactions: [],
      canDeleteTransactions: false,
      subscriptionRequired: access.subscriptionRequired,
    };
  }

  const transactions = await getTeamStockTransactionsWithDetails(
    teamId,
    searchQuery
  );

  return {
    team: toTeamDto(access.team),
    transactions: transactions.map(toTransactionDto),
    canDeleteTransactions:
      access.teamRole === "admin" || access.teamRole === "operator",
    subscriptionRequired: false,
  };
}

export async function getTeamStockOperationData(
  teamId: number,
  options: TeamDashboardOptions = {}
) {
  const access = await authorizeDashboardTeam(teamId, options);
  if (!access.ok) {
    return {
      team: null,
      locations: [],
      items: [],
      destinationTeams: [],
      subscriptionRequired: access.subscriptionRequired,
    };
  }

  const { locations, items } = await teamItemsFromLedger(teamId);

  const destinationTeams = access.team.companyId
    ? (await getCompanyTeams(access.team.companyId)).filter(
        (companyTeam) =>
          companyTeam.id !== teamId && hasActiveTeamSubscription(companyTeam)
      )
    : [];

  return {
    team: toTeamDto(access.team),
    locations,
    items,
    destinationTeams: destinationTeams.map((destinationTeam) => ({
      id: destinationTeam.id,
      name: destinationTeam.name,
    })),
    subscriptionRequired: false,
  };
}

export async function getTeamBasicData(
  teamId: number,
  options: TeamDashboardOptions = {}
) {
  const access = await authorizeDashboardTeam(teamId, options);
  if (!access.ok) {
    return { team: null, subscriptionRequired: access.subscriptionRequired };
  }
  return { team: toTeamDto(access.team), subscriptionRequired: false };
}

export async function getTeamItemEditData(
  teamId: number,
  itemId: number,
  options: TeamDashboardOptions = {}
) {
  const access = await authorizeDashboardTeam(teamId, options);
  if (!access.ok) {
    return {
      team: null,
      item: null,
      subscriptionRequired: access.subscriptionRequired,
    };
  }

  const item = await getItemByIdWithLocation(itemId);
  if (!item || item.teamId !== teamId) {
    return { team: null, item: null, subscriptionRequired: false };
  }

  return {
    team: toTeamDto(access.team),
    item: toItemDto(item),
    subscriptionRequired: false,
  };
}

export async function getTeamLocationEditData(
  teamId: number,
  locationId: number,
  options: TeamDashboardOptions = {}
) {
  const access = await authorizeDashboardTeam(teamId, options);
  if (!access.ok) {
    return {
      team: null,
      location: null,
      subscriptionRequired: access.subscriptionRequired,
    };
  }

  const location = await getLocationById(locationId);
  if (!location || location.teamId !== teamId) {
    return { team: null, location: null, subscriptionRequired: false };
  }

  return {
    team: toTeamDto(access.team),
    location: toLocationDto(location),
    subscriptionRequired: false,
  };
}
