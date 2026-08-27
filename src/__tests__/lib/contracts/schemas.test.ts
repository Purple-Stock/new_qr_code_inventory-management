import {
  parseItemPayload,
  parseTeamUpdatePayload,
} from "@/lib/contracts/schemas";

describe("contracts/schemas custom fields", () => {
  it("parses item payload with customFields", () => {
    const parsed = parseItemPayload(
      {
        name: "Printer",
        barcode: "123456",
        customFields: {
          medidor_total: "10234",
          medidor_pb: "8300",
        },
      },
      "create"
    );

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.data.customFields).toEqual({
      medidor_total: "10234",
      medidor_pb: "8300",
    });
  });

  it("parses unique equipment maximumStock", () => {
    const parsed = parseItemPayload(
      {
        name: "SONY ZVE-10 B",
        barcode: "6584599408468",
        maximumStock: 1,
      },
      "create"
    );

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.data.maximumStock).toBe(1);
  });

  it("parses an editable maximumStock greater than one", () => {
    const parsed = parseItemPayload(
      {
        name: "XLR Cable",
        barcode: "cable-max-5",
        maximumStock: 5,
      },
      "create"
    );

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.data.maximumStock).toBe(5);
  });

  it("rejects non-string values in item customFields", () => {
    const parsed = parseItemPayload(
      {
        name: "Printer",
        barcode: "123456",
        customFields: {
          medidor_total: 123,
        },
      },
      "create"
    );

    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.error).toContain("custom fields");
  });

  it("parses team update payload with itemCustomFieldSchema", () => {
    const parsed = parseTeamUpdatePayload({
      itemCustomFieldSchema: [
        { key: "medidor_total", label: "Medidor total", active: true },
        { key: "medidor_color", label: "Medidor color", active: false },
      ],
    });

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.data.itemCustomFieldSchema).toEqual([
      { key: "medidor_total", label: "Medidor total", active: true },
      { key: "medidor_color", label: "Medidor color", active: false },
    ]);
  });

  it("rejects invalid team custom field schema entry", () => {
    const parsed = parseTeamUpdatePayload({
      itemCustomFieldSchema: [{ key: "", label: "X", active: true }],
    });

    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.error).toContain("custom field schema");
  });
});
