import { vi } from "vitest";
import { hasActiveTeamSubscription } from "@/lib/services/subscription-access";

describe("subscription-access service", () => {
  it("returns true for active Stripe subscriptions", () => {
    expect(
      hasActiveTeamSubscription({
        stripeSubscriptionId: "sub_123",
        stripeSubscriptionStatus: "active",
        stripeCurrentPeriodEnd: null,
        manualTrialEndsAt: null,
      })
    ).toBe(true);
  });

  it("returns true for canceling Stripe subscriptions", () => {
    expect(
      hasActiveTeamSubscription({
        stripeSubscriptionId: "sub_123",
        stripeSubscriptionStatus: "canceling",
        stripeCurrentPeriodEnd: null,
        manualTrialEndsAt: null,
      })
    ).toBe(true);
  });

  it("returns true for manual paid activation while billing period is still active", () => {
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    expect(
      hasActiveTeamSubscription({
        stripeSubscriptionId: null,
        stripeSubscriptionStatus: "active",
        stripeCurrentPeriodEnd: futureDate,
        manualTrialEndsAt: null,
      })
    ).toBe(true);
  });

  it("returns false for manual paid activation after billing period ends", () => {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    expect(
      hasActiveTeamSubscription({
        stripeSubscriptionId: null,
        stripeSubscriptionStatus: "active",
        stripeCurrentPeriodEnd: pastDate,
        manualTrialEndsAt: null,
      })
    ).toBe(false);
  });

  it("returns true when manual trial end date is in the future", () => {
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    expect(
      hasActiveTeamSubscription({
        stripeSubscriptionId: null,
        stripeSubscriptionStatus: null,
        stripeCurrentPeriodEnd: null,
        manualTrialEndsAt: futureDate,
      })
    ).toBe(true);
  });

  it("returns false when manual trial end date is in the past", () => {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    expect(
      hasActiveTeamSubscription({
        stripeSubscriptionId: null,
        stripeSubscriptionStatus: null,
        stripeCurrentPeriodEnd: null,
        manualTrialEndsAt: pastDate,
      })
    ).toBe(false);
  });

  it("returns false when there is no active Stripe status and no trial", () => {
    expect(
      hasActiveTeamSubscription({
        stripeSubscriptionId: null,
        stripeSubscriptionStatus: null,
        stripeCurrentPeriodEnd: null,
        manualTrialEndsAt: null,
      })
    ).toBe(false);
  });
});
