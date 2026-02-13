export interface TeamBillingSnapshot {
  stripeSubscriptionStatus?: string | null;
  manualTrialEndsAt?: Date | string | null;
}

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing", "canceling"]);

export function hasActiveTeamSubscription(team: TeamBillingSnapshot): boolean {
  if (ACTIVE_SUBSCRIPTION_STATUSES.has(team.stripeSubscriptionStatus ?? "")) {
    return true;
  }

  if (!team.manualTrialEndsAt) {
    return false;
  }

  const manualTrialEndsAt = new Date(team.manualTrialEndsAt);
  return Number.isFinite(manualTrialEndsAt.getTime()) && manualTrialEndsAt.getTime() > Date.now();
}
