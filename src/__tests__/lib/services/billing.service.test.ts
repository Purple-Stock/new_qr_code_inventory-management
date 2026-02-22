import { vi } from "vitest";
import type Stripe from "stripe";
import {
  createTeamStripeCheckoutSession,
  grantTeamManualTrial,
  processStripeWebhook,
  syncTeamStripeSubscriptionFromProvider,
} from "@/lib/services/billing";
import { ERROR_CODES } from "@/lib/errors";

vi.mock("@/lib/permissions", () => ({
  authorizeTeamPermission: vi.fn(),
}));

vi.mock("@/lib/db/teams", () => ({
  grantTeamManualTrial: vi.fn(),
  getTeamByStripeCustomerId: vi.fn(),
  getTeamWithStats: vi.fn(),
  updateTeamStripeCustomerId: vi.fn(),
  updateTeamStripeSubscription: vi.fn(),
}));

vi.mock("@/lib/stripe", () => ({
  getStripeClient: vi.fn(),
  getStripePriceId: vi.fn(),
  getStripeWebhookSecret: vi.fn(),
  isStripeConfigured: vi.fn(),
}));

import { authorizeTeamPermission } from "@/lib/permissions";
import {
  grantTeamManualTrial as persistTeamManualTrial,
  getTeamByStripeCustomerId,
  getTeamWithStats,
  updateTeamStripeCustomerId,
  updateTeamStripeSubscription,
} from "@/lib/db/teams";
import {
  getStripeClient,
  getStripePriceId,
  getStripeWebhookSecret,
  isStripeConfigured,
} from "@/lib/stripe";

const mockedAuthorizeTeamPermission = vi.mocked(authorizeTeamPermission);
const mockedPersistTeamManualTrial = vi.mocked(persistTeamManualTrial);
const mockedGetTeamByStripeCustomerId = vi.mocked(getTeamByStripeCustomerId);
const mockedGetTeamWithStats = vi.mocked(getTeamWithStats);
const mockedUpdateTeamStripeCustomerId = vi.mocked(updateTeamStripeCustomerId);
const mockedUpdateTeamStripeSubscription = vi.mocked(updateTeamStripeSubscription);
const mockedGetStripeClient = vi.mocked(getStripeClient);
const mockedGetStripePriceId = vi.mocked(getStripePriceId);
const mockedGetStripeWebhookSecret = vi.mocked(getStripeWebhookSecret);
const mockedIsStripeConfigured = vi.mocked(isStripeConfigured);

