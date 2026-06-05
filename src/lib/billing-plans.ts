import { getLegacyStripePriceId, getStripePriceId } from "@/lib/stripe";

export const BILLING_PLAN_KEYS = {
  DEFAULT_MONTHLY: "default_monthly",
  LEGACY_MONTHLY: "legacy_monthly",
  PROMO_90D_120: "promo_90d_120",
} as const;

export type BillingPlanKey = (typeof BILLING_PLAN_KEYS)[keyof typeof BILLING_PLAN_KEYS];

const BILLING_PLAN_LABELS: Record<BillingPlanKey, string> = {
  [BILLING_PLAN_KEYS.DEFAULT_MONTHLY]: "Pro · R$59/mês",
  [BILLING_PLAN_KEYS.LEGACY_MONTHLY]: "Legado · R$29/mês",
  [BILLING_PLAN_KEYS.PROMO_90D_120]: "Promo 90 dias · R$120",
};

const ACTIVE_MANUAL_BILLING_STATUSES = new Set(["active", "canceling"]);

const KNOWN_DEFAULT_STRIPE_PRICE_IDS = new Set([
  "price_1SXYU5DC4HRJQJcde3AGqsiN",
]);

const KNOWN_LEGACY_STRIPE_PRICE_IDS = new Set([
  "price_1SyJofDcRjtxvsqlJ5HhzT0J",
]);

export type TeamBillingPlanSnapshot = {
  billingPlanKey?: string | null;
  stripeSubscriptionId?: string | null;
  stripeSubscriptionStatus?: string | null;
  stripePriceId?: string | null;
  stripeCurrentPeriodEnd?: Date | string | null;
  manualTrialEndsAt?: Date | string | null;
};

function isFutureDate(value: Date | string | null | undefined): boolean {
  if (!value) return false;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) && parsed.getTime() > Date.now();
}

function hasActiveManualTrial(team: TeamBillingPlanSnapshot): boolean {
  return isFutureDate(team.manualTrialEndsAt ?? null);
}

function hasActiveManualBilling(team: TeamBillingPlanSnapshot): boolean {
  if (team.stripeSubscriptionId) return false;
  if (!ACTIVE_MANUAL_BILLING_STATUSES.has(team.stripeSubscriptionStatus ?? "")) {
    return false;
  }
  return isFutureDate(team.stripeCurrentPeriodEnd ?? null);
}

function resolveStripePricePlanKey(stripePriceId: string): BillingPlanKey | null {
  const defaultPriceId = getStripePriceId();
  if (defaultPriceId && stripePriceId === defaultPriceId) {
    return BILLING_PLAN_KEYS.DEFAULT_MONTHLY;
  }

  const legacyPriceId = getLegacyStripePriceId();
  if (legacyPriceId && stripePriceId === legacyPriceId) {
    return BILLING_PLAN_KEYS.LEGACY_MONTHLY;
  }

  if (KNOWN_DEFAULT_STRIPE_PRICE_IDS.has(stripePriceId)) {
    return BILLING_PLAN_KEYS.DEFAULT_MONTHLY;
  }

  if (KNOWN_LEGACY_STRIPE_PRICE_IDS.has(stripePriceId)) {
    return BILLING_PLAN_KEYS.LEGACY_MONTHLY;
  }

  return null;
}

export function isKnownBillingPlanKey(value: string | null | undefined): value is BillingPlanKey {
  if (!value) return false;
  return Object.values(BILLING_PLAN_KEYS).includes(value as BillingPlanKey);
}

export function getBillingPlanLabel(planKey: string | null | undefined): string | null {
  if (!planKey || !isKnownBillingPlanKey(planKey)) {
    return null;
  }
  return BILLING_PLAN_LABELS[planKey];
}

export function inferManualBillingPlanKey(durationDays: number): BillingPlanKey | null {
  if (durationDays === 90) {
    return BILLING_PLAN_KEYS.PROMO_90D_120;
  }
  return null;
}

export function resolveTeamBillingPlan(team: TeamBillingPlanSnapshot): {
  billingPlanKey: string | null;
  billingPlanLabel: string;
} {
  if (team.stripeSubscriptionId && team.stripePriceId) {
    const stripePlanKey = resolveStripePricePlanKey(team.stripePriceId);
    if (stripePlanKey) {
      return {
        billingPlanKey: stripePlanKey,
        billingPlanLabel: BILLING_PLAN_LABELS[stripePlanKey],
      };
    }

    return {
      billingPlanKey: null,
      billingPlanLabel: "Stripe · outro preço",
    };
  }

  if (team.billingPlanKey && isKnownBillingPlanKey(team.billingPlanKey)) {
    return {
      billingPlanKey: team.billingPlanKey,
      billingPlanLabel: BILLING_PLAN_LABELS[team.billingPlanKey],
    };
  }

  if (hasActiveManualBilling(team)) {
    return {
      billingPlanKey: team.billingPlanKey ?? null,
      billingPlanLabel: "Ativação manual",
    };
  }

  if (hasActiveManualTrial(team)) {
    return {
      billingPlanKey: null,
      billingPlanLabel: "Trial manual",
    };
  }

  return {
    billingPlanKey: null,
    billingPlanLabel: "Sem plano",
  };
}
