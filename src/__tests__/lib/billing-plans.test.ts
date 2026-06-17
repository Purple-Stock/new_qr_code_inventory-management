import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BILLING_PLAN_KEYS,
  inferManualBillingPlanKey,
  resolveTeamBillingPlan,
} from "@/lib/billing-plans";

describe("billing-plans", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("infers promo plan key for 90-day manual activations", () => {
    expect(inferManualBillingPlanKey(90)).toBe(BILLING_PLAN_KEYS.PROMO_90D_120);
    expect(inferManualBillingPlanKey(30)).toBeNull();
  });

  it("resolves default monthly stripe price", () => {
    vi.stubEnv("STRIPE_PRICE_ID", "price_default");
    vi.stubEnv("STRIPE_PRICE_ID_LEGACY", "price_legacy");

    const result = resolveTeamBillingPlan({
      stripeSubscriptionId: "sub_123",
      stripeSubscriptionStatus: "active",
      stripePriceId: "price_default",
      stripeCurrentPeriodEnd: "2099-01-01T00:00:00.000Z",
      manualTrialEndsAt: null,
      billingPlanKey: null,
    });

    expect(result).toEqual({
      billingPlanKey: BILLING_PLAN_KEYS.DEFAULT_MONTHLY,
      billingPlanLabel: "Pro · R$59/mês",
    });
  });

  it("resolves known production legacy stripe price without env", () => {
    const result = resolveTeamBillingPlan({
      stripeSubscriptionId: "sub_123",
      stripeSubscriptionStatus: "active",
      stripePriceId: "price_1SyJofDcRjtxvsqlJ5HhzT0J",
      stripeCurrentPeriodEnd: "2099-01-01T00:00:00.000Z",
      manualTrialEndsAt: null,
      billingPlanKey: null,
    });

    expect(result).toEqual({
      billingPlanKey: BILLING_PLAN_KEYS.LEGACY_MONTHLY,
      billingPlanLabel: "Legado · R$29/mês",
    });
  });

  it("resolves legacy monthly stripe price", () => {
    vi.stubEnv("STRIPE_PRICE_ID", "price_default");
    vi.stubEnv("STRIPE_PRICE_ID_LEGACY", "price_legacy");

    const result = resolveTeamBillingPlan({
      stripeSubscriptionId: "sub_123",
      stripeSubscriptionStatus: "active",
      stripePriceId: "price_legacy",
      stripeCurrentPeriodEnd: "2099-01-01T00:00:00.000Z",
      manualTrialEndsAt: null,
      billingPlanKey: null,
    });

    expect(result).toEqual({
      billingPlanKey: BILLING_PLAN_KEYS.LEGACY_MONTHLY,
      billingPlanLabel: "Legado · R$29/mês",
    });
  });

  it("resolves stored manual promo plan key", () => {
    const result = resolveTeamBillingPlan({
      billingPlanKey: BILLING_PLAN_KEYS.PROMO_90D_120,
      stripeSubscriptionId: null,
      stripeSubscriptionStatus: "active",
      stripePriceId: null,
      stripeCurrentPeriodEnd: "2099-01-01T00:00:00.000Z",
      manualTrialEndsAt: null,
    });

    expect(result).toEqual({
      billingPlanKey: BILLING_PLAN_KEYS.PROMO_90D_120,
      billingPlanLabel: "Promo 90 dias · R$120",
    });
  });

  it("falls back to manual activation when plan key is missing", () => {
    const result = resolveTeamBillingPlan({
      billingPlanKey: null,
      stripeSubscriptionId: null,
      stripeSubscriptionStatus: "active",
      stripePriceId: null,
      stripeCurrentPeriodEnd: "2099-01-01T00:00:00.000Z",
      manualTrialEndsAt: null,
    });

    expect(result).toEqual({
      billingPlanKey: null,
      billingPlanLabel: "Ativação manual",
    });
  });
});
