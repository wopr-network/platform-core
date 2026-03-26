/**
 * Hot pool manager — pre-provisions warm containers for instant claiming.
 *
 * Reads desired pool size from DB (`pool_config` table). Periodically
 * replenishes the pool and cleans up dead containers.
 *
 * All config is DB-driven — no env vars for pool size, container image,
 * or port. Admin API updates pool_config, this reads it.
 */

import { logger } from "../../config/logger.js";
import type { PlatformContainer } from "../container.js";

export interface HotPoolConfig {
  /** Replenish interval in ms. Default: 60_000. */
  replenishIntervalMs?: number;
}

export interface HotPoolHandles {
  replenishTimer: ReturnType<typeof setInterval>;
  stop: () => void;
}

// ---------------------------------------------------------------------------
// Pool size — DB-driven, no env vars
// ---------------------------------------------------------------------------

export async function getPoolSize(container: PlatformContainer): Promise<number> {
  try {
    const res = await container.pool.query("SELECT pool_size FROM pool_config WHERE id = 1");
    return res.rows[0]?.pool_size ?? 2;
  } catch {
    return 2;
  }
}

export async function setPoolSize(container: PlatformContainer, size: number): Promise<void> {
  await container.pool.query(
    `INSERT INTO pool_config (id, pool_size) VALUES (1, $1)
     ON CONFLICT (id) DO UPDATE SET pool_size = $1`,
    [size],
  );
}

// ---------------------------------------------------------------------------
// Warm container management
// ---------------------------------------------------------------------------

async function warmCount(container: PlatformContainer): Promise<number> {
  const res = await container.pool.query("SELECT COUNT(*)::int AS count FROM pool_instances WHERE status = 'warm'");
  return res.rows[0].count;
}

async function createWarmContainer(container: PlatformContainer): Promise<void> {
  if (!container.fleet) throw new Error("Fleet services required for hot pool");

  const pc = container.productConfig;
  const containerImage = pc.fleet?.containerImage ?? "ghcr.io/wopr-network/platform:latest";
  const containerPort = pc.fleet?.containerPort ?? 3100;
  const provisionSecret = pc.fleet?.provisionSecret ?? "";
  const dockerNetwork = pc.fleet?.dockerNetwork ?? "";
  const docker = container.fleet.docker;
  const id = crypto.randomUUID();
  const containerName = `pool-${id.slice(0, 8)}`;
  const volumeName = `pool-${id.slice(0, 8)}`;

  try {
    // Init volume permissions
    const init = await docker.createContainer({
      Image: containerImage,
      Entrypoint: ["/bin/sh", "-c"],
      Cmd: ["chown -R 999:999 /data"],
      User: "root",
      HostConfig: { Binds: [`${volumeName}:/data`] },
    });
    await init.start();
    await init.wait();
    await init.remove();

    const warmContainer = await docker.createContainer({
      Image: containerImage,
      name: containerName,
      Env: [`PORT=${containerPort}`, `PROVISION_SECRET=${provisionSecret}`, "HOME=/data"],
      HostConfig: {
        Binds: [`${volumeName}:/data`],
        RestartPolicy: { Name: "unless-stopped" },
      },
    });

    await warmContainer.start();

    if (dockerNetwork) {
      const network = docker.getNetwork(dockerNetwork);
      await network.connect({ Container: warmContainer.id });
    }

    await container.pool.query("INSERT INTO pool_instances (id, container_id, status) VALUES ($1, $2, 'warm')", [
      id,
      warmContainer.id,
    ]);

    logger.info(`Hot pool: created warm container ${containerName} (${id})`);
  } catch (err) {
    logger.error("Hot pool: failed to create warm container", {
      error: (err as Error).message,
    });
  }
}

export async function replenishPool(container: PlatformContainer): Promise<void> {
  const desired = await getPoolSize(container);
  const current = await warmCount(container);
  const deficit = desired - current;

  if (deficit <= 0) return;

  logger.info(`Hot pool: replenishing ${deficit} container(s) (have ${current}, want ${desired})`);

  for (let i = 0; i < deficit; i++) {
    await createWarmContainer(container);
  }
}

async function cleanupDead(container: PlatformContainer): Promise<void> {
  if (!container.fleet) return;

  const docker = container.fleet.docker;
  const res = await container.pool.query("SELECT id, container_id FROM pool_instances WHERE status = 'warm'");

  for (const row of res.rows) {
    try {
      const c = docker.getContainer(row.container_id);
      const info = await c.inspect();
      if (!info.State.Running) {
        await container.pool.query("UPDATE pool_instances SET status = 'dead' WHERE id = $1", [row.id]);
        try {
          await c.remove({ force: true });
        } catch {
          /* already gone */
        }
        logger.warn(`Hot pool: marked dead container ${row.id}`);
      }
    } catch {
      await container.pool.query("UPDATE pool_instances SET status = 'dead' WHERE id = $1", [row.id]);
      logger.warn(`Hot pool: marked missing container ${row.id} as dead`);
    }
  }

  await container.pool.query("DELETE FROM pool_instances WHERE status = 'dead'");
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

export async function startHotPool(container: PlatformContainer, config?: HotPoolConfig): Promise<HotPoolHandles> {
  await cleanupDead(container);
  await replenishPool(container);

  const intervalMs = config?.replenishIntervalMs ?? 60_000;
  const replenishTimer = setInterval(async () => {
    try {
      await cleanupDead(container);
      await replenishPool(container);
    } catch (err) {
      logger.error("Hot pool tick failed", { error: (err as Error).message });
    }
  }, intervalMs);

  logger.info("Hot pool manager started");

  return {
    replenishTimer,
    stop: () => clearInterval(replenishTimer),
  };
}
