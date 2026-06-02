// @vitest-environment jsdom

import { describe, it, expect, beforeEach, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useCreateItemForm } from "@/app/teams/[id]/items/_hooks/useCreateItemForm";
import { fetchApiJsonResult } from "@/lib/api-client";

vi.mock("@/lib/api-client", () => ({
  fetchApiJsonResult: vi.fn(),
}));

vi.mock("@/lib/i18n", () => ({
  useTranslation: () => ({
    t: {
      itemForm: {
        itemNameRequired: "Name required",
        barcodeRequired: "Barcode required",
        unexpectedError: "Unexpected error",
      },
    },
  }),
}));

const mockedFetchApiJsonResult = vi.mocked(fetchApiJsonResult);

function TestHarness() {
  const {
    form,
    error,
    handleSubmit,
    updateField,
  } = useCreateItemForm({
    teamId: 10,
  });

  return (
    <form onSubmit={handleSubmit}>
      <input
        aria-label="name"
        value={form.name}
        onChange={(e) => updateField("name", e.target.value)}
      />
      <input
        aria-label="barcode"
        value={form.barcode}
        onChange={(e) => updateField("barcode", e.target.value)}
      />
      <button type="submit">submit</button>
      {error ? <div>{error}</div> : null}
    </form>
  );
}

describe("useCreateItemForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps error visible when the API returns a failure", async () => {
    mockedFetchApiJsonResult.mockResolvedValue({
      ok: false,
      error: {
        error: "Barcode already exists",
      },
    } as any);

    render(<TestHarness />);

    fireEvent.change(screen.getByLabelText("name"), { target: { value: "Cable" } });
    fireEvent.change(screen.getByLabelText("barcode"), { target: { value: "78912345678" } });
    fireEvent.click(screen.getByRole("button", { name: "submit" }));

    await waitFor(() => {
      expect(screen.getByText("Barcode already exists")).toBeInTheDocument();
    });
  });
});
