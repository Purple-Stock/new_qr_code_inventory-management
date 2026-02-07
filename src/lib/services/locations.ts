import { getTeamWithStats } from "@/lib/db/teams";
import {
  createLocation,
  deleteLocation,
  getLocationById,
  updateLocation,
} from "@/lib/db/locations";
import { ERROR_CODES } from "@/lib/errors";
import { authorizeTeamPermission } from "@/lib/permissions";
import { parseLocationPayload } from "@/lib/validation";
import type { Location } from "@/db/schema";
import type { ServiceResult } from "@/lib/services/types";
import {
  authServiceError,
  conflictValidationServiceError,
  internalServiceError,
  notFoundServiceError,
  validationServiceError,
} from "@/lib/services/errors";

export async function createTeamLocation(params: {
  teamId: number;
  requestUserId: number | null;
  payload: unknown;
}): Promise<ServiceResult<{ location: Location }>> {
  const team = await getTeamWithStats(params.teamId);
  if (!team) {
    return {
      ok: false,
      error: notFoundServiceError(ERROR_CODES.TEAM_NOT_FOUND, "Team not found"),
    };
  }

  const auth = await authorizeTeamPermission({
    permission: "location:write",
    teamId: params.teamId,
    requestUserId: params.requestUserId,
  });
  if (!auth.ok) {
    return { ok: false, error: authServiceError(auth) };
  }

  const parsed = parseLocationPayload(params.payload);
  if (!parsed.ok) {
    return { ok: false, error: validationServiceError(parsed.error) };
  }

  try {
    const location = await createLocation({
      name: parsed.data.name,
      description: parsed.data.description,
      teamId: params.teamId,
    });
    return { ok: true, data: { location } };
  } catch (error: any) {
    if (error?.message?.includes("UNIQUE constraint")) {
      return {
        ok: false,
        error: conflictValidationServiceError(
          "A location with this name already exists for this team"
        ),
      };
    }
    return {
      ok: false,
      error: internalServiceError("An error occurred while creating the location"),
    };
  }
}

export async function updateTeamLocation(params: {
  teamId: number;
  locationId: number;
  requestUserId: number | null;
  payload: unknown;
}): Promise<ServiceResult<{ location: Location }>> {
  const team = await getTeamWithStats(params.teamId);
  if (!team) {
    return {
      ok: false,
      error: notFoundServiceError(ERROR_CODES.TEAM_NOT_FOUND, "Team not found"),
    };
  }

  const existingLocation = await getLocationById(params.locationId);
  if (!existingLocation) {
    return {
      ok: false,
      error: notFoundServiceError(ERROR_CODES.LOCATION_NOT_FOUND, "Location not found"),
    };
  }

  if (existingLocation.teamId !== params.teamId) {
    return {
      ok: false,
      error: {
        status: 403,
        errorCode: ERROR_CODES.FORBIDDEN,
        error: "Location does not belong to this team",
      },
    };
  }

  const auth = await authorizeTeamPermission({
    permission: "location:write",
    teamId: params.teamId,
    requestUserId: params.requestUserId,
  });
  if (!auth.ok) {
    return {
      ok: false,
      error: authServiceError(auth),
    };
  }

  const parsed = parseLocationPayload(params.payload);
  if (!parsed.ok) {
    return {
      ok: false,
      error: validationServiceError(parsed.error),
    };
  }

  try {
    const location = await updateLocation(params.locationId, parsed.data);
    return { ok: true, data: { location } };
  } catch (error: any) {
    if (error?.message?.includes("UNIQUE constraint")) {
      return {
        ok: false,
        error: conflictValidationServiceError(
          "A location with this name already exists for this team"
        ),
      };
    }

    return {
      ok: false,
      error: internalServiceError("An error occurred while updating the location"),
    };
  }
}

export async function deleteTeamLocation(params: {
  teamId: number;
  locationId: number;
  requestUserId: number | null;
}): Promise<ServiceResult<null>> {
  const team = await getTeamWithStats(params.teamId);
  if (!team) {
    return {
      ok: false,
      error: notFoundServiceError(ERROR_CODES.TEAM_NOT_FOUND, "Team not found"),
    };
  }

  const location = await getLocationById(params.locationId);
  if (!location) {
    return {
      ok: false,
      error: notFoundServiceError(ERROR_CODES.LOCATION_NOT_FOUND, "Location not found"),
    };
  }

  if (location.teamId !== params.teamId) {
    return {
      ok: false,
      error: {
        status: 403,
        errorCode: ERROR_CODES.FORBIDDEN,
        error: "Location does not belong to this team",
      },
    };
  }

  const auth = await authorizeTeamPermission({
    permission: "location:delete",
    teamId: params.teamId,
    requestUserId: params.requestUserId,
  });
  if (!auth.ok) {
    return {
      ok: false,
      error: authServiceError(auth),
    };
  }

  try {
    await deleteLocation(params.locationId);
    return { ok: true, data: null };
  } catch {
    return {
      ok: false,
      error: internalServiceError("An error occurred while deleting the location"),
    };
  }
}
