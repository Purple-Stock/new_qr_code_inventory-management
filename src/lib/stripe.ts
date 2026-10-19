import Stripe from "stripe";

let stripeClient: Stripe | null = null;

/**
 * Signup trial length granted on the first team of a company (`manualTrialEndsAt`).
 * Checkout no longer adds `trial_period_days` so converting does not stack 7 days.
 * Marketing LP uses the same 7-day copy (`new_lp` TEAM_PLAN_TRIAL_DAYS).
 */
export const TEAM_SIGNUP_TRIAL_DAYS = 7;
export const STRIPE_CHECKOUT_TRIAL_DAYS = TEAM_SIGNUP_TRIAL_DAYS;

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
