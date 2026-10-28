import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { faker } from "@faker-js/faker";

faker.seed(20261028);

const sendResendEmailMock = vi.fn();

vi.mock("@/lib/email/resend", () => ({
  sendResendEmail: (...args: unknown[]) => sendResendEmailMock(...args),
}));

import {
  DEFAULT_NEW_USER_NOTIFY_EMAIL,
  notifyNewUserRegistered,
} from "@/lib/services/new-user-alert";

describe("notifyNewUserRegistered", () => {
  const originalApiKey = process.env.RESEND_API_KEY;
  const originalFrom = process.env.RESEND_FROM_EMAIL;
  const originalNotify = process.env.NEW_USER_NOTIFY_EMAIL;

  beforeEach(() => {
    sendResendEmailMock.mockReset();
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.RESEND_FROM_EMAIL = "Purple Stock <contato@example.com>";
    delete process.env.NEW_USER_NOTIFY_EMAIL;
  });

  afterEach(() => {
    process.env.RESEND_API_KEY = originalApiKey;
    process.env.RESEND_FROM_EMAIL = originalFrom;
    if (originalNotify === undefined) {
      delete process.env.NEW_USER_NOTIFY_EMAIL;
    } else {
      process.env.NEW_USER_NOTIFY_EMAIL = originalNotify;
    }
  });

  it("emails the default Gmail inbox with the new user details", async () => {
    sendResendEmailMock.mockResolvedValue("email_1");
    const email = faker.internet.email({ provider: "cliente.com.br" }).toLowerCase();
    const phone = faker.helpers.replaceSymbols("(21) 9####-####");
    const companyName = faker.company.name();

    await notifyNewUserRegistered({
      email,
      phone,
      companyName,
      source: "signup",
    });

    expect(DEFAULT_NEW_USER_NOTIFY_EMAIL).toBe("matheus.puppe@gmail.com");
    expect(sendResendEmailMock).toHaveBeenCalledTimes(1);
    expect(sendResendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: "re_test_key",
        from: "Purple Stock <contato@example.com>",
        to: "matheus.puppe@gmail.com",
        subject: `Novo cadastro no Purple Stock: ${email}`,
      })
    );
    const payload = sendResendEmailMock.mock.calls[0]?.[0] as {
      html: string;
      text: string;
    };
    expect(payload.text).toContain(email);
    expect(payload.text).toContain(phone);
    expect(payload.text).toContain(companyName);
    expect(payload.html).toContain(email);
  });

  it("uses NEW_USER_NOTIFY_EMAIL when configured", async () => {
    sendResendEmailMock.mockResolvedValue("email_2");
    const notifyTo = faker.internet.email({ provider: "gestaobem.com" }).toLowerCase();
    process.env.NEW_USER_NOTIFY_EMAIL = ` ${notifyTo} `;

    await notifyNewUserRegistered({
      email: faker.internet.email().toLowerCase(),
      source: "team_member",
    });

    expect(sendResendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: notifyTo })
    );
  });

  it("skips sending when Resend is not configured", async () => {
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM_EMAIL;

    await notifyNewUserRegistered({
      email: faker.internet.email().toLowerCase(),
      source: "signup",
    });

    expect(sendResendEmailMock).not.toHaveBeenCalled();
  });

  it("does not throw when Resend fails", async () => {
    sendResendEmailMock.mockRejectedValue(new Error("Resend down"));

    await expect(
      notifyNewUserRegistered({
        email: faker.internet.email().toLowerCase(),
        source: "super_admin",
      })
    ).resolves.toBeUndefined();
  });
});
