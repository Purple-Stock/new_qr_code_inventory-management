import type { Item, StockTransaction } from "@/db/schema";
import type { TransactionWithDetails } from "@/lib/db/stock-transactions";
import type {
  AvailableUserDto,
  CompanyTeamDto,
  ItemDto,
  LocationDto,
  ManagedUserDto,
  ReportStatsDto,
  StockTransactionDto,
  TeamDto,
  TransactionDto,
} from "@/lib/services/types";
import type { ReportStats } from "@/lib/db/reports";

function toIsoString(value: Date | string | null | undefined): string {
  if (!value) return new Date(0).toISOString();
  return typeof value === "string" ? new Date(value).toISOString() : value.toISOString();
}

export function toItemDto(item: Item & { locationName?: string | null }): ItemDto {
  return {
    id: item.id,
    name: item.name,
    sku: item.sku,
    barcode: item.barcode,
    cost: item.cost,
    price: item.price,
    itemType: item.itemType,
    brand: item.brand,
    initialQuantity: item.initialQuantity,
    currentStock: item.currentStock,
    minimumStock: item.minimumStock,
    teamId: item.teamId,
    locationId: item.locationId,
    locationName: item.locationName ?? null,
    createdAt: toIsoString(item.createdAt),
    updatedAt: toIsoString(item.updatedAt),
  };
}

export function toTeamDto(
  team: {
    id: number;
    name: string;
    notes: string | null;
    userId: number;
    companyId: number | null;
    createdAt: Date | string;
    updatedAt: Date | string;
  } & Partial<{
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    stripeSubscriptionStatus: string | null;
    stripePriceId: string | null;
    stripeCurrentPeriodEnd: Date | string | null;
    itemCount: number;
    transactionCount: number;
    memberCount: number;
    teamRole: string;
    canDeleteTeam: boolean;
  }>
): TeamDto {
  return {
    id: team.id,
    name: team.name,
    notes: team.notes,
    userId: team.userId,
    companyId: team.companyId,
    stripeCustomerId: team.stripeCustomerId ?? null,
    stripeSubscriptionId: team.stripeSubscriptionId ?? null,
    stripeSubscriptionStatus: team.stripeSubscriptionStatus ?? null,
    stripePriceId: team.stripePriceId ?? null,
    stripeCurrentPeriodEnd: team.stripeCurrentPeriodEnd
      ? toIsoString(team.stripeCurrentPeriodEnd)
      : null,
    itemCount: team.itemCount ?? 0,
    transactionCount: team.transactionCount ?? 0,
    memberCount: team.memberCount ?? 0,
    teamRole: team.teamRole,
    canDeleteTeam: team.canDeleteTeam,
    createdAt: toIsoString(team.createdAt),
    updatedAt: toIsoString(team.updatedAt),
  };
}

export function toLocationDto(location: {
  id: number;
  name: string;
  description: string | null;
  teamId: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}): LocationDto {
  return {
    id: location.id,
    name: location.name,
    description: location.description,
    teamId: location.teamId,
    createdAt: toIsoString(location.createdAt),
    updatedAt: toIsoString(location.updatedAt),
  };
}

export function toManagedUserDto(member: {
  userId: number;
  email: string;
  role: string;
  status: string;
}): ManagedUserDto {
  return {
    userId: member.userId,
    email: member.email,
    role: member.role,
    status: member.status,
  };
}

export function toAvailableUserDto(user: { id: number; email: string }): AvailableUserDto {
  return {
    id: user.id,
    email: user.email,
  };
}

export function toCompanyTeamDto(team: { id: number; name: string }): CompanyTeamDto {
  return {
    id: team.id,
    name: team.name,
  };
}

export function toStockTransactionDto(transaction: StockTransaction): StockTransactionDto {
  return {
    id: transaction.id,
    itemId: transaction.itemId,
    teamId: transaction.teamId,
    transactionType: transaction.transactionType,
    quantity: transaction.quantity,
    notes: transaction.notes,
    userId: transaction.userId,
    sourceLocationId: transaction.sourceLocationId,
    destinationLocationId: transaction.destinationLocationId,
    createdAt: toIsoString(transaction.createdAt),
    updatedAt: toIsoString(transaction.updatedAt),
  };
}

export function toTransactionDto(transaction: TransactionWithDetails): TransactionDto {
  return {
    id: transaction.id,
    itemId: transaction.itemId,
    teamId: transaction.teamId,
    transactionType: transaction.transactionType,
    quantity: transaction.quantity,
    notes: transaction.notes,
    userId: transaction.userId,
    sourceLocationId: transaction.sourceLocationId,
    destinationLocationId: transaction.destinationLocationId,
    createdAt: toIsoString(transaction.createdAt),
    updatedAt: toIsoString(transaction.updatedAt),
    item: transaction.item
      ? {
          id: transaction.item.id,
          name: transaction.item.name,
          sku: transaction.item.sku,
          barcode: transaction.item.barcode,
        }
      : null,
    user: transaction.user
      ? {
          id: transaction.user.id,
          email: transaction.user.email,
        }
      : null,
    sourceLocation: transaction.sourceLocation
      ? {
          id: transaction.sourceLocation.id,
          name: transaction.sourceLocation.name,
        }
      : null,
    destinationLocation: transaction.destinationLocation
      ? {
          id: transaction.destinationLocation.id,
          name: transaction.destinationLocation.name,
        }
      : null,
  };
}

export function toReportStatsDto(stats: ReportStats): ReportStatsDto {
  return {
    ...stats,
    recentTransactions: stats.recentTransactions.map((transaction) => ({
      ...transaction,
      createdAt: toIsoString(transaction.createdAt),
    })),
  };
}
