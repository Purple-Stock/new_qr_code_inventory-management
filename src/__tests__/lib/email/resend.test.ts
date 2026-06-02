import { beforeEach, describe, expect, it, vi } from "vitest";

describe("sendResendEmail", () => {
  let sendResendEmail: typeof import("@/lib/email/resend").sendResendEmail;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);

    const mod = await import("@/lib/email/resend");
    sendResendEmail = mod.sendResendEmail;
  });

  it("calls Resend API and returns email id on success", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: "resend-email-id-123" }),
    });

    const emailId = await sendResendEmail({
      apiKey: "re_test_key",
      from: "Purple Stock <contato@purplestock.com.br>",
      to: "client@example.com",
      subject: "Test Subject",
      html: "<p>Hello</p>",
      text: "Hello",
    });

    expect(emailId).toBe("resend-email-id-123");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer re_test_key",
        },
      })
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.from).toBe("Purple Stock <contato@purplestock.com.br>");
    expect(body.to).toEqual(["client@example.com"]);
    expect(body.subject).toBe("Test Subject");
    expect(body.html).toBe("<p>Hello</p>");
    expect(body.text).toBe("Hello");
  });

  it("throws when Resend responds with non-ok status", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 422,
      json: () => Promise.resolve({ message: "Domain not verified" }),
    });

    await expect(
      sendResendEmail({
        apiKey: "re_test_key",
        from: "Bad <bad@unverified.com>",
        to: "client@example.com",
        subject: "Test",
        html: "<p>Test</p>",
      })
    ).rejects.toThrow("Resend send failed: Domain not verified");
  });

  it("throws when Resend response has no id", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ message: "some error but ok" }),
    });

    await expect(
      sendResendEmail({
        apiKey: "re_test_key",
        from: "Me <me@test.com>",
        to: "client@example.com",
        subject: "Test",
        html: "<p>Test</p>",
      })
    ).rejects.toThrow("Resend send failed: some error but ok");
  });

  it("throws when Resend response json fails", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error("parse error")),
    });

    await expect(
      sendResendEmail({
        apiKey: "re_test_key",
        from: "Me <me@test.com>",
        to: "client@example.com",
        subject: "Test",
        html: "<p>Test</p>",
      })
    ).rejects.toThrow("Resend send failed: HTTP 500");
  });
});
