import { getTeamReportStats } from "@/lib/db/reports";
import type { ReportStats } from "@/lib/db/reports";
import { authorizeTeamAccess } from "@/lib/permissions";
import type { ServiceResult } from "@/lib/services/types";
import { authServiceError, internalServiceError } from "@/lib/services/errors";

export async function getTeamReportStatsForUser(params: {
  teamId: number;
  requestUserId: number | null;
  startDate?: Date;
  endDate?: Date;
}): Promise<ServiceResult<{ stats: ReportStats }>> {
  const auth = await authorizeTeamAccess({
    teamId: params.teamId,
    requestUserId: params.requestUserId,
  });
  if (!auth.ok) {
    return { ok: false, error: authServiceError(auth) };
  }

  try {
    const stats = await getTeamReportStats(params.teamId, params.startDate, params.endDate);
    return { ok: true, data: { stats } };
  } catch {
    return {
      ok: false,
      error: internalServiceError("An error occurred while fetching report statistics"),
    };
  }
}
