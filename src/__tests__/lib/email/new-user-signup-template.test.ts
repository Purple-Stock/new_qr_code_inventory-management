import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";
import { buildNewUserSignupEmail } from "@/lib/email/new-user-signup-template";

faker.seed(20261028);

describe("buildNewUserSignupEmail", () => {
  it("renders a Purple Stock branded signup alert for Matheus", () => {
    const email = faker.internet.email({ provider: "loja.com.br" }).toLowerCase();
    const phone = faker.helpers.replaceSymbols("(11) 9####-####");
    const companyName = faker.company.name();

    const copy = buildNewUserSignupEmail({
      email,
      phone,
      companyName,
      source: "signup",
      appUrl: "https://app.purplestock.com.br",
    });

    expect(copy.subject).toBe(`Novo cadastro no Purple Stock: ${email}`);
    expect(copy.text).toContain(email);
    expect(copy.text).toContain(phone);
    expect(copy.text).toContain(companyName);
    expect(copy.text).toContain("Cadastro público");
    expect(copy.text).toContain("https://app.purplestock.com.br");
    expect(copy.html).toContain('role="presentation"');
    expect(copy.html).toContain("Purple Stock");
    expect(copy.html).toContain("#6B21A8");
    expect(copy.html).toContain(email);
    expect(copy.html).toContain(phone);
    expect(copy.html).toContain(companyName);
    expect(copy.html).toContain("Cadastro público");
  });

  it("labels team member and super admin sources", () => {
    const email = faker.internet.email().toLowerCase();

    const teamCopy = buildNewUserSignupEmail({
      email,
      source: "team_member",
    });
    const adminCopy = buildNewUserSignupEmail({
      email,
      source: "super_admin",
    });

    expect(teamCopy.text).toContain("Usuário criado na equipe");
    expect(adminCopy.text).toContain("Criado pelo super admin");
  });

  it("escapes company names in HTML", () => {
    const copy = buildNewUserSignupEmail({
      email: "owner@example.com",
      companyName: 'Loja <script>alert(1)</script>',
      phone: '11 "98888"',
      source: "signup",
    });

    expect(copy.html).toContain("Loja &lt;script&gt;alert(1)&lt;/script&gt;");
    expect(copy.html).toContain("11 &quot;98888&quot;");
    expect(copy.html).not.toContain("<script>");
    expect(copy.text).toContain('Loja <script>alert(1)</script>');
  });
});
