import type { LocationDto, TeamDto } from "@/lib/services/types";

export type Location = LocationDto;

export type Team = Pick<TeamDto, "id" | "name" | "itemCount" | "transactionCount">;
