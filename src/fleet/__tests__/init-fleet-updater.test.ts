import type Docker from "dockerode";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FleetManager } from "../fleet-manager.js";
import { initFleetUpdater } from "../init-fleet-updater.js";
import type { IProfileStore } from "../profile-store.js";

function mockDocker(): Docker {
  return {} as Docker;
}

function mockFleet(): FleetManager {
  return {} as FleetManager;
}

function mockStore(): IProfileStore {
  return {
    list: vi.fn(async () => []),
    get: vi.fn(async () => undefined),
    save: vi.fn(async () => {}),
    delete: vi.fn(async () => {}),
  } as unknown as IProfileStore;
}

describe("initFleetUpdater", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a handle with all components", () => {
    const handle = initFleetUpdater(mockDocker(), mockFleet(), mockStore());

    expect(handle.poller).toBeDefined();
    expect(handle.updater).toBeDefined();
    expect(handle.orchestrator).toBeDefined();
    expect(handle.snapshotManager).toBeDefined();
    expect(handle.stop).toBeTypeOf("function");

    handle.stop();
  });

  it("wires poller.onUpdateAvailable to orchestrator", () => {
    const handle = initFleetUpdater(mockDocker(), mockFleet(), mockStore());

    expect(handle.poller.onUpdateAvailable).toBeTypeOf("function");

    handle.stop();
  });

  it("accepts custom strategy config", () => {
    const handle = initFleetUpdater(mockDocker(), mockFleet(), mockStore(), {
      strategy: "immediate",
      snapshotDir: "/tmp/snapshots",
    });

    expect(handle.orchestrator).toBeDefined();

    handle.stop();
  });

  it("accepts callbacks", () => {
    const onBotUpdated = vi.fn();
    const onRolloutComplete = vi.fn();

    const handle = initFleetUpdater(mockDocker(), mockFleet(), mockStore(), {
      onBotUpdated,
      onRolloutComplete,
    });

    expect(handle.orchestrator).toBeDefined();

    handle.stop();
  });

  it("stop() stops the poller", () => {
    const handle = initFleetUpdater(mockDocker(), mockFleet(), mockStore());

    // Spy on poller.stop
    const stopSpy = vi.spyOn(handle.poller, "stop");

    handle.stop();

    expect(stopSpy).toHaveBeenCalled();
  });

  it("filters manual-policy bots from updatable profiles", async () => {
    const store = mockStore();
    (store.list as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "b1", updatePolicy: "nightly" },
      { id: "b2", updatePolicy: "manual" },
      { id: "b3", updatePolicy: "on-push" },
    ]);

    const handle = initFleetUpdater(mockDocker(), mockFleet(), store, {
      strategy: "immediate",
    });

    const rolloutResult = await handle.orchestrator.rollout();

    // b2 (manual) should be filtered out, b1 and b3 included
    expect(rolloutResult.totalBots).toBe(2);

    handle.stop();
  });
});
