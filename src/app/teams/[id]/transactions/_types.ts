import type { TransactionDto } from "@/lib/services/types";

export type TransactionWithDetails = TransactionDto;

export interface Team {
  id: number;
  name: string;
}
