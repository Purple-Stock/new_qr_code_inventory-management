import type Stripe from "stripe";
import { ERROR_CODES } from "@/lib/errors";
import {
  getTeamByStripeCustomerId,
  getTeamWithStats,
  updateTeamStripeCustomerId,
  updateTeamStripeSubscription,
} from "@/lib/db/teams";
import { authorizeTeamPermission } from "@/lib/permissions";
import type { ServiceResult } from "@/lib/services/types";
import {
  authServiceError,
  internalServiceError,
  makeServiceError,
  validationServiceError,
} from "@/lib/services/errors";
import {
  getStripeClient,
  getStripePriceId,
  getStripeWebhookSecret,
  isStripeConfigured,
} from "@/lib/stripe";

function getAppBaseUrl(origin: string | null): string {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || origin || "http://localhost:3000";
}

function getCustomerId(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null
): string | null {
  if (!customer) return null;
  return typeof customer === "string" ? customer : customer.id;
}

function getSubscriptionId(
  subscription: string | Stripe.Subscription | null
): string | null {
  if (!subscription) return null;
  return typeof subscription === "string" ? subscription : subscription.id;
}

async function ensureStripeCustomerForTeam(params: {
  teamId: number;
  teamName: string;
  existingStripeCustomerId: string | null;
  fallbackEmail: string;
}): Promise<string> {
  if (params.existingStripeCustomerId) {
    return params.existingStripeCustomerId;
  }

  const stripe = getStripeClient();
  const createdCustomer = await stripe.customers.create({
    email: params.fallbackEmail,
    name: params.teamName,
    metadata: {
      teamId: String(params.teamId),
    },
  });

  await updateTeamStripeCustomerId(params.teamId, createdCustomer.id);
  return createdCustomer.id;
}

function resolveTeamIdFromEvent(params: {
  teamIdFromMetadata: string | undefined;
  fallbackTeamId: number | null;
}): number | null {
  const teamId = Number.parseInt(params.teamIdFromMetadata || "", 10);
  if (!Number.isNaN(teamId)) {
    return teamId;
  }
  return params.fallbackTeamId;
}

function getPriceIdFromSubscription(subscription: Stripe.Subscription): string | null {
  const item = subscription.items.data[0];
  return item?.price?.id ?? null;
}

function getEffectiveSubscriptionStatus(subscription: Stripe.Subscription): string {
  // Stripe can keep status as "active" while cancellation is scheduled/requested.
  // We persist this as "canceling" to make cancellation visible immediately in the app.
  if (
    subscription.cancel_at &&
    ["active", "trialing"].includes(subscription.status)
  ) {
    return "canceling";
  }
  if (subscription.cancel_at_period_end && subscription.status === "active") {
    return "canceling";
  }
  if (subscription.cancel_at_period_end && subscription.status === "trialing") {
    return "canceling";
  }
  if (
    subscription.cancellation_details?.reason === "cancellation_requested" &&
    ["active", "trialing"].includes(subscription.status)
  ) {
    return "canceling";
  }
  return subscription.status;
}

function getCurrentPeriodEndFromSubscription(subscription: Stripe.Subscription): Date | null {
  const item = subscription.items.data[0];
  if (!item?.current_period_end) {
    return null;
  }
  return new Date(item.current_period_end * 1000);
}

async function syncSubscriptionInTeam(params: {
  teamId: number;
  subscription: Stripe.Subscription;
}) {
  await updateTeamStripeSubscription(params.teamId, {
    stripeSubscriptionId: params.subscription.id,
    stripeSubscriptionStatus: getEffectiveSubscriptionStatus(params.subscription),
    stripePriceId: getPriceIdFromSubscription(params.subscription),
    stripeCurrentPeriodEnd: getCurrentPeriodEndFromSubscription(params.subscription),
  });
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

    const baseUrl = getAppBaseUrl(params.origin);
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/teams/${team.id}/settings?billing=success`,
      cancel_url: `${baseUrl}/teams/${team.id}/settings?billing=cancel`,
      metadata: {
        teamId: String(team.id),
      },
      subscription_data: {
        metadata: {
          teamId: String(team.id),
        },
      },
    });

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
    const baseUrl = getAppBaseUrl(params.origin);
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
        ["active", "trialing", "past_due"].includes(subscription.status)
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

    await syncSubscriptionInTeam({
      teamId: team.id,
      subscription: prioritized,
    });

    return {
      ok: true,
      data: {
        synced: true,
        subscriptionStatus: getEffectiveSubscriptionStatus(prioritized),
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

async function handleCheckoutSessionCompleted(
  checkoutSession: Stripe.Checkout.Session
): Promise<void> {
  const stripe = getStripeClient();
  const customerId = getCustomerId(checkoutSession.customer);
  const subscriptionId = getSubscriptionId(checkoutSession.subscription);
  if (!customerId || !subscriptionId) {
    return;
  }

  const fallbackTeam = await getTeamByStripeCustomerId(customerId);
  const teamId = resolveTeamIdFromEvent({
    teamIdFromMetadata: checkoutSession.metadata?.teamId,
    fallbackTeamId: fallbackTeam?.id ?? null,
  });
  if (!teamId) {
    return;
  }

  const team = await getTeamWithStats(teamId);
  if (!team) {
    return;
  }

  if (!team.stripeCustomerId) {
    await updateTeamStripeCustomerId(team.id, customerId);
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await syncSubscriptionInTeam({
    teamId: team.id,
    subscription,
  });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  const customerId = getCustomerId(subscription.customer);
  if (!customerId) {
    return;
  }

  const team = await getTeamByStripeCustomerId(customerId);
  if (!team) {
    return;
  }

  await syncSubscriptionInTeam({
    teamId: team.id,
    subscription,
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const customerId = getCustomerId(subscription.customer);
  if (!customerId) {
    return;
  }

  const team = await getTeamByStripeCustomerId(customerId);
  if (!team) {
    return;
  }

  await updateTeamStripeSubscription(team.id, {
    stripeSubscriptionId: subscription.id,
    stripeSubscriptionStatus: subscription.status,
    stripePriceId: getPriceIdFromSubscription(subscription),
    stripeCurrentPeriodEnd: getCurrentPeriodEndFromSubscription(subscription),
  });
}

export async function processStripeWebhook(params: {
  signature: string | null;
  rawBody: string;
}): Promise<ServiceResult<{ received: boolean }>> {
  const webhookSecret = getStripeWebhookSecret();
  if (!webhookSecret) {
    return {
      ok: false,
      error: makeServiceError(
        500,
        ERROR_CODES.BILLING_NOT_CONFIGURED,
        "Missing STRIPE_WEBHOOK_SECRET"
      ),
    };
  }

  if (!params.signature) {
    return {
      ok: false,
      error: validationServiceError("Missing Stripe-Signature header"),
    };
  }

  try {
    const stripe = getStripeClient();
    const event = stripe.webhooks.constructEvent(
      params.rawBody,
      params.signature,
      webhookSecret
    );

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      default:
        break;
    }

    return { ok: true, data: { received: true } };
  } catch (error) {
    console.error("Error processing Stripe webhook:", error);
    return {
      ok: false,
      error: internalServiceError("Failed to process Stripe webhook"),
    };
  }
}
