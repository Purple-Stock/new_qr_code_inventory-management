import { describe, expect, it } from "vitest";
import { createEmptyItemFormValues } from "@/app/teams/[id]/items/_hooks/useCreateItemForm";
import { buildItemWriteBody } from "@/app/teams/[id]/items/_lib/item-write-body";

describe("buildItemWriteBody", () => {
  it("includes a parsed minimum stock in the write payload", () => {
    const result = buildItemWriteBody(
      createEmptyItemFormValues({
        name: "Cabo HDMI",
        barcode: "789",
        minimumStock: "2",
      })
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.body.minimumStock).toBe(2);
  });

  it("sends zero minimum stock when the field is left blank", () => {
    const result = buildItemWriteBody(
      createEmptyItemFormValues({
        name: "Cabo HDMI",
        barcode: "789",
      })
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.body.minimumStock).toBe(0);
  });

  it("distinguishes invalid minimum from invalid maximum", () => {
    const minimumResult = buildItemWriteBody(
      createEmptyItemFormValues({
        name: "Cabo HDMI",
        barcode: "789",
        minimumStock: "abc",
      })
    );
    expect(minimumResult).toEqual({ ok: false, error: "minimumStock" });

    const maximumResult = buildItemWriteBody(
      createEmptyItemFormValues({
        name: "Cabo HDMI",
        barcode: "789",
        maximumStock: "abc",
      })
    );
    expect(maximumResult).toEqual({ ok: false, error: "maximumStock" });
  });
});
