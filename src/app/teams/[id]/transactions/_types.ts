import type { TeamDto, TransactionDto } from "@/lib/services/types";

export type TransactionWithDetails = TransactionDto;

export type Team = Pick<TeamDto, "id" | "name">;

export type CounterpartyTeamOption = {
  id: number;
  name: string;
};
