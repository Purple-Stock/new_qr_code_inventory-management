import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getTeamMembersWithUsersMock = vi.fn();
const sendResendEmailMock = vi.fn();

vi.mock("@/lib/db/team-members", () => ({
  getTeamMembersWithUsers: (...args: unknown[]) =>
    getTeamMembersWithUsersMock(...args),
}));

vi.mock("@/lib/email/resend", () => ({
  sendResendEmail: (...args: unknown[]) => sendResendEmailMock(...args),
}));

import { notifyIfMinimumStockCrossed } from "@/lib/services/low-stock-alert";

describe("notifyIfMinimumStockCrossed", () => {
  const originalApiKey = process.env.RESEND_API_KEY;
  const originalFrom = process.env.RESEND_FROM_EMAIL;

  beforeEach(() => {
    getTeamMembersWithUsersMock.mockReset();
    sendResendEmailMock.mockReset();
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.RESEND_FROM_EMAIL = "Purple Stock <contato@example.com>";
  });

  afterEach(() => {
    process.env.RESEND_API_KEY = originalApiKey;
    process.env.RESEND_FROM_EMAIL = originalFrom;
  });

  it("emails unique active team members when stock crosses the minimum", async () => {
    getTeamMembersWithUsersMock.mockResolvedValue([
      { userId: 1, email: "admin@example.com", role: "admin", status: "active" },
      { userId: 2, email: "ops@example.com", role: "operator", status: "active" },
      { userId: 3, email: "admin@example.com", role: "admin", status: "active" },
    ]);
    sendResendEmailMock.mockResolvedValue("email_1");

    await notifyIfMinimumStockCrossed({
      teamId: 10,
      itemName: "Cabo HDMI",
      itemSku: "HDMI-1",
      previousStock: 5,
      nextStock: 1,
      minimumStock: 2,
    });

    expect(getTeamMembersWithUsersMock).toHaveBeenCalledWith(10);
    expect(sendResendEmailMock).toHaveBeenCalledTimes(2);
    expect(sendResendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "admin@example.com",
        subject: "Estoque baixo: Cabo HDMI",
      })
    );
    expect(sendResendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "ops@example.com",
      })
    );
    const firstCall = sendResendEmailMock.mock.calls[0]?.[0] as {
      html: string;
      text: string;
    };
    expect(firstCall.text).toContain("1");
    expect(firstCall.text).toContain("2");
    expect(firstCall.html).toContain("Cabo HDMI");
  });

  it("skips sending when the minimum is unarmed or stock was already at or below it", async () => {
    await notifyIfMinimumStockCrossed({
      teamId: 10,
      itemName: "Cabo HDMI",
      previousStock: 5,
      nextStock: 1,
      minimumStock: 0,
    });
    await notifyIfMinimumStockCrossed({
      teamId: 10,
      itemName: "Cabo HDMI",
      previousStock: 1,
      nextStock: 0,
      minimumStock: 2,
    });

    expect(getTeamMembersWithUsersMock).not.toHaveBeenCalled();
    expect(sendResendEmailMock).not.toHaveBeenCalled();
  });

  it("skips sending when Resend is not configured", async () => {
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM_EMAIL;

    await notifyIfMinimumStockCrossed({
      teamId: 10,
      itemName: "Cabo HDMI",
      previousStock: 5,
      nextStock: 1,
      minimumStock: 2,
    });

    expect(sendResendEmailMock).not.toHaveBeenCalled();
  });

  it("escapes item names in HTML", async () => {
    getTeamMembersWithUsersMock.mockResolvedValue([
      { userId: 1, email: "admin@example.com", role: "admin", status: "active" },
    ]);
    sendResendEmailMock.mockResolvedValue("email_1");

    await notifyIfMinimumStockCrossed({
      teamId: 10,
      itemName: 'Cabo <script>alert(1)</script>',
      itemSku: 'HDMI-"1"',
      previousStock: 5,
      nextStock: 1,
      minimumStock: 2,
    });

    const firstCall = sendResendEmailMock.mock.calls[0]?.[0] as {
      html: string;
      text: string;
    };
    expect(firstCall.html).toContain("Cabo &lt;script&gt;alert(1)&lt;/script&gt;");
    expect(firstCall.html).toContain("HDMI-&quot;1&quot;");
    expect(firstCall.html).not.toContain("<script>");
    expect(firstCall.text).toContain('Cabo <script>alert(1)</script>');
  });

  it("does not throw when Resend fails", async () => {
    getTeamMembersWithUsersMock.mockResolvedValue([
      { userId: 1, email: "admin@example.com", role: "admin", status: "active" },
    ]);
    sendResendEmailMock.mockRejectedValue(new Error("Resend down"));

    await expect(
      notifyIfMinimumStockCrossed({
        teamId: 10,
        itemName: "Cabo HDMI",
        previousStock: 5,
        nextStock: 1,
        minimumStock: 2,
      })
    ).resolves.toBeUndefined();
  });
});
