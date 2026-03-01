import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PrelaunchPage } from "@/components/landing/prelaunch-page";

describe("PrelaunchPage cleanup", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it("should clear the reload timeout on unmount", () => {
    // LAUNCH_DATE is a module-level constant computed at import time.
    // Spy on Date.now so getTimeLeft() returns null on the first interval tick.
    const realNow = Date.now;
    // Return a time far past any plausible LAUNCH_DATE (year 3000)
    vi.spyOn(Date, "now").mockReturnValue(new Date("3000-01-01").getTime());

    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");

    let unmount!: () => void;
    act(() => {
      ({ unmount } = render(<PrelaunchPage />));
    });

    // Advance one interval tick — getTimeLeft() returns null, setTimeout fires
    act(() => {
      vi.advanceTimersByTime(1100);
    });

    unmount();

    // clearTimeout must have been called (cleanup of reload timeout)
    expect(clearTimeoutSpy).toHaveBeenCalled();

    clearTimeoutSpy.mockRestore();
    vi.spyOn(Date, "now").mockRestore();
    void realNow;
  });
});
