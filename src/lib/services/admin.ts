import { findUserById } from "@/lib/db/users";
import { getAdminTeamsWithStats } from "@/lib/db/admin";
import { isSuperAdminUser } from "@/lib/db/super-admin";
import { ERROR_CODES } from "@/lib/errors";
import { internalServiceError, makeServiceError } from "@/lib/services/errors";
import { toTeamDto } from "@/lib/services/mappers";
import type { ServiceResult, TeamDto } from "@/lib/services/types";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function isEmailInSuperAdminAllowlist(email: string): boolean {
  const raw = process.env.SUPER_ADMIN_EMAILS?.trim();
  if (!raw) return false;
  const set = new Set(
    raw
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter((entry) => entry.length > 0)
  );
  return set.has(email.trim().toLowerCase());
}

function toPositiveInteger(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 1) return fallback;
  return parsed;
}

export async function getAllTeamsForSuperAdmin(params: {
  requestUserId: number | null;
  page?: string;
  pageSize?: string;
  search?: string;
}): Promise<
  ServiceResult<{
    teams: TeamDto[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  }>
> {
  if (!params.requestUserId) {
    return {
      ok: false,
      error: makeServiceError(401, ERROR_CODES.USER_NOT_AUTHENTICATED, "User not authenticated"),
    };
  }

  const requestUser = await findUserById(params.requestUserId);
  if (!requestUser) {
    return {
      ok: false,
      error: makeServiceError(401, ERROR_CODES.USER_NOT_AUTHENTICATED, "User not authenticated"),
    };
  }

  const hasSuperAdminAccess =
    requestUser.role === "super_admin" ||
    (await isSuperAdminUser(requestUser.id)) ||
    isEmailInSuperAdminAllowlist(requestUser.email);
  if (!hasSuperAdminAccess) {
    return {
      ok: false,
      error: makeServiceError(
        403,
        ERROR_CODES.INSUFFICIENT_PERMISSIONS,
        "Super admin access required"
      ),
    };
  }

  const page = toPositiveInteger(params.page, DEFAULT_PAGE);
  const pageSize = Math.min(toPositiveInteger(params.pageSize, DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);

  try {
    const { teams, total } = await getAdminTeamsWithStats({
      page,
      pageSize,
      search: params.search,
    });

    // Basic audit trail for privileged reads.
    console.info("[AUDIT] super_admin_read_all_teams", {
      requestUserId: params.requestUserId,
      page,
      pageSize,
      search: params.search ?? null,
      total,
      at: new Date().toISOString(),
    });

    const totalPages = total === 0 ? 1 : Math.ceil(total / pageSize);

    return {
      ok: true,
      data: {
        teams: teams.map(toTeamDto),
        pagination: {
          page,
          pageSize,
          total,
          totalPages,
        },
      },
    };
  } catch (error) {
    console.error("Error fetching teams for super admin:", error);
    return {
      ok: false,
      error: internalServiceError("An error occurred while fetching teams for super admin"),
    };
  }
}
