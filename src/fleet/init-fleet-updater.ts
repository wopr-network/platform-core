/**
 * Wires the fleet auto-update pipeline: ImagePoller → RolloutOrchestrator → ContainerUpdater.
 *
 * Consumers call initFleetUpdater() with a Docker instance, FleetManager, and config.
 * The pipeline detects new image digests, batches updates via a rollout strategy,
 * snapshots volumes before updating, and restores on failure (nuclear rollback).
 */

import type Docker from "dockerode";
import { logger } from "../config/logger.js";
import type { FleetManager } from "./fleet-manager.js";
import { ImagePoller } from "./image-poller.js";
import type { IProfileStore } from "./profile-store.js";
import { RolloutOrchestrator, type RolloutResult } from "./rollout-orchestrator.js";
import { createRolloutStrategy, type RollingWaveOptions } from "./rollout-strategy.js";
import { ContainerUpdater } from "./updater.js";
import { VolumeSnapshotManager } from "./volume-snapshot-manager.js";

export interface FleetUpdaterConfig {
  /** Rollout strategy type. Default: "rolling-wave" */
  strategy?: "rolling-wave" | "single-bot" | "immediate";
  /** Options for RollingWaveStrategy (ignored for other strategies) */
  strategyOptions?: RollingWaveOptions;
  /** Directory for volume snapshots. Default: "/data/fleet/snapshots" */
  snapshotDir?: string;
  /** Called after each bot update */
  onBotUpdated?: (result: { botId: string; success: boolean; volumeRestored: boolean }) => void;
  /** Called when a rollout completes */
  onRolloutComplete?: (result: RolloutResult) => void;
}

export interface FleetUpdaterHandle {
  poller: ImagePoller;
  updater: ContainerUpdater;
  orchestrator: RolloutOrchestrator;
  snapshotManager: VolumeSnapshotManager;
  /** Stop the poller and shut down the update pipeline */
  stop: () => void;
}

/**
 * Initialize the fleet auto-update pipeline.
 *
 * Creates and wires: ImagePoller → RolloutOrchestrator → ContainerUpdater
 * with VolumeSnapshotManager for nuclear rollback.
 *
 * Call handle.stop() to shut down gracefully.
 */
export function initFleetUpdater(
  docker: Docker,
  fleet: FleetManager,
  store: IProfileStore,
  config: FleetUpdaterConfig = {},
): FleetUpdaterHandle {
  const {
    strategy: strategyType = "rolling-wave",
    strategyOptions,
    snapshotDir = "/data/fleet/snapshots",
    onBotUpdated,
    onRolloutComplete,
  } = config;

  const poller = new ImagePoller(docker, store);
  const updater = new ContainerUpdater(docker, store, fleet, poller);
  const snapshotManager = new VolumeSnapshotManager(docker, snapshotDir);
  const strategy = createRolloutStrategy(strategyType, strategyOptions);

  const orchestrator = new RolloutOrchestrator({
    updater,
    snapshotManager,
    strategy,
    getUpdatableProfiles: async () => {
      const profiles = await store.list();
      return profiles.filter((p) => p.updatePolicy !== "manual");
    },
    onBotUpdated,
    onRolloutComplete,
  });

  // Wire the detection → orchestration pipeline
  poller.onUpdateAvailable = async (_botId: string, _newDigest: string) => {
    if (orchestrator.isRolling) {
      logger.debug("Skipping update trigger — rollout already in progress");
      return;
    }
    logger.info("New image detected — starting rollout");
    await orchestrator.rollout().catch((err) => {
      logger.error("Rollout failed", { err });
    });
  };

  // Start polling
  poller.start().catch((err) => {
    logger.error("ImagePoller failed to start", { err });
  });

  logger.info("Fleet auto-update pipeline initialized", {
    strategy: strategyType,
    snapshotDir,
  });

  return {
    poller,
    updater,
    orchestrator,
    snapshotManager,
    stop: () => {
      poller.stop();
      logger.info("Fleet auto-update pipeline stopped");
    },
  };
}
