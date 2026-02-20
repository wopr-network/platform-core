import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PrelaunchPage } from "../components/landing/prelaunch-page";

describe("PrelaunchPage", () => {
  beforeEach(() => {
    // Fix time to a date before the default launch date (2026-04-01)
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders a blinking cursor element", () => {
    render(<PrelaunchPage />);
    expect(screen.getByLabelText("Coming soon")).toBeInTheDocument();
  });

  it("renders the cursor with terminal green background", () => {
    render(<PrelaunchPage />);
    const cursor = screen.getByLabelText("Coming soon");
    expect(cursor.className).toContain("bg-terminal");
  });

  it("renders the cursor with pulse animation", () => {
    render(<PrelaunchPage />);
    const cursor = screen.getByLabelText("Coming soon");
    expect(cursor.className).toContain("animate-pulse");
  });

  it("renders countdown digits when before launch date", () => {
    render(<PrelaunchPage />);
    const colons = screen.getAllByText(":");
    expect(colons.length).toBe(3);
  });

  it("uses full black background", () => {
    render(<PrelaunchPage />);
    const wrapper = screen.getByLabelText("Coming soon").parentElement;
    expect(wrapper).not.toBeNull();
    expect(wrapper?.className).toContain("bg-black");
  });

  it("uses monospace font for countdown", () => {
    render(<PrelaunchPage />);
    const colons = screen.getAllByText(":");
    const countdown = colons[0].parentElement;
    expect(countdown).not.toBeNull();
    expect(countdown?.className).toContain("font-mono");
  });
});
