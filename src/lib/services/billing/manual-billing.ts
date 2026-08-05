import { findUserById } from "@/lib/db/users";
import { isSuperAdminUser } from "@/lib/db/super-admin";
import { ERROR_CODES } from "@/lib/errors";
import {
  activateTeamManualBilling as persistTeamManualBilling,
  grantTeamManualTrial as persistTeamManualTrial,
  getTeamWithStats,
} from "@/lib/db/teams";
import {
  parseTeamManualActivationPayload,
  parseTeamManualTrialPayload,
} from "@/lib/contracts/schemas";
import { authorizeTeamPermission } from "@/lib/permissions";
import type { ServiceResult } from "@/lib/services/types";
import {
  authServiceError,
  conflictValidationServiceError,
  internalServiceError,
  makeServiceError,
  validationServiceError,
} from "@/lib/services/errors";
import { BILLING_DAY_IN_MS, toBillingDate } from "@/lib/services/billing/stripe-shared";

const MANUAL_TRIAL_DEFAULT_DAYS = 14;
const MANUAL_TRIAL_MAX_GRANTS = 3;
const MANUAL_TRIAL_COOLDOWN_DAYS = 90;

function isEmailInSuperAdminAllowlist(email: string): boolean {
  const raw = process.env.SUPER_ADMIN_EMAILS?.trim();
  if (!raw) return false;
  const allowlist = new Set(
    raw
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter((entry) => entry.length > 0)
  );
  return allowlist.has(email.trim().toLowerCase());
}

async function hasSuperAdminBillingAccess(requestUserId: number | null): Promise<boolean> {
  if (!requestUserId) {
    return false;
  }

  const requestUser = await findUserById(requestUserId);
  if (!requestUser) {
    return false;
  }

  return (
    requestUser.role === "super_admin" ||
    (await isSuperAdminUser(requestUser.id)) ||
    isEmailInSuperAdminAllowlist(requestUser.email)
  );
}

export async function activateTeamManualBilling(params: {
  teamId: number;
  requestUserId: number | null;
  payload: unknown;
}): Promise<ServiceResult<{ subscriptionStatus: string; currentPeriodEnd: string }>> {
  const hasAccess = await hasSuperAdminBillingAccess(params.requestUserId);
  if (!hasAccess) {
    return {
      ok: false,
      error: makeServiceError(
        403,
        ERROR_CODES.INSUFFICIENT_PERMISSIONS,
        "Super admin access required"
      ),
    };
  }

  const team = await getTeamWithStats(params.teamId);
  if (!team) {
    return {
      ok: false,
      error: makeServiceError(404, ERROR_CODES.TEAM_NOT_FOUND, "Team not found"),
    };
  }

  if (team.stripeCustomerId || team.stripeSubscriptionId) {
    return {
      ok: false,
      error: conflictValidationServiceError(
        "Team still has managed Stripe billing. Cancel or migrate the Stripe subscription before manual activation."
      ),
    };
  }

  const parsed = parseTeamManualActivationPayload(params.payload);
  if (!parsed.ok) {
    return { ok: false, error: validationServiceError(parsed.error) };
  }

  try {
    const currentPeriodEnd = new Date(
      Date.now() + parsed.data.durationDays * BILLING_DAY_IN_MS
    );
    const updatedTeam = await persistTeamManualBilling(params.teamId, {
      stripeSubscriptionStatus: "active",
      stripeCurrentPeriodEnd: currentPeriodEnd,
    });

    const persistedPeriodEnd = toBillingDate(updatedTeam.stripeCurrentPeriodEnd);
    if (!persistedPeriodEnd) {
      return {
        ok: false,
        error: internalServiceError("Failed to persist manual billing period"),
      };
    }

    console.info("[AUDIT] manual_billing_activation", {
      teamId: params.teamId,
      requestUserId: params.requestUserId,
      durationDays: parsed.data.durationDays,
      reason: parsed.data.reason,
      currentPeriodEnd: persistedPeriodEnd.toISOString(),
      at: new Date().toISOString(),
    });

    return {
      ok: true,
      data: {
        subscriptionStatus: updatedTeam.stripeSubscriptionStatus ?? "active",
        currentPeriodEnd: persistedPeriodEnd.toISOString(),
      },
    };
  } catch (error) {
    console.error("Error activating manual team billing:", error);
    return {
      ok: false,
      error: internalServiceError("Failed to activate manual billing"),
    };
  }
}

export async function grantTeamManualTrial(params: {
  teamId: number;
  requestUserId: number | null;
  payload: unknown;
}): Promise<ServiceResult<{ manualTrialEndsAt: string; manualTrialGrantsCount: number }>> {
  const auth = await authorizeTeamPermission({
    permission: "team:update",
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
      error: internalServiceError("An error occurred while resolving team billing context"),
    };
  }

  const parsed = parseTeamManualTrialPayload(params.payload);
  if (!parsed.ok) {
    return { ok: false, error: validationServiceError(parsed.error) };
  }

  const now = new Date();
  const lastGrantedAt = toBillingDate(team.manualTrialLastGrantedAt);
  const manualTrialGrantsCount = team.manualTrialGrantsCount ?? 0;

  if (manualTrialGrantsCount >= MANUAL_TRIAL_MAX_GRANTS) {
    return {
      ok: false,
      error: makeServiceError(
        409,
        ERROR_CODES.VALIDATION_ERROR,
        "Manual trial grant limit reached for this team"
      ),
    };
  }

  if (lastGrantedAt) {
    const nextAllowedAt = new Date(
      lastGrantedAt.getTime() + MANUAL_TRIAL_COOLDOWN_DAYS * BILLING_DAY_IN_MS
    );
    if (now < nextAllowedAt) {
      return {
        ok: false,
        error: makeServiceError(
          409,
          ERROR_CODES.VALIDATION_ERROR,
          "Manual trial cooldown is still active for this team"
        ),
      };
    }
  }

  try {
    const durationDays = parsed.data.durationDays || MANUAL_TRIAL_DEFAULT_DAYS;
    const manualTrialEndsAt = new Date(now.getTime() + durationDays * BILLING_DAY_IN_MS);

    const updatedTeam = await persistTeamManualTrial(team.id, {
      manualTrialEndsAt,
      manualTrialGrantsCount: manualTrialGrantsCount + 1,
      manualTrialLastGrantedAt: now,
    });

    const persistedEndsAt = toBillingDate(updatedTeam.manualTrialEndsAt);
    if (!persistedEndsAt) {
      return {
        ok: false,
        error: internalServiceError("Failed to persist manual trial end date"),
      };
    }

    return {
      ok: true,
      data: {
        manualTrialEndsAt: persistedEndsAt.toISOString(),
        manualTrialGrantsCount: updatedTeam.manualTrialGrantsCount,
      },
    };
  } catch (error) {
    console.error("Error granting team manual trial:", error);
    return {
      ok: false,
      error: internalServiceError("Failed to grant manual trial"),
    };
  }
}
