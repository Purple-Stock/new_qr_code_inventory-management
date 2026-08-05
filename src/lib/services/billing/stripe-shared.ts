import type Stripe from "stripe";
import {
  updateTeamStripeCustomerId,
  updateTeamStripeSubscription,
} from "@/lib/db/teams";
import { getStripeClient } from "@/lib/stripe";

export const BILLING_DAY_IN_MS = 24 * 60 * 60 * 1000;

export function getBillingAppBaseUrl(origin: string | null): string {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || origin || "http://localhost:3000";
}

export function getStripeCustomerId(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null
): string | null {
  if (!customer) return null;
  return typeof customer === "string" ? customer : customer.id;
}

export function getStripeSubscriptionId(
  subscription: string | Stripe.Subscription | null
): string | null {
  if (!subscription) return null;
  return typeof subscription === "string" ? subscription : subscription.id;
}

export function resolveTeamIdFromStripeMetadata(params: {
  teamIdFromMetadata: string | undefined;
  fallbackTeamId: number | null;
}): number | null {
  const teamId = Number.parseInt(params.teamIdFromMetadata || "", 10);
  if (!Number.isNaN(teamId)) {
    return teamId;
  }
  return params.fallbackTeamId;
}

export function getPriceIdFromStripeSubscription(
  subscription: Stripe.Subscription
): string | null {
  return subscription.items.data[0]?.price?.id ?? null;
}

/**
 * Map Stripe subscription → app status.
 * WHY "canceling": Stripe may keep status `active`/`trialing` while cancel_at is set;
 * the UI needs an immediate canceling signal.
 */
export function getEffectiveStripeSubscriptionStatus(
  subscription: Stripe.Subscription
): string {
  if (subscription.cancel_at && ["active", "trialing"].includes(subscription.status)) {
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

export function getCurrentPeriodEndFromStripeSubscription(
  subscription: Stripe.Subscription
): Date | null {
  const periodEnd = subscription.items.data[0]?.current_period_end;
  if (!periodEnd) {
    return null;
  }
  return new Date(periodEnd * 1000);
}

export async function persistStripeSubscriptionOnTeam(params: {
  teamId: number;
  subscription: Stripe.Subscription;
}): Promise<void> {
  await updateTeamStripeSubscription(params.teamId, {
    stripeSubscriptionId: params.subscription.id,
    stripeSubscriptionStatus: getEffectiveStripeSubscriptionStatus(params.subscription),
    stripePriceId: getPriceIdFromStripeSubscription(params.subscription),
    stripeCurrentPeriodEnd: getCurrentPeriodEndFromStripeSubscription(params.subscription),
  });
}

export async function ensureStripeCustomerForTeam(params: {
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

export function toBillingDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
}
