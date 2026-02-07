import type { ReportStatsDto, TeamDto } from "@/lib/services/types";

export type Team = Pick<TeamDto, "id" | "name">;

export type ReportStats = ReportStatsDto;
