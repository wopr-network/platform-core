/**
 * Wires the fleet auto-update pipeline: ImagePoller → RolloutOrchestrator → ContainerUpdater.
 *
 * Consumers call initFleetUpdater() with a Docker instance, FleetManager, and config.
 * The pipeline detects new image digests, batches updates via a rollout strategy,
 * snapshots volumes before updating, and restores on failure (nuclear rollback).
 *
 * When a new image digest is detected for ANY bot, the orchestrator triggers a
 * fleet-wide rollout across all non-manual bots. This is intentional: the managed
 * Paperclip image is shared across all tenants, so a single digest change means
 * all bots need updating.
 */

import type Docker from "dockerode";
import { logger } from "../config/logger.js";
import type { IBotProfileRepository } from "./bot-profile-repository.js";
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
  /** Stop the poller and wait for any active rollout to finish */
  stop: () => Promise<void>;
}

/**
 * Initialize the fleet auto-update pipeline.
 *
 * Creates and wires: ImagePoller → RolloutOrchestrator → ContainerUpdater
 * with VolumeSnapshotManager for nuclear rollback.
 *
 * @param docker - Dockerode instance for container operations
 * @param fleet - FleetManager for container lifecycle
 * @param profileStore - Legacy IProfileStore (used by ImagePoller/ContainerUpdater)
 * @param profileRepo - PostgreSQL-backed IBotProfileRepository (used for updatable profile queries)
 * @param config - Optional pipeline configuration
 */
export function initFleetUpdater(
  docker: Docker,
  fleet: FleetManager,
  profileStore: IProfileStore,
  profileRepo: IBotProfileRepository,
  config: FleetUpdaterConfig = {},
): FleetUpdaterHandle {
  const {
    strategy: strategyType = "rolling-wave",
    strategyOptions,
    snapshotDir = "/data/fleet/snapshots",
    onBotUpdated,
    onRolloutComplete,
  } = config;

  const poller = new ImagePoller(docker, profileStore);
  const updater = new ContainerUpdater(docker, profileStore, fleet, poller);
  const snapshotManager = new VolumeSnapshotManager(docker, snapshotDir);
  const strategy = createRolloutStrategy(strategyType, strategyOptions);

  const orchestrator = new RolloutOrchestrator({
    updater,
    snapshotManager,
    strategy,
    getUpdatableProfiles: async () => {
      const profiles = await profileRepo.list();
      return profiles.filter((p) => p.updatePolicy !== "manual");
    },
    onBotUpdated,
    onRolloutComplete,
  });

  // Wire the detection → orchestration pipeline.
  // Any digest change triggers a fleet-wide rollout because the managed image
  // is shared across all tenants — one new digest means all bots need updating.
  poller.onUpdateAvailable = async (_botId: string, _newDigest: string) => {
    if (orchestrator.isRolling) {
      logger.debug("Skipping update trigger — rollout already in progress");
      return;
    }
    logger.info("New image digest detected — starting fleet-wide rollout");
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
    stop: async () => {
      poller.stop();
      // Wait for any in-flight rollout to complete before returning
      if (orchestrator.isRolling) {
        logger.info("Waiting for active rollout to finish before shutdown...");
        // Poll until rollout finishes (max 5 minutes)
        const deadline = Date.now() + 5 * 60 * 1000;
        while (orchestrator.isRolling && Date.now() < deadline) {
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
      logger.info("Fleet auto-update pipeline stopped");
    },
  };
}
