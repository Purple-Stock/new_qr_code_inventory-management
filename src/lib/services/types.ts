import type { ErrorCode } from "@/lib/errors";
import type { StockTransactionType } from "@/db/schema";

export type ServiceError = {
  status: number;
  errorCode: ErrorCode;
  error: string;
};

export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ServiceError };

export type ItemDto = {
  id: number;
  name: string | null;
  sku: string | null;
  barcode: string | null;
  cost: number | null;
  price: number | null;
  itemType: string | null;
  brand: string | null;
  initialQuantity: number | null;
  currentStock: number | null;
  minimumStock: number | null;
  teamId: number;
  locationId: number | null;
  locationName?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TeamDto = {
  id: number;
  name: string;
  notes: string | null;
  userId: number;
  companyId: number | null;
  companyName: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripeSubscriptionStatus: string | null;
  stripePriceId: string | null;
  stripeCurrentPeriodEnd: string | null;
  manualTrialEndsAt: string | null;
  itemCount: number;
  transactionCount: number;
  memberCount: number;
  teamRole?: string;
  canDeleteTeam?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type LocationDto = {
  id: number;
  name: string;
  description: string | null;
  teamId: number;
  createdAt: string;
  updatedAt: string;
};

export type ManagedUserDto = {
  userId: number;
  email: string;
  role: string;
  status: string;
};

export type AvailableUserDto = {
  id: number;
  email: string;
};

export type CompanyTeamDto = {
  id: number;
  name: string;
};

export type ReportStatsDto = {
  totalItems: number;
  totalLocations: number;
  totalTransactions: number;
  totalStockValue: number;
  lowStockItems: number;
  outOfStockItems: number;
  transactionsByType: {
    stock_in: number;
    stock_out: number;
    adjust: number;
    move: number;
  };
  recentTransactions: Array<{
    id: number;
    transactionType: StockTransactionType;
    quantity: number;
    createdAt: string;
    itemName: string | null;
  }>;
  topItemsByValue: Array<{
    id: number;
    name: string | null;
    sku: string | null;
    currentStock: number | null;
    price: number | null;
    totalValue: number;
  }>;
  stockByLocation: Array<{
    locationId: number | null;
    locationName: string | null;
    itemCount: number;
    totalStock: number;
    totalValue: number;
  }>;
  transactionsByDate: Array<{
    date: string;
    stock_in: number;
    stock_out: number;
    adjust: number;
    move: number;
  }>;
};

export type StockTransactionDto = {
  id: number;
  itemId: number;
  teamId: number;
  transactionType: StockTransactionType;
  quantity: number;
  notes: string | null;
  userId: number;
  sourceLocationId: number | null;
  destinationLocationId: number | null;
  createdAt: string;
  updatedAt: string;
};

export type TransactionDto = StockTransactionDto & {
  item: {
    id: number;
    name: string | null;
    sku: string | null;
    barcode: string | null;
  } | null;
  user: {
    id: number;
    email: string;
  } | null;
  sourceLocation: {
    id: number;
    name: string;
  } | null;
  destinationLocation: {
    id: number;
    name: string;
  } | null;
};
