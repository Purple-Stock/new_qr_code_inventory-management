import { getTeamWithStats } from "@/lib/db/teams";
import {
  createLocation,
  deleteLocation,
  getLocationById,
  getTeamLocations,
  updateLocation,
} from "@/lib/db/locations";
import { ERROR_CODES } from "@/lib/errors";
import { isUniqueConstraintError } from "@/lib/error-utils";
import { authorizeTeamAccess, authorizeTeamPermission } from "@/lib/permissions";
import { parseLocationPayload } from "@/lib/contracts/schemas";
import type { LocationDto, ServiceResult } from "@/lib/services/types";
import {
  authServiceError,
  conflictValidationServiceError,
  internalServiceError,
  makeServiceError,
  notFoundServiceError,
  validationServiceError,
} from "@/lib/services/errors";
import { toLocationDto } from "@/lib/services/mappers";

export async function listTeamLocationsForUser(params: {
  teamId: number;
  requestUserId: number | null;
}): Promise<ServiceResult<{ locations: LocationDto[] }>> {
  const auth = await authorizeTeamAccess({
    teamId: params.teamId,
    requestUserId: params.requestUserId,
  });
  if (!auth.ok) {
    return { ok: false, error: authServiceError(auth) };
  }

  try {
    const locations = await getTeamLocations(params.teamId);
    return { ok: true, data: { locations: locations.map(toLocationDto) } };
  } catch {
    return {
      ok: false,
      error: internalServiceError("An error occurred while fetching locations"),
    };
  }
}

export async function getTeamLocationDetailsForUser(params: {
  teamId: number;
  locationId: number;
  requestUserId: number | null;
}): Promise<ServiceResult<{ location: LocationDto }>> {
  const auth = await authorizeTeamAccess({
    teamId: params.teamId,
    requestUserId: params.requestUserId,
  });
  if (!auth.ok) {
    return { ok: false, error: authServiceError(auth) };
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
      error: makeServiceError(403, ERROR_CODES.FORBIDDEN, "Location does not belong to this team"),
    };
  }

  return { ok: true, data: { location: toLocationDto(location) } };
}

export async function createTeamLocation(params: {
  teamId: number;
  requestUserId: number | null;
  payload: unknown;
}): Promise<ServiceResult<{ location: LocationDto }>> {
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
    return { ok: true, data: { location: toLocationDto(location) } };
  } catch (error: unknown) {
    if (isUniqueConstraintError(error)) {
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

export interface UpdateTeamLocationInput {
  teamId: number;
  locationId: number;
  requestUserId: number | null;
  payload: unknown;
}

export async function updateTeamLocation(
  params: UpdateTeamLocationInput
): Promise<ServiceResult<{ location: LocationDto }>> {
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
    return { ok: true, data: { location: toLocationDto(location) } };
  } catch (error: unknown) {
    if (isUniqueConstraintError(error)) {
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

export interface DeleteTeamLocationInput {
  teamId: number;
  locationId: number;
  requestUserId: number | null;
}

export async function deleteTeamLocation(
  params: DeleteTeamLocationInput
): Promise<ServiceResult<null>> {
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
