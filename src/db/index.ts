import { drizzle } from "drizzle-orm/node-postgres";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type { Pool } from "pg";
import * as schema from "./schema/index.js";

/** The platform schema type (subset of the full application schema). */
export type PlatformSchema = typeof schema;

/**
 * Narrower DB type used by platform-core repositories.
 * wopr-platform's full DrizzleDb (wider schema) satisfies this constraint.
 */
export type PlatformDb = PgDatabase<PgQueryResultHKT, PlatformSchema>;

/** Create a Drizzle database instance wrapping the given pg.Pool. */
export function createDb(pool: Pool): PlatformDb {
  return drizzle(pool, { schema }) as unknown as PlatformDb;
}

export { schema };
