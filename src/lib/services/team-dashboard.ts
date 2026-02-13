import { getTeamWithStats } from "@/lib/db/teams";
import { getTeamItems, getItemByIdWithLocation } from "@/lib/db/items";
import { getLocationById, getTeamLocations } from "@/lib/db/locations";
import { getTeamReportStats } from "@/lib/db/reports";
import {
  getItemStockTransactionsWithDetails,
  getTeamStockTransactionsWithDetails,
} from "@/lib/db/stock-transactions";
import {
  toItemDto,
  toLocationDto,
  toReportStatsDto,
  toTeamDto,
  toTransactionDto,
} from "@/lib/services/mappers";
import { hasActiveTeamSubscription } from "@/lib/services/subscription-access";

interface TeamDashboardOptions {
  allowInactiveSubscription?: boolean;
}

export async function getTeamReportsData(
  teamId: number,
  startDate?: Date,
  endDate?: Date,
  options: TeamDashboardOptions = {}
) {
  const [team, stats] = await Promise.all([
    getTeamWithStats(teamId),
    getTeamReportStats(teamId, startDate, endDate),
  ]);

  if (!team) {
    return { team: null, stats: toReportStatsDto(stats), subscriptionRequired: false };
  }
  if (!options.allowInactiveSubscription && !hasActiveTeamSubscription(team)) {
    return { team: null, stats: toReportStatsDto(stats), subscriptionRequired: true };
  }

  return { team: toTeamDto(team), stats: toReportStatsDto(stats), subscriptionRequired: false };
}

export async function getTeamStockByLocationData(
  teamId: number,
  options: TeamDashboardOptions = {}
) {
  const [team, locations, items] = await Promise.all([
    getTeamWithStats(teamId),
    getTeamLocations(teamId),
    getTeamItems(teamId),
  ]);

  if (!team) {
    return {
      team: null,
      locations: locations.map(toLocationDto),
      items: items.map((item) => toItemDto(item)),
      subscriptionRequired: false,
    };
  }
  if (!options.allowInactiveSubscription && !hasActiveTeamSubscription(team)) {
    return {
      team: null,
      locations: [],
      items: [],
      subscriptionRequired: true,
    };
  }

  return {
    team: toTeamDto(team),
    locations: locations.map(toLocationDto),
    items: items.map((item) => toItemDto(item)),
    subscriptionRequired: false,
  };
}

export async function getTeamLabelsData(teamId: number, options: TeamDashboardOptions = {}) {
  const [team, items] = await Promise.all([
    getTeamWithStats(teamId),
    getTeamItems(teamId),
  ]);

  if (!team) {
    return { team: null, items: items.map((item) => toItemDto(item)), subscriptionRequired: false };
  }
  if (!options.allowInactiveSubscription && !hasActiveTeamSubscription(team)) {
    return { team: null, items: [], subscriptionRequired: true };
  }

  return { team: toTeamDto(team), items: items.map((item) => toItemDto(item)), subscriptionRequired: false };
}

export async function getItemDetailsData(
  teamId: number,
  itemId: number,
  options: TeamDashboardOptions = {}
) {
  const [team, item, transactions] = await Promise.all([
    getTeamWithStats(teamId),
    getItemByIdWithLocation(itemId),
    getItemStockTransactionsWithDetails(teamId, itemId),
  ]);

  if (!team) {
    return { team: null, item: null, transactions: [], subscriptionRequired: false };
  }
  if (!options.allowInactiveSubscription && !hasActiveTeamSubscription(team)) {
    return { team: null, item: null, transactions: [], subscriptionRequired: true };
  }

  if (!item || item.teamId !== teamId) {
    return { team: toTeamDto(team), item: null, transactions: [], subscriptionRequired: false };
  }

  return {
    team: toTeamDto(team),
    item: toItemDto(item),
    transactions: transactions.map(toTransactionDto),
    subscriptionRequired: false,
  };
}

export async function getTeamItemsData(teamId: number, options: TeamDashboardOptions = {}) {
  const [team, items] = await Promise.all([getTeamWithStats(teamId), getTeamItems(teamId)]);
  if (!team) {
    return {
      team: null,
      items: items.map((item) => toItemDto(item)),
      subscriptionRequired: false,
    };
  }
  if (!options.allowInactiveSubscription && !hasActiveTeamSubscription(team)) {
    return {
      team: null,
      items: [],
      subscriptionRequired: true,
    };
  }
  return {
    team: toTeamDto(team),
    items: items.map((item) => toItemDto(item)),
    subscriptionRequired: false,
  };
}

