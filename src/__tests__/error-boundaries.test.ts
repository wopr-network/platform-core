import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "..");

describe("error.tsx boundaries exist for all major route segments", () => {
  const segments = [
    "app/(dashboard)/billing/error.tsx",
    "app/fleet/error.tsx",
    "app/plugins/error.tsx",
    "app/channels/error.tsx",
    "app/(dashboard)/settings/error.tsx",
  ];

  for (const seg of segments) {
    it(`${seg} exists`, () => {
      expect(existsSync(resolve(ROOT, seg))).toBe(true);
    });
  }
});
