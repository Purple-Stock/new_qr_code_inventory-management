import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { faker } from "@faker-js/faker";
import {
  WELCOME_CALENDLY_URL,
  WELCOME_WHATSAPP_URL,
} from "@/lib/email/welcome-template";

faker.seed(20261029);

const sendResendEmailMock = vi.fn();

vi.mock("@/lib/email/resend", () => ({
  sendResendEmail: (...args: unknown[]) => sendResendEmailMock(...args),
}));

import { sendSignupWelcomeEmail } from "@/lib/services/welcome-email";

describe("sendSignupWelcomeEmail", () => {
  const originalApiKey = process.env.RESEND_API_KEY;
  const originalFrom = process.env.RESEND_FROM_EMAIL;

  beforeEach(() => {
    sendResendEmailMock.mockReset();
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.RESEND_FROM_EMAIL = "Purple Stock <contato@example.com>";
  });

  afterEach(() => {
    process.env.RESEND_API_KEY = originalApiKey;
    process.env.RESEND_FROM_EMAIL = originalFrom;
  });

  it("emails the new user with WhatsApp and Calendly links", async () => {
    sendResendEmailMock.mockResolvedValue("email_1");
    const email = faker.internet.email({ provider: "loja.com.br" }).toLowerCase();
    const companyName = faker.company.name();

    await sendSignupWelcomeEmail({ email, companyName });

    expect(sendResendEmailMock).toHaveBeenCalledTimes(1);
    expect(sendResendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: "re_test_key",
        from: "Purple Stock <contato@example.com>",
        to: email,
        subject: "Bem-vindo ao Purple Stock",
      })
    );
    const payload = sendResendEmailMock.mock.calls[0]?.[0] as {
      html: string;
      text: string;
    };
    expect(payload.text).toContain(companyName);
    expect(payload.text).toContain(WELCOME_WHATSAPP_URL);
    expect(payload.text).toContain(WELCOME_CALENDLY_URL);
    expect(payload.html).toContain(WELCOME_WHATSAPP_URL);
    expect(payload.html).toContain(WELCOME_CALENDLY_URL);
  });

  it("skips sending when Resend is not configured", async () => {
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM_EMAIL;

    await sendSignupWelcomeEmail({
      email: faker.internet.email().toLowerCase(),
    });

    expect(sendResendEmailMock).not.toHaveBeenCalled();
  });

  it("does not throw when Resend fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    sendResendEmailMock.mockRejectedValue(new Error("Resend down"));

    await expect(
      sendSignupWelcomeEmail({
        email: faker.internet.email().toLowerCase(),
      })
    ).resolves.toBeUndefined();

    errorSpy.mockRestore();
  });
});
