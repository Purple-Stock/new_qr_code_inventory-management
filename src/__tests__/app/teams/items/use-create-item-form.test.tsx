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
        maximumStockInvalid:
          "Maximum quantity must be a number zero or greater",
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
      <input
        aria-label="maximum quantity"
        value={form.maximumStock}
        onChange={(e) => updateField("maximumStock", e.target.value)}
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

  it("submits the typed maximum quantity instead of a unique-only flag", async () => {
    mockedFetchApiJsonResult.mockResolvedValue({
      ok: true,
      data: { message: "ok", item: { id: 1 } },
    } as never);

    render(<TestHarness />);

    fireEvent.change(screen.getByLabelText("name"), {
      target: { value: "Sony camera" },
    });
    fireEvent.change(screen.getByLabelText("barcode"), {
      target: { value: "6584599408468" },
    });
    fireEvent.change(screen.getByLabelText("maximum quantity"), {
      target: { value: "5" },
    });
    fireEvent.click(screen.getByRole("button", { name: "submit" }));

    await waitFor(() => {
      expect(mockedFetchApiJsonResult).toHaveBeenCalled();
    });

    const [, options] = mockedFetchApiJsonResult.mock.calls[0] ?? [];
    expect(options?.body).toEqual(
      expect.objectContaining({
        name: "Sony camera",
        barcode: "6584599408468",
        maximumStock: 5,
      })
    );
    expect(options?.body).not.toEqual(
      expect.objectContaining({ uniqueEquipment: expect.anything() })
    );
  });

  it("rejects a non-numeric maximum quantity before calling the API", async () => {
    render(<TestHarness />);

    fireEvent.change(screen.getByLabelText("name"), {
      target: { value: "Cable" },
    });
    fireEvent.change(screen.getByLabelText("barcode"), {
      target: { value: "78912345678" },
    });
    fireEvent.change(screen.getByLabelText("maximum quantity"), {
      target: { value: "abc" },
    });
    fireEvent.click(screen.getByRole("button", { name: "submit" }));

    expect(
      await screen.findByText(
        "Maximum quantity must be a number zero or greater"
      )
    ).toBeInTheDocument();
    expect(mockedFetchApiJsonResult).not.toHaveBeenCalled();
  });

  it("sends null maximum stock when the field is left blank", async () => {
    mockedFetchApiJsonResult.mockResolvedValue({
      ok: true,
      data: { message: "ok", item: { id: 1 } },
    } as never);

    render(<TestHarness />);

    fireEvent.change(screen.getByLabelText("name"), {
      target: { value: "Cable" },
    });
    fireEvent.change(screen.getByLabelText("barcode"), {
      target: { value: "78912345678" },
    });
    fireEvent.click(screen.getByRole("button", { name: "submit" }));

    await waitFor(() => {
      expect(mockedFetchApiJsonResult).toHaveBeenCalled();
    });

    const [, options] = mockedFetchApiJsonResult.mock.calls[0] ?? [];
    expect(options?.body).toEqual(
      expect.objectContaining({ maximumStock: null })
    );
  });
});
