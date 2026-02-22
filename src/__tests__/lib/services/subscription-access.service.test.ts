import { vi } from "vitest";
import { hasActiveTeamSubscription } from "@/lib/services/subscription-access";

describe("subscription-access service", () => {
  it("returns true for active Stripe subscriptions", () => {
    expect(
      hasActiveTeamSubscription({
        stripeSubscriptionStatus: "active",
        manualTrialEndsAt: null,
      })
    ).toBe(true);
  });

  it("returns true for canceling Stripe subscriptions", () => {
    expect(
      hasActiveTeamSubscription({
        stripeSubscriptionStatus: "canceling",
        manualTrialEndsAt: null,
      })
    ).toBe(true);
  });

  it("returns true when manual trial end date is in the future", () => {
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    expect(
      hasActiveTeamSubscription({
        stripeSubscriptionStatus: null,
        manualTrialEndsAt: futureDate,
      })
    ).toBe(true);
  });

  it("returns false when manual trial end date is in the past", () => {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    expect(
      hasActiveTeamSubscription({
        stripeSubscriptionStatus: null,
        manualTrialEndsAt: pastDate,
      })
    ).toBe(false);
  });

  it("returns false when there is no active Stripe status and no trial", () => {
    expect(
      hasActiveTeamSubscription({
        stripeSubscriptionStatus: null,
        manualTrialEndsAt: null,
      })
    ).toBe(false);
  });
});
