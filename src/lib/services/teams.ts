import {
  createTeam,
  deleteTeam,
  getTeamWithStats,
  getUserTeamsWithStats,
  updateTeam,
} from "@/lib/db/teams";
import { getActiveCompanyIdForUser } from "@/lib/db/companies";
import { ERROR_CODES } from "@/lib/errors";
import { isUniqueConstraintError } from "@/lib/error-utils";
import {
  authorizePermission,
  authorizeTeamAccess,
  authorizeTeamPermission,
} from "@/lib/permissions";
import { parseTeamCreatePayload, parseTeamUpdatePayload } from "@/lib/contracts/schemas";
import type { ServiceResult, TeamDto } from "@/lib/services/types";
import {
  makeServiceError,
  authServiceError,
  conflictValidationServiceError,
  internalServiceError,
  notFoundServiceError,
  validationServiceError,
} from "@/lib/services/errors";
import { toTeamDto } from "@/lib/services/mappers";

const BLOCKED_TEAM_DELETE_SUBSCRIPTION_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
  "canceling",
]);

export async function createTeamForUser(params: {
  requestUserId: number | null;
  payload: unknown;
}): Promise<ServiceResult<{ team: TeamDto }>> {
  const parsed = parseTeamCreatePayload(params.payload);
  if (!parsed.ok) {
    return { ok: false, error: validationServiceError(parsed.error) };
  }

  if (!params.requestUserId) {
    return {
      ok: false,
      error: {
        status: 401,
        errorCode: ERROR_CODES.USER_NOT_AUTHENTICATED,
        error: "User not authenticated",
      },
    };
  }

  const auth = await authorizePermission({
    permission: "team:create",
    targetUserId: params.requestUserId,
    requestUserId: params.requestUserId,
  });
  if (!auth.ok) {
    return { ok: false, error: authServiceError(auth) };
  }

  const companyId = await getActiveCompanyIdForUser(params.requestUserId);
  if (!companyId) {
    return {
      ok: false,
      error: {
        status: 403,
        errorCode: ERROR_CODES.FORBIDDEN,
        error: "User is not linked to an active company",
      },
    };
  }

  try {
    const team = await createTeam({
      name: parsed.data.name,
      notes: parsed.data.notes,
      userId: params.requestUserId,
      companyId,
    });
    return { ok: true, data: { team: toTeamDto(team) } };
  } catch (error: unknown) {
    if (isUniqueConstraintError(error)) {
      return {
        ok: false,
        error: conflictValidationServiceError("A team with this name already exists"),
      };
    }
    return {
      ok: false,
      error: internalServiceError("An error occurred while creating the team"),
    };
  }
}

export async function getUserTeamsForUser(params: {
  requestUserId: number | null;
}): Promise<ServiceResult<{ teams: TeamDto[] }>> {
  if (!params.requestUserId) {
    return {
      ok: false,
      error: {
        status: 401,
        errorCode: ERROR_CODES.USER_NOT_AUTHENTICATED,
        error: "User not authenticated",
      },
    };
  }

  try {
    const teams = await getUserTeamsWithStats(params.requestUserId);
    return { ok: true, data: { teams: teams.map(toTeamDto) } };
  } catch {
    return {
      ok: false,
      error: internalServiceError("An error occurred while fetching teams"),
    };
  }
}

export async function getTeamForUser(params: {
  teamId: number;
  requestUserId: number | null;
}): Promise<ServiceResult<{ team: TeamDto }>> {
  const auth = await authorizeTeamAccess({
    teamId: params.teamId,
    requestUserId: params.requestUserId,
  });
  if (!auth.ok) {
    return { ok: false, error: authServiceError(auth) };
  }

  const team = auth.team;
  if (!team) {
    return {
      ok: false,
      error: internalServiceError("An error occurred while fetching team"),
    };
  }

  return { ok: true, data: { team: toTeamDto(team) } };
}

export interface UpdateTeamDetailsInput {
  teamId: number;
  requestUserId: number | null;
  payload: unknown;
}

export async function updateTeamDetails(
  params: UpdateTeamDetailsInput
): Promise<ServiceResult<{ team: TeamDto }>> {
  const existingTeam = await getTeamWithStats(params.teamId);
  if (!existingTeam) {
    return {
      ok: false,
      error: notFoundServiceError(ERROR_CODES.TEAM_NOT_FOUND, "Team not found"),
    };
  }

  const auth = await authorizeTeamPermission({
    permission: "team:update",
    teamId: params.teamId,
    requestUserId: params.requestUserId,
  });
  if (!auth.ok) {
    return {
      ok: false,
      error: authServiceError(auth),
    };
  }

  const parsed = parseTeamUpdatePayload(params.payload);
  if (!parsed.ok) {
    return {
      ok: false,
      error: validationServiceError(parsed.error),
    };
  }

  try {
    const team = await updateTeam(params.teamId, parsed.data);
    return { ok: true, data: { team: toTeamDto(team) } };
  } catch (error: unknown) {
    if (isUniqueConstraintError(error)) {
      return {
        ok: false,
        error: conflictValidationServiceError("A team with this name already exists"),
      };
    }

    return {
      ok: false,
      error: internalServiceError("An error occurred while updating the team"),
    };
  }
}

export interface DeleteTeamWithAuthorizationInput {
  teamId: number;
  requestUserId: number | null;
}

export async function deleteTeamWithAuthorization(
  params: DeleteTeamWithAuthorizationInput
): Promise<ServiceResult<null>> {
  const existingTeam = await getTeamWithStats(params.teamId);
  if (!existingTeam) {
    return {
      ok: false,
      error: notFoundServiceError(ERROR_CODES.TEAM_NOT_FOUND, "Team not found"),
    };
  }
  if (
    existingTeam.stripeSubscriptionStatus &&
    BLOCKED_TEAM_DELETE_SUBSCRIPTION_STATUSES.has(existingTeam.stripeSubscriptionStatus)
  ) {
    return {
      ok: false,
      error: makeServiceError(
        409,
        ERROR_CODES.VALIDATION_ERROR,
        "Cannot delete team while subscription is active"
      ),
    };
  }

  const auth = await authorizeTeamPermission({
    permission: "team:delete",
    teamId: params.teamId,
    requestUserId: params.requestUserId,
  });
  if (!auth.ok) {
    if (auth.status === 403) {
      return {
        ok: false,
        error: {
          status: 403,
          errorCode: ERROR_CODES.INSUFFICIENT_PERMISSIONS,
          error: "Only team admins can delete a team",
        },
      };
    }
    return {
      ok: false,
      error: authServiceError(auth),
    };
  }

  try {
    const deleted = await deleteTeam(params.teamId);
    if (!deleted) {
      return {
        ok: false,
        error: internalServiceError("Failed to delete team"),
      };
    }

    return { ok: true, data: null };
  } catch {
    return {
      ok: false,
      error: internalServiceError("An error occurred while deleting the team"),
    };
  }
}
