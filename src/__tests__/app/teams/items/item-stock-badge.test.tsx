// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ItemStockBadge } from "@/app/teams/[id]/items/_components/ItemStockBadge";

describe("ItemStockBadge", () => {
  it("shows the low-stock warning when remaining units hit the minimum", () => {
    render(
      <ItemStockBadge
        currentStock={2}
        minimumStock={2}
        lowStockLabel="Estoque baixo"
        className="px-3 py-1 text-sm"
      />
    );

    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Estoque baixo")).toBeInTheDocument();
  });

  it("does not warn when the minimum is unarmed", () => {
    render(
      <ItemStockBadge
        currentStock={5}
        minimumStock={0}
        lowStockLabel="Estoque baixo"
        className="px-3 py-1 text-sm"
      />
    );

    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.queryByText("Estoque baixo")).not.toBeInTheDocument();
  });
});
