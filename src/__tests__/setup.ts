import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Default fetch mock: reject all API calls so components fall back to mock data immediately.
// Individual tests can override with vi.stubGlobal("fetch", ...) as needed.
vi.stubGlobal(
  "fetch",
  vi.fn().mockRejectedValue(new Error("Network request not allowed in tests")),
);

// Polyfill IntersectionObserver for framer-motion whileInView in test env
class MockIntersectionObserver {
  readonly root: Element | null = null;
  readonly rootMargin: string = "";
  readonly thresholds: ReadonlyArray<number> = [];
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

if (typeof globalThis.IntersectionObserver === "undefined") {
  globalThis.IntersectionObserver =
    MockIntersectionObserver as unknown as typeof IntersectionObserver;
}
