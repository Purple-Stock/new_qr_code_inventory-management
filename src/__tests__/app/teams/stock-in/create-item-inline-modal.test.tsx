// @vitest-environment jsdom

import { describe, it, expect, beforeEach, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { CreateItemInlineModal } from "@/app/teams/[id]/stock-in/_components/CreateItemInlineModal";
import { useCreateItemForm } from "@/app/teams/[id]/items/_hooks/useCreateItemForm";

vi.mock("@/app/teams/[id]/items/_hooks/useCreateItemForm", () => ({
  useCreateItemForm: vi.fn(),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    ...props
  }: {
    children: ReactNode;
  }) => <button {...props}>{children}</button>,
}));

vi.mock("@/app/teams/[id]/items/_components/ItemForm", () => ({
  ItemForm: () => <div>Item form</div>,
}));

vi.mock("@/lib/i18n", () => ({
  useTranslation: () => ({
    t: {
      common: {
        close: "Close",
      },
      stockIn: {
        createItemModalTitle: "Create item",
        createItemModalDescription: "Create item description",
      },
    },
  }),
}));

const mockedUseCreateItemForm = vi.mocked(useCreateItemForm);

describe("CreateItemInlineModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseCreateItemForm.mockReturnValue({
      form: {
        name: "",
        sku: "",
        barcode: "",
        cost: "",
        price: "",
        itemType: "",
        brand: "",
        photoData: "",
        customFields: {},
      },
      error: "",
      isLoading: false,
      updateField: vi.fn(),
      updateCustomField: vi.fn(),
      generateSKU: vi.fn(),
      generateBarcode: vi.fn(),
      handleSubmit: vi.fn(),
      resetForm: vi.fn(),
    });
  });

  it("remounts the form hook with new initial values after closing and reopening", () => {
    const team = { id: 1, itemCustomFieldSchema: [] } as any;
    const onClose = vi.fn();
    const onSuccess = vi.fn();

    const { rerender } = render(
      <CreateItemInlineModal
        isOpen={false}
        team={team}
        initialValues={{ name: "Cable" }}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    );

    expect(mockedUseCreateItemForm).not.toHaveBeenCalled();

    rerender(
      <CreateItemInlineModal
        isOpen={true}
        team={team}
        initialValues={{ name: "Cable" }}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    );

    rerender(
      <CreateItemInlineModal
        isOpen={false}
        team={team}
        initialValues={{ barcode: "78912345678" }}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    );

    rerender(
      <CreateItemInlineModal
        isOpen={true}
        team={team}
        initialValues={{ barcode: "78912345678" }}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    );

    expect(mockedUseCreateItemForm).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ initialValues: { name: "Cable" } })
    );
    expect(mockedUseCreateItemForm).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ initialValues: { barcode: "78912345678" } })
    );
  });

  it("closes from close button, Escape, and backdrop click", () => {
    const team = { id: 1, itemCustomFieldSchema: [] } as any;
    const onClose = vi.fn();

    render(
      <CreateItemInlineModal
        isOpen={true}
        team={team}
        initialValues={{ name: "Cable" }}
        onClose={onClose}
        onSuccess={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.click(screen.getByRole("presentation"));

    expect(onClose).toHaveBeenCalledTimes(3);
  });
});
