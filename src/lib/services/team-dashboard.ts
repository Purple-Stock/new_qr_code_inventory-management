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

export async function getTeamReportsData(
  teamId: number,
  startDate?: Date,
  endDate?: Date
) {
  const [team, stats] = await Promise.all([
    getTeamWithStats(teamId),
    getTeamReportStats(teamId, startDate, endDate),
  ]);

  return { team: team ? toTeamDto(team) : null, stats: toReportStatsDto(stats) };
}

export async function getTeamStockByLocationData(teamId: number) {
  const [team, locations, items] = await Promise.all([
    getTeamWithStats(teamId),
    getTeamLocations(teamId),
    getTeamItems(teamId),
  ]);

  return {
    team: team ? toTeamDto(team) : null,
    locations: locations.map(toLocationDto),
    items: items.map((item) => toItemDto(item)),
  };
}

export async function getTeamLabelsData(teamId: number) {
  const [team, items] = await Promise.all([
    getTeamWithStats(teamId),
    getTeamItems(teamId),
  ]);

  return { team: team ? toTeamDto(team) : null, items: items.map((item) => toItemDto(item)) };
}

export async function getItemDetailsData(teamId: number, itemId: number) {
  const [item, transactions] = await Promise.all([
    getItemByIdWithLocation(itemId),
    getItemStockTransactionsWithDetails(teamId, itemId),
  ]);

  if (!item || item.teamId !== teamId) {
    return { item: null, transactions: [] };
  }

  return { item: toItemDto(item), transactions: transactions.map(toTransactionDto) };
}

export async function getTeamItemsData(teamId: number) {
  const [team, items] = await Promise.all([getTeamWithStats(teamId), getTeamItems(teamId)]);
  return {
    team: team ? toTeamDto(team) : null,
    items: items.map((item) => toItemDto(item)),
  };
}

export async function getTeamLocationsData(teamId: number) {
  const [team, locations] = await Promise.all([getTeamWithStats(teamId), getTeamLocations(teamId)]);
  return {
    team: team ? toTeamDto(team) : null,
    locations: locations.map(toLocationDto),
  };
}

export async function getTeamTransactionsData(teamId: number, searchQuery?: string) {
  const [team, transactions] = await Promise.all([
    getTeamWithStats(teamId),
    getTeamStockTransactionsWithDetails(teamId, searchQuery),
  ]);
  return {
    team: team ? toTeamDto(team) : null,
    transactions: transactions.map(toTransactionDto),
  };
}

export async function getTeamStockOperationData(teamId: number) {
  const [team, locations, items] = await Promise.all([
    getTeamWithStats(teamId),
    getTeamLocations(teamId),
    getTeamItems(teamId),
  ]);

  return {
    team: team ? toTeamDto(team) : null,
    locations: locations.map(toLocationDto),
    items: items.map((item) => toItemDto(item)),
  };
}

export async function getTeamBasicData(teamId: number) {
  const team = await getTeamWithStats(teamId);
  return { team: team ? toTeamDto(team) : null };
}

export async function getTeamItemEditData(teamId: number, itemId: number) {
  const [team, item] = await Promise.all([getTeamWithStats(teamId), getItemByIdWithLocation(itemId)]);
  if (!team || !item || item.teamId !== teamId) {
    return { team: null, item: null };
  }
  return { team: toTeamDto(team), item: toItemDto(item) };
}

export async function getTeamLocationEditData(teamId: number, locationId: number) {
  const [team, location] = await Promise.all([getTeamWithStats(teamId), getLocationById(locationId)]);
  if (!team || !location || location.teamId !== teamId) {
    return { team: null, location: null };
  }
  return { team: toTeamDto(team), location: toLocationDto(location) };
}
