import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Hero } from "../components/landing/hero";

describe("Landing Hero", () => {
  it("renders the CTA link", () => {
    render(<Hero />);
    expect(screen.getByRole("link", { name: /get yours/i })).toBeInTheDocument();
  });

  it("shows the price", () => {
    render(<Hero />);
    expect(screen.getByText(/\$5\/month/)).toBeInTheDocument();
  });

  it("renders the beta badge", () => {
    render(<Hero />);
    expect(screen.getByText("Now in beta")).toBeInTheDocument();
  });

  it("uses terminal variant on the CTA link", () => {
    render(<Hero />);
    const link = screen.getByRole("link", { name: /get yours/i });
    expect(link).toHaveAttribute("data-variant", "terminal");
  });

  it("uses terminal variant on the badge", () => {
    render(<Hero />);
    const badge = screen.getByText("Now in beta");
    expect(badge).toHaveAttribute("data-variant", "terminal");
  });

  it("links to the signup page", () => {
    render(<Hero />);
    const link = screen.getByRole("link", { name: /get yours/i });
    expect(link).toHaveAttribute("href", "/signup");
  });
});
