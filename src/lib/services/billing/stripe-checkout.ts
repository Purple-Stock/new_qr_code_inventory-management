import type Stripe from "stripe";
import { ERROR_CODES } from "@/lib/errors";
import { authorizeTeamPermission } from "@/lib/permissions";
import type { ServiceResult } from "@/lib/services/types";
import {
  authServiceError,
  internalServiceError,
  makeServiceError,
} from "@/lib/services/errors";
import {
  ensureStripeCustomerForTeam,
  getBillingAppBaseUrl,
} from "@/lib/services/billing/stripe-shared";
import {
  getStripeClient,
  getStripePriceId,
  isStripeConfigured,
  STRIPE_CHECKOUT_TRIAL_DAYS,
} from "@/lib/stripe";

/**
 * Hosted Checkout params for a team subscription with free trial + card on file.
 * WHY payment_method_collection always: trial total is R$0; without this Stripe may
 * skip collecting a card and first charge after trial fails.
 */
export function buildTeamSubscriptionCheckoutSessionParams(params: {
  customerId: string;
  stripePriceId: string;
  teamId: number;
  baseUrl: string;
}): Stripe.Checkout.SessionCreateParams {
  return {
    mode: "subscription",
    customer: params.customerId,
    line_items: [
      {
        price: params.stripePriceId,
        quantity: 1,
      },
    ],
    payment_method_collection: "always",
    success_url: `${params.baseUrl}/teams/${params.teamId}/settings?billing=success`,
    cancel_url: `${params.baseUrl}/teams/${params.teamId}/settings?billing=cancel`,
    metadata: {
      teamId: String(params.teamId),
    },
    subscription_data: {
      trial_period_days: STRIPE_CHECKOUT_TRIAL_DAYS,
      metadata: {
        teamId: String(params.teamId),
      },
    },
  };
}

export async function createTeamStripeCheckoutSession(params: {
  teamId: number;
  requestUserId: number | null;
  origin: string | null;
}): Promise<ServiceResult<{ url: string }>> {
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
  const requestUserEmail = auth.user?.email;
  if (!requestUserEmail) {
    return {
      ok: false,
      error: internalServiceError("Authenticated user email is missing"),
    };
  }
  const stripePriceId = getStripePriceId();
  if (!stripePriceId) {
    return {
      ok: false,
      error: makeServiceError(
        500,
        ERROR_CODES.BILLING_NOT_CONFIGURED,
        "Missing STRIPE_PRICE_ID"
      ),
    };
  }

  try {
    const stripe = getStripeClient();
    const customerId = await ensureStripeCustomerForTeam({
      teamId: team.id,
      teamName: team.name,
      existingStripeCustomerId: team.stripeCustomerId,
      fallbackEmail: requestUserEmail,
    });

    const session = await stripe.checkout.sessions.create(
      buildTeamSubscriptionCheckoutSessionParams({
        customerId,
        stripePriceId,
        teamId: team.id,
        baseUrl: getBillingAppBaseUrl(params.origin),
      })
    );

    if (!session.url) {
      return {
        ok: false,
        error: makeServiceError(
          502,
          ERROR_CODES.BILLING_PROVIDER_ERROR,
          "Stripe did not return a checkout URL"
        ),
      };
    }

    return { ok: true, data: { url: session.url } };
  } catch (error) {
    console.error("Error creating Stripe checkout session:", error);
    return {
      ok: false,
      error: makeServiceError(
        502,
        ERROR_CODES.BILLING_PROVIDER_ERROR,
        "Failed to create Stripe checkout session"
      ),
    };
  }
}

export async function createTeamStripePortalSession(params: {
  teamId: number;
  requestUserId: number | null;
  origin: string | null;
}): Promise<ServiceResult<{ url: string }>> {
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
    return {
      ok: false,
      error: makeServiceError(
        404,
        ERROR_CODES.BILLING_CUSTOMER_NOT_FOUND,
        "Team does not have a Stripe customer yet"
      ),
    };
  }

  try {
    const stripe = getStripeClient();
    const baseUrl = getBillingAppBaseUrl(params.origin);
    const session = await stripe.billingPortal.sessions.create({
      customer: team.stripeCustomerId,
      return_url: `${baseUrl}/teams/${team.id}/settings?billing=portal`,
    });

    return { ok: true, data: { url: session.url } };
  } catch (error) {
    console.error("Error creating Stripe billing portal session:", error);
    return {
      ok: false,
      error: makeServiceError(
        502,
        ERROR_CODES.BILLING_PROVIDER_ERROR,
        "Failed to create Stripe billing portal session"
      ),
    };
  }
}
