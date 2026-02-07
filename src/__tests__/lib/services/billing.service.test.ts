import type Stripe from "stripe";
import {
  createTeamStripeCheckoutSession,
  processStripeWebhook,
  syncTeamStripeSubscriptionFromProvider,
} from "@/lib/services/billing";
import { ERROR_CODES } from "@/lib/errors";

jest.mock("@/lib/permissions", () => ({
  authorizeTeamPermission: jest.fn(),
}));

jest.mock("@/lib/db/teams", () => ({
  getTeamByStripeCustomerId: jest.fn(),
  getTeamWithStats: jest.fn(),
  updateTeamStripeCustomerId: jest.fn(),
  updateTeamStripeSubscription: jest.fn(),
}));

jest.mock("@/lib/stripe", () => ({
  getStripeClient: jest.fn(),
  getStripePriceId: jest.fn(),
  getStripeWebhookSecret: jest.fn(),
  isStripeConfigured: jest.fn(),
}));

import { authorizeTeamPermission } from "@/lib/permissions";
import {
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

const mockedAuthorizeTeamPermission = jest.mocked(authorizeTeamPermission);
const mockedGetTeamByStripeCustomerId = jest.mocked(getTeamByStripeCustomerId);
const mockedGetTeamWithStats = jest.mocked(getTeamWithStats);
const mockedUpdateTeamStripeCustomerId = jest.mocked(updateTeamStripeCustomerId);
const mockedUpdateTeamStripeSubscription = jest.mocked(updateTeamStripeSubscription);
const mockedGetStripeClient = jest.mocked(getStripeClient);
const mockedGetStripePriceId = jest.mocked(getStripePriceId);
const mockedGetStripeWebhookSecret = jest.mocked(getStripeWebhookSecret);
const mockedIsStripeConfigured = jest.mocked(isStripeConfigured);

describe("billing service", () => {
  const stripeClientMock = {
    customers: { create: jest.fn() },
    checkout: { sessions: { create: jest.fn() } },
    billingPortal: { sessions: { create: jest.fn() } },
    webhooks: { constructEvent: jest.fn() },
    subscriptions: { retrieve: jest.fn(), list: jest.fn() },
  };

  beforeEach(() => {
    jest.clearAllMocks();

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
});
