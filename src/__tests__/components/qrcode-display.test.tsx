// @vitest-environment jsdom

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { QRCodeDisplay } from "@/components/QRCodeDisplay";

describe("QRCodeDisplay", () => {
  it("renders fallback when value is empty", () => {
    render(<QRCodeDisplay value="" size={72} className="target" />);

    expect(screen.getByText("No code")).toBeInTheDocument();
    const fallback = screen.getByText("No code").closest("div");
    expect(fallback).toHaveStyle({ width: "72px", height: "72px" });
  });

  it("renders a QR code SVG when value is provided", () => {
    const { container } = render(<QRCodeDisplay value="ABC-123" size={80} className="target" />);

    expect(screen.queryByText("No code")).not.toBeInTheDocument();
    const qrContainer = container.querySelector(".target");
    const svg = qrContainer?.querySelector("svg");

    expect(qrContainer).toHaveStyle({ width: "80px", height: "80px" });
    expect(svg).toBeInTheDocument();
  });
});