export async function getTeamLocationsData(teamId: number, options: TeamDashboardOptions = {}) {
  const [team, locations] = await Promise.all([getTeamWithStats(teamId), getTeamLocations(teamId)]);
  if (!team) {
    return {
      team: null,
      locations: locations.map(toLocationDto),
      subscriptionRequired: false,
    };
  }
  if (!options.allowInactiveSubscription && !hasActiveTeamSubscription(team)) {
    return {
      team: null,
      locations: [],
      subscriptionRequired: true,
    };
  }
  return {
    team: toTeamDto(team),
    locations: locations.map(toLocationDto),
    subscriptionRequired: false,
  };
}

export async function getTeamTransactionsData(
  teamId: number,
  searchQuery?: string,
  options: TeamDashboardOptions = {}
) {
  const [team, transactions] = await Promise.all([
    getTeamWithStats(teamId),
    getTeamStockTransactionsWithDetails(teamId, searchQuery),
  ]);
  if (!team) {
    return {
      team: null,
      transactions: transactions.map(toTransactionDto),
      subscriptionRequired: false,
    };
  }
  if (!options.allowInactiveSubscription && !hasActiveTeamSubscription(team)) {
    return {
      team: null,
      transactions: [],
      subscriptionRequired: true,
    };
  }
  return {
    team: toTeamDto(team),
    transactions: transactions.map(toTransactionDto),
    subscriptionRequired: false,
  };
}

export async function getTeamStockOperationData(
  teamId: number,
  options: TeamDashboardOptions = {}
) {
  const [team, locations, items] = await Promise.all([
    getTeamWithStats(teamId),
    getTeamLocations(teamId),
    getTeamItems(teamId),
  ]);

  if (!team) {
    return {
      team: null,
      locations: locations.map(toLocationDto),
      items: items.map((item) => toItemDto(item)),
      subscriptionRequired: false,
    };
  }
  if (!options.allowInactiveSubscription && !hasActiveTeamSubscription(team)) {
    return {
      team: null,
      locations: [],
      items: [],
      subscriptionRequired: true,
    };
  }

  return {
    team: toTeamDto(team),
    locations: locations.map(toLocationDto),
    items: items.map((item) => toItemDto(item)),
    subscriptionRequired: false,
  };
}

export async function getTeamBasicData(teamId: number, options: TeamDashboardOptions = {}) {
  const team = await getTeamWithStats(teamId);
  if (!team) {
    return { team: null, subscriptionRequired: false };
  }
  if (!options.allowInactiveSubscription && !hasActiveTeamSubscription(team)) {
    return { team: null, subscriptionRequired: true };
  }
  return { team: toTeamDto(team), subscriptionRequired: false };
}

export async function getTeamItemEditData(
  teamId: number,
  itemId: number,
  options: TeamDashboardOptions = {}
) {
  const [team, item] = await Promise.all([getTeamWithStats(teamId), getItemByIdWithLocation(itemId)]);
  if (!team) {
    return { team: null, item: null, subscriptionRequired: false };
  }
  if (!options.allowInactiveSubscription && !hasActiveTeamSubscription(team)) {
    return { team: null, item: null, subscriptionRequired: true };
  }
  if (!team || !item || item.teamId !== teamId) {
    return { team: null, item: null, subscriptionRequired: false };
  }
  return { team: toTeamDto(team), item: toItemDto(item), subscriptionRequired: false };
}

export async function getTeamLocationEditData(
  teamId: number,
  locationId: number,
  options: TeamDashboardOptions = {}
) {
  const [team, location] = await Promise.all([getTeamWithStats(teamId), getLocationById(locationId)]);
  if (!team) {
    return { team: null, location: null, subscriptionRequired: false };
  }
  if (!options.allowInactiveSubscription && !hasActiveTeamSubscription(team)) {
    return { team: null, location: null, subscriptionRequired: true };
  }
  if (!team || !location || location.teamId !== teamId) {
    return { team: null, location: null, subscriptionRequired: false };
  }
  return { team: toTeamDto(team), location: toLocationDto(location), subscriptionRequired: false };
}
