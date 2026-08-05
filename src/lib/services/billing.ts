/**
 * Billing public facade.
 * Implementation lives under `src/lib/services/billing/*` (SRP split for agent reads).
 * Import from `@/lib/services/billing` in routes and tests.
 */

export {
  activateTeamManualBilling,
  grantTeamManualTrial,
} from "@/lib/services/billing/manual-billing";

export {
  buildTeamSubscriptionCheckoutSessionParams,
  createTeamStripeCheckoutSession,
  createTeamStripePortalSession,
} from "@/lib/services/billing/stripe-checkout";

export { syncTeamStripeSubscriptionFromProvider } from "@/lib/services/billing/stripe-subscription-sync";

export { processStripeWebhook } from "@/lib/services/billing/stripe-webhook";
