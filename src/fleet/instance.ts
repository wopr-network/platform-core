import type Docker from "dockerode";
import { logger } from "../config/logger.js";
import type { ProxyManagerInterface } from "../proxy/types.js";
import type { IBotInstanceRepository } from "./bot-instance-repository.js";
import type { BotEventType, FleetEventEmitter } from "./fleet-event-emitter.js";
import type { BotProfile } from "./types.js";

/**
 * Instance — a runtime handle to a container.
 *
 * FleetManager is the factory: pull image, create container, return Instance.
 * Instance owns its lifecycle: start, stop, remove, setupBilling, setupProxy.
 *
 * Ephemeral instances (e.g., holyshippers) skip billing and proxy setup.
 * They bill per-token at the gateway layer, not per-instance.
 */

export interface InstanceDeps {
  docker: Docker;
  profile: BotProfile;
  containerId: string;
  containerName: string;
  url: string;
  /** Optional — non-ephemeral instances use these for billing/proxy/events */
  instanceRepo?: IBotInstanceRepository;
  proxyManager?: ProxyManagerInterface;
  eventEmitter?: FleetEventEmitter;
}

export class Instance {
  readonly id: string;
  readonly containerId: string;
  readonly containerName: string;
  readonly url: string;
  readonly profile: BotProfile;

  private readonly docker: Docker;
  private readonly instanceRepo: IBotInstanceRepository | undefined;
  private readonly proxyManager: ProxyManagerInterface | undefined;
  private readonly eventEmitter: FleetEventEmitter | undefined;

  constructor(deps: InstanceDeps) {
    this.id = deps.profile.id;
    this.containerId = deps.containerId;
    this.containerName = deps.containerName;
    this.url = deps.url;
    this.profile = deps.profile;
    this.docker = deps.docker;
    this.instanceRepo = deps.instanceRepo;
    this.proxyManager = deps.proxyManager;
    this.eventEmitter = deps.eventEmitter;
    this.emit("bot.created");
  }

  async start(): Promise<void> {
    const container = this.docker.getContainer(this.containerId);
    await container.start();
    logger.info(`Instance started`, { id: this.id, containerName: this.containerName, url: this.url });
    this.emit("bot.started");
  }

  async stop(): Promise<void> {
    const container = this.docker.getContainer(this.containerId);
    try {
      await container.stop({ t: 10 });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes("not running") && !msg.includes("already stopped")) {
        throw err;
      }
    }
    logger.info(`Instance stopped`, { id: this.id, containerName: this.containerName });
    this.emit("bot.stopped");
  }

  async remove(): Promise<void> {
    const container = this.docker.getContainer(this.containerId);
    try {
      await container.stop({ t: 5 }).catch(() => {});
      await container.remove({ force: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes("No such container")) {
        throw err;
      }
    }

    if (this.proxyManager) {
      try {
        await this.proxyManager.removeRoute(this.id);
      } catch (err) {
        logger.warn("Proxy route cleanup failed (non-fatal)", { id: this.id, err });
      }
    }

    logger.info(`Instance removed`, { id: this.id, containerName: this.containerName });
    this.emit("bot.removed");
  }

  async status(): Promise<"running" | "stopped" | "gone"> {
    try {
      const container = this.docker.getContainer(this.containerId);
      const info = await container.inspect();
      return info.State.Running ? "running" : "stopped";
    } catch {
      return "gone";
    }
  }

  /**
   * Register this instance in the billing system.
   * Skip for ephemeral instances — they bill per-token, not per-instance.
   */
  async setupBilling(): Promise<void> {
    if (this.profile.ephemeral) {
      logger.info("Skipping billing setup (ephemeral)", { id: this.id });
      return;
    }
    if (!this.instanceRepo) {
      logger.warn("No instance repo — billing setup skipped", { id: this.id });
      return;
    }
    await this.instanceRepo.register(this.id, this.profile.tenantId, this.profile.name);
    logger.info("Billing registered", { id: this.id, tenantId: this.profile.tenantId });
  }

  /**
   * Register a proxy route for tenant subdomain routing.
   * Skip for ephemeral instances — they're accessed directly via Docker DNS.
   */
  async setupProxy(): Promise<void> {
    if (this.profile.ephemeral) {
      logger.info("Skipping proxy setup (ephemeral)", { id: this.id });
      return;
    }
    if (!this.proxyManager) {
      logger.warn("No proxy manager — proxy setup skipped", { id: this.id });
      return;
    }
    try {
      const subdomain = this.profile.name.toLowerCase().replace(/_/g, "-");
      await this.proxyManager.addRoute({
        instanceId: this.id,
        subdomain,
        upstreamHost: this.containerName,
        upstreamPort: 7437,
        healthy: true,
      });
      logger.info("Proxy route registered", { id: this.id, subdomain });
    } catch (err) {
      logger.warn("Proxy route registration failed (non-fatal)", { id: this.id, err });
    }
  }

  private emit(type: BotEventType): void {
    if (this.eventEmitter) {
      this.eventEmitter.emit({
        type,
        botId: this.id,
        tenantId: this.profile.tenantId,
        timestamp: new Date().toISOString(),
      });
    }
  }
}
