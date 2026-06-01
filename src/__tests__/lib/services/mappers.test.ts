import { describe, it, expect } from "vitest";
import { toTeamDto } from "@/lib/services/mappers";

describe("mappers", () => {
  it("converts sqlite timestamps and unix seconds to ISO strings", () => {
    const dto = toTeamDto({
      id: 4,
      name: "testes",
      notes: null,
      userId: 1,
      companyId: null,
      companyName: null,
      labelCompanyInfo: null,
      labelLogoUrl: null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      stripeSubscriptionStatus: "active",
      stripePriceId: null,
      stripeCurrentPeriodEnd: null,
      manualTrialEndsAt: null,
      itemCustomFieldSchema: null,
      itemCount: 0,
      transactionCount: 0,
      memberCount: 1,
      createdAt: 1769279047,
      updatedAt: "2026-06-01 13:18:44",
    });

    expect(dto.createdAt).toBe("2026-01-24T18:24:07.000Z");
    expect(dto.updatedAt).toBe("2026-06-01T13:18:44.000Z");
  });
});
