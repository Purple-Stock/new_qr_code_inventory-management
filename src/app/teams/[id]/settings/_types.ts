import type {
  AvailableUserDto,
  CompanyTeamDto,
  ManagedUserDto,
  TeamDto,
} from "@/lib/services/types";

export type Team = Pick<TeamDto, "id" | "name" | "notes">;

export type ManagedUser = ManagedUserDto;

export type ManagedUserRole = "admin" | "operator" | "viewer";

export type AvailableUser = AvailableUserDto;

export type CompanyTeam = CompanyTeamDto;