describe("billing service", () => {
  const stripeClientMock = {
    customers: { create: vi.fn() },
    checkout: { sessions: { create: vi.fn() } },
    billingPortal: { sessions: { create: vi.fn() } },
    webhooks: { constructEvent: vi.fn() },
    subscriptions: { retrieve: vi.fn(), list: vi.fn() },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockedIsStripeConfigured.mockReturnValue(true);
    mockedGetStripePriceId.mockReturnValue("price_123");
    mockedGetStripeWebhookSecret.mockReturnValue("whsec_123");
    mockedGetStripeClient.mockReturnValue(stripeClientMock as unknown as Stripe);
  });

  it("creates a checkout session for an authorized team admin", async () => {
    mockedAuthorizeTeamPermission.mockResolvedValue({
      ok: true,
      team: {
        id: 10,
        name: "Team Billing",
        stripeCustomerId: null,
      },
      user: {
        id: 7,
        email: "owner@example.com",
      },
      teamRole: "admin",
    } as unknown as Awaited<ReturnType<typeof authorizeTeamPermission>>);

    stripeClientMock.customers.create.mockResolvedValue({ id: "cus_123" });
    stripeClientMock.checkout.sessions.create.mockResolvedValue({
      url: "https://checkout.stripe.com/c/pay_test",
    });

    const result = await createTeamStripeCheckoutSession({
      teamId: 10,
      requestUserId: 7,
      origin: "http://localhost:3000",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.url).toBe("https://checkout.stripe.com/c/pay_test");
    expect(mockedUpdateTeamStripeCustomerId).toHaveBeenCalledWith(10, "cus_123");
  });

  it("returns auth error when requester cannot update the team", async () => {
    mockedAuthorizeTeamPermission.mockResolvedValue({
      ok: false,
      status: 403,
      error: "Insufficient permissions",
    });

    const result = await createTeamStripeCheckoutSession({
      teamId: 10,
      requestUserId: 8,
      origin: "http://localhost:3000",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.status).toBe(403);
    expect(result.error.errorCode).toBe(ERROR_CODES.INSUFFICIENT_PERMISSIONS);
  });

  it("returns validation error when webhook signature is missing", async () => {
    const result = await processStripeWebhook({
      signature: null,
      rawBody: "{}",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.status).toBe(400);
    expect(result.error.errorCode).toBe(ERROR_CODES.VALIDATION_ERROR);
  });

  it("returns internal error when webhook event parsing fails unexpectedly", async () => {
    stripeClientMock.webhooks.constructEvent.mockImplementation(() => {
      throw new Error("bad signature");
    });

    const result = await processStripeWebhook({
      signature: "sig_invalid",
      rawBody: "{}",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.status).toBe(500);
    expect(result.error.errorCode).toBe(ERROR_CODES.INTERNAL_ERROR);
  });

  it("synchronizes subscription on checkout.session.completed webhook", async () => {
    stripeClientMock.webhooks.constructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          customer: "cus_999",
          subscription: "sub_999",
          metadata: { teamId: "12" },
        },
      },
    });
    mockedGetTeamByStripeCustomerId.mockResolvedValue(null);
    mockedGetTeamWithStats.mockResolvedValue({
      id: 12,
      name: "Team 12",
      stripeCustomerId: null,
    } as never);
    stripeClientMock.subscriptions.retrieve.mockResolvedValue({
      id: "sub_999",
      status: "active",
      items: { data: [{ current_period_end: 1_800_000_000, price: { id: "price_123" } }] },
    });

    const result = await processStripeWebhook({
      signature: "sig_ok",
      rawBody: "{}",
    });

    expect(result.ok).toBe(true);
    expect(mockedUpdateTeamStripeCustomerId).toHaveBeenCalledWith(12, "cus_999");
    expect(mockedUpdateTeamStripeSubscription).toHaveBeenCalled();
  });

  it("syncs subscription state directly from Stripe provider", async () => {
    mockedAuthorizeTeamPermission.mockResolvedValue({
      ok: true,
      team: {
        id: 10,
        name: "Team Billing",
        stripeCustomerId: "cus_sync_1",
      },
      user: {
        id: 7,
        email: "owner@example.com",
      },
      teamRole: "admin",
    } as unknown as Awaited<ReturnType<typeof authorizeTeamPermission>>);

    stripeClientMock.subscriptions.list.mockResolvedValue({
      data: [
        {
          id: "sub_sync_1",
          status: "active",
          items: {
            data: [{ current_period_end: 1_800_000_000, price: { id: "price_123" } }],
          },
        },
      ],
    });

    const result = await syncTeamStripeSubscriptionFromProvider({
      teamId: 10,
      requestUserId: 7,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.synced).toBe(true);
    expect(result.data.subscriptionStatus).toBe("active");
    expect(mockedUpdateTeamStripeSubscription).toHaveBeenCalled();
  });

  it("grants manual trial for an authorized admin", async () => {
    mockedAuthorizeTeamPermission.mockResolvedValue({
      ok: true,
      team: {
        id: 3,
        name: "Team Trial",
        manualTrialGrantsCount: 1,
        manualTrialLastGrantedAt: new Date("2025-01-01T00:00:00.000Z"),
      },
      user: { id: 7, email: "owner@example.com" },
      teamRole: "admin",
    } as unknown as Awaited<ReturnType<typeof authorizeTeamPermission>>);

    mockedPersistTeamManualTrial.mockResolvedValue({
      id: 3,
      manualTrialEndsAt: new Date("2026-04-01T00:00:00.000Z"),
      manualTrialGrantsCount: 2,
    } as never);

    const result = await grantTeamManualTrial({
      teamId: 3,
      requestUserId: 7,
      payload: { durationDays: 14, reason: "winback" },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.manualTrialGrantsCount).toBe(2);
    expect(result.data.manualTrialEndsAt).toBe("2026-04-01T00:00:00.000Z");
    expect(mockedPersistTeamManualTrial).toHaveBeenCalled();
  });

  it("fails manual trial when payload validation fails", async () => {
    mockedAuthorizeTeamPermission.mockResolvedValue({
      ok: true,
      team: { id: 3, manualTrialGrantsCount: 0, manualTrialLastGrantedAt: null },
      user: { id: 7, email: "owner@example.com" },
      teamRole: "admin",
    } as unknown as Awaited<ReturnType<typeof authorizeTeamPermission>>);

    const result = await grantTeamManualTrial({
      teamId: 3,
      requestUserId: 7,
      payload: { durationDays: 0 },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.status).toBe(400);
    expect(result.error.errorCode).toBe(ERROR_CODES.VALIDATION_ERROR);
  });

  it("fails manual trial when requester has no permission", async () => {
    mockedAuthorizeTeamPermission.mockResolvedValue({
      ok: false,
      status: 403,
      error: "Insufficient permissions",
    });

    const result = await grantTeamManualTrial({
      teamId: 3,
      requestUserId: 8,
      payload: { durationDays: 14 },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.status).toBe(403);
    expect(result.error.errorCode).toBe(ERROR_CODES.INSUFFICIENT_PERMISSIONS);
  });

  it("handles unexpected manual trial persistence error", async () => {
    mockedAuthorizeTeamPermission.mockResolvedValue({
      ok: true,
      team: {
        id: 3,
        manualTrialGrantsCount: 0,
        manualTrialLastGrantedAt: new Date("2025-01-01T00:00:00.000Z"),
      },
      user: { id: 7, email: "owner@example.com" },
      teamRole: "admin",
    } as unknown as Awaited<ReturnType<typeof authorizeTeamPermission>>);
    mockedPersistTeamManualTrial.mockRejectedValue(new Error("db failed"));

    const result = await grantTeamManualTrial({
      teamId: 3,
      requestUserId: 7,
      payload: { durationDays: 14 },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.status).toBe(500);
    expect(result.error.errorCode).toBe(ERROR_CODES.INTERNAL_ERROR);
  });
});
