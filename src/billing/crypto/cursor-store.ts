import { and, eq, sql } from "drizzle-orm";
import type { PlatformDb } from "../../db/index.js";
import { watcherCursors, watcherProcessed } from "../../db/schema/crypto.js";

export interface IWatcherCursorStore {
  /** Get persisted block cursor for a watcher. */
  get(watcherId: string): Promise<number | null>;
  /** Save block cursor after processing a range. */
  save(watcherId: string, cursorBlock: number): Promise<void>;
  /** Check if a specific tx has been processed (for watchers without block cursors). */
  hasProcessedTx(watcherId: string, txId: string): Promise<boolean>;
  /** Mark a tx as processed (for watchers without block cursors). */
  markProcessedTx(watcherId: string, txId: string): Promise<void>;
}

/**
 * Persists watcher state to PostgreSQL.
 *
 * Two patterns:
 *   - Block cursor (EVM watchers): save/get cursor block number
 *   - Processed txids (BTC watcher): hasProcessedTx/markProcessedTx
 *
 * Eliminates all in-memory watcher state. Clean restart recovery.
 */
export class DrizzleWatcherCursorStore implements IWatcherCursorStore {
  constructor(private readonly db: PlatformDb) {}

  async get(watcherId: string): Promise<number | null> {
    const row = (
      await this.db
        .select({ cursorBlock: watcherCursors.cursorBlock })
        .from(watcherCursors)
        .where(eq(watcherCursors.watcherId, watcherId))
    )[0];
    return row?.cursorBlock ?? null;
  }

  async save(watcherId: string, cursorBlock: number): Promise<void> {
    await this.db
      .insert(watcherCursors)
      .values({ watcherId, cursorBlock })
      .onConflictDoUpdate({
        target: watcherCursors.watcherId,
        set: { cursorBlock, updatedAt: sql`(now())` },
      });
  }

  async hasProcessedTx(watcherId: string, txId: string): Promise<boolean> {
    const row = (
      await this.db
        .select({ txId: watcherProcessed.txId })
        .from(watcherProcessed)
        .where(and(eq(watcherProcessed.watcherId, watcherId), eq(watcherProcessed.txId, txId)))
    )[0];
    return row !== undefined;
  }

  async markProcessedTx(watcherId: string, txId: string): Promise<void> {
    await this.db.insert(watcherProcessed).values({ watcherId, txId }).onConflictDoNothing();
  }
}
