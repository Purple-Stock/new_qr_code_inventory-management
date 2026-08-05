import { updateTeamStripeSubscription } from "@/lib/db/teams";
import { ERROR_CODES } from "@/lib/errors";
import { authorizeTeamPermission } from "@/lib/permissions";
import type { ServiceResult } from "@/lib/services/types";
import {
  authServiceError,
  internalServiceError,
  makeServiceError,
} from "@/lib/services/errors";
import {
  getEffectiveStripeSubscriptionStatus,
  persistStripeSubscriptionOnTeam,
} from "@/lib/services/billing/stripe-shared";
import { getStripeClient, isStripeConfigured } from "@/lib/stripe";

const PRIORITY_SUBSCRIPTION_STATUSES = new Set(["active", "trialing", "past_due"]);

export async function syncTeamStripeSubscriptionFromProvider(params: {
  teamId: number;
  requestUserId: number | null;
}): Promise<ServiceResult<{ synced: boolean; subscriptionStatus: string | null }>> {
  if (!isStripeConfigured()) {
    return {
      ok: false,
      error: makeServiceError(
        500,
        ERROR_CODES.BILLING_NOT_CONFIGURED,
        "Stripe is not configured"
      ),
    };
  }

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
  if (!team.stripeCustomerId) {
    return { ok: true, data: { synced: false, subscriptionStatus: null } };
  }

  try {
    const stripe = getStripeClient();
    const subscriptions = await stripe.subscriptions.list({
      customer: team.stripeCustomerId,
      status: "all",
      limit: 10,
    });

    const prioritized =
      subscriptions.data.find((subscription) =>
        PRIORITY_SUBSCRIPTION_STATUSES.has(subscription.status)
      ) ?? subscriptions.data[0];

    if (!prioritized) {
      await updateTeamStripeSubscription(team.id, {
        stripeSubscriptionId: null,
        stripeSubscriptionStatus: null,
        stripePriceId: null,
        stripeCurrentPeriodEnd: null,
      });
      return { ok: true, data: { synced: true, subscriptionStatus: null } };
    }

    await persistStripeSubscriptionOnTeam({
      teamId: team.id,
      subscription: prioritized,
    });

    return {
      ok: true,
      data: {
        synced: true,
        subscriptionStatus: getEffectiveStripeSubscriptionStatus(prioritized),
      },
    };
  } catch (error) {
    console.error("Error syncing Stripe subscription from provider:", error);
    return {
      ok: false,
      error: makeServiceError(
        502,
        ERROR_CODES.BILLING_PROVIDER_ERROR,
        "Failed to sync Stripe subscription"
      ),
    };
  }
}
