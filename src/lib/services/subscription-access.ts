export interface TeamBillingSnapshot {
  stripeSubscriptionId?: string | null;
  stripeSubscriptionStatus?: string | null;
  stripeCurrentPeriodEnd?: Date | string | null;
  manualTrialEndsAt?: Date | string | null;
}

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing", "canceling"]);

export function hasActiveTeamSubscription(team: TeamBillingSnapshot): boolean {
  if (ACTIVE_SUBSCRIPTION_STATUSES.has(team.stripeSubscriptionStatus ?? "")) {
    // Preserve the previous behavior for legacy callers/tests that only know the
    // subscription status and do not provide Stripe identifiers or billing end dates.
    if (
      team.stripeSubscriptionId === undefined &&
      team.stripeCurrentPeriodEnd === undefined
    ) {
      return true;
    }

    if (team.stripeSubscriptionId) {
      return true;
    }

    if (team.stripeCurrentPeriodEnd) {
      const manualBillingPeriodEnd = new Date(team.stripeCurrentPeriodEnd);
      if (
        Number.isFinite(manualBillingPeriodEnd.getTime()) &&
        manualBillingPeriodEnd.getTime() > Date.now()
      ) {
        return true;
      }
    }
  }

  if (!team.manualTrialEndsAt) {
    return false;
  }

  const manualTrialEndsAt = new Date(team.manualTrialEndsAt);
  return Number.isFinite(manualTrialEndsAt.getTime()) && manualTrialEndsAt.getTime() > Date.now();
}
