import { getTeamWithStats } from "@/lib/db/teams";
import { getTeamItems, getItemByIdWithLocation } from "@/lib/db/items";
import { getTeamLocations } from "@/lib/db/locations";
import { getTeamReportStats } from "@/lib/db/reports";
import { getItemStockTransactionsWithDetails } from "@/lib/db/stock-transactions";
import { toItemDto, toTransactionDto } from "@/lib/services/mappers";

export async function getTeamReportsData(
  teamId: number,
  startDate?: Date,
  endDate?: Date
) {
  const [team, stats] = await Promise.all([
    getTeamWithStats(teamId),
    getTeamReportStats(teamId, startDate, endDate),
  ]);

  return { team, stats };
}

export async function getTeamStockByLocationData(teamId: number) {
  const [team, locations, items] = await Promise.all([
    getTeamWithStats(teamId),
    getTeamLocations(teamId),
    getTeamItems(teamId),
  ]);

  return { team, locations, items };
}

export async function getTeamLabelsData(teamId: number) {
  const [team, items] = await Promise.all([
    getTeamWithStats(teamId),
    getTeamItems(teamId),
  ]);

  return { team, items };
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
