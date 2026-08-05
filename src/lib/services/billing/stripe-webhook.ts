import type Stripe from "stripe";
import {
  getTeamByStripeCustomerId,
  getTeamWithStats,
  updateTeamStripeCustomerId,
  updateTeamStripeSubscription,
} from "@/lib/db/teams";
import { ERROR_CODES } from "@/lib/errors";
import type { ServiceResult } from "@/lib/services/types";
import {
  internalServiceError,
  makeServiceError,
  validationServiceError,
} from "@/lib/services/errors";
import {
  getCurrentPeriodEndFromStripeSubscription,
  getPriceIdFromStripeSubscription,
  getStripeCustomerId,
  getStripeSubscriptionId,
  persistStripeSubscriptionOnTeam,
  resolveTeamIdFromStripeMetadata,
} from "@/lib/services/billing/stripe-shared";
import { getStripeClient, getStripeWebhookSecret } from "@/lib/stripe";

async function handleCheckoutSessionCompleted(
  checkoutSession: Stripe.Checkout.Session
): Promise<void> {
  const stripe = getStripeClient();
  const customerId = getStripeCustomerId(checkoutSession.customer);
  const subscriptionId = getStripeSubscriptionId(checkoutSession.subscription);
  if (!customerId || !subscriptionId) {
    return;
  }

  const fallbackTeam = await getTeamByStripeCustomerId(customerId);
  const teamId = resolveTeamIdFromStripeMetadata({
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
  await persistStripeSubscriptionOnTeam({
    teamId: team.id,
    subscription,
  });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  const customerId = getStripeCustomerId(subscription.customer);
  if (!customerId) {
    return;
  }

  const team = await getTeamByStripeCustomerId(customerId);
  if (!team) {
    return;
  }

  await persistStripeSubscriptionOnTeam({
    teamId: team.id,
    subscription,
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const customerId = getStripeCustomerId(subscription.customer);
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
    stripePriceId: getPriceIdFromStripeSubscription(subscription),
    stripeCurrentPeriodEnd: getCurrentPeriodEndFromStripeSubscription(subscription),
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
