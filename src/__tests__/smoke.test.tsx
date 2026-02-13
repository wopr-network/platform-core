import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "../app/(dashboard)/page";

describe("Smoke test", () => {
  it("renders the home page with WOPR Platform heading", () => {
    render(<Home />);
    expect(screen.getByText("WOPR Platform")).toBeInTheDocument();
  });
});
