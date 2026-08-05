import Stripe from "stripe";

let stripeClient: Stripe | null = null;

/**
 * Free trial length for team Checkout subscriptions.
 * WHY not a separate Price/Product: trial is session-level (`trial_period_days`);
 * marketing LP uses the same 7-day copy (`new_lp` TEAM_PLAN_TRIAL_DAYS).
 */
export const STRIPE_CHECKOUT_TRIAL_DAYS = 7;

export function getStripeSecretKey(): string | null {
  return process.env.STRIPE_SECRET_KEY ?? null;
}

export function getStripePriceId(): string | null {
  return process.env.STRIPE_PRICE_ID ?? null;
}

export function getStripeWebhookSecret(): string | null {
  return process.env.STRIPE_WEBHOOK_SECRET ?? null;
}

export function isStripeConfigured(): boolean {
  return Boolean(getStripeSecretKey() && getStripePriceId());
}

export function getStripeClient(): Stripe {
  const secretKey = getStripeSecretKey();
  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey);
  }

  return stripeClient;
}
