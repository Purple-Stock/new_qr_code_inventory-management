import { parseItemPayload, parseTeamUpdatePayload } from "@/lib/contracts/schemas";

describe("contracts/schemas photo + label company info", () => {
  it("parses item payload with photoData", () => {
    const parsed = parseItemPayload(
      {
        name: "Printer",
        barcode: "123456",
        photoData: "data:image/png;base64,AAAA",
      },
      "create"
    );

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.data.photoData).toBe("data:image/png;base64,AAAA");
  });

  it("rejects invalid photoData format", () => {
    const parsed = parseItemPayload(
      {
        name: "Printer",
        barcode: "123456",
        photoData: "not-a-data-url",
      },
      "create"
    );

    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.error).toContain("Photo");
  });

  it("parses team update payload with labelCompanyInfo", () => {
    const parsed = parseTeamUpdatePayload({
      labelCompanyInfo: "CNPJ 00.000.000/0001-00",
    });

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.data.labelCompanyInfo).toBe("CNPJ 00.000.000/0001-00");
  });
});
