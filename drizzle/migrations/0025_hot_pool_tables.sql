-- Hot pool: pre-provisioned warm containers for instant claiming
CREATE TABLE IF NOT EXISTS "pool_config" (
  "id" integer PRIMARY KEY DEFAULT 1,
  "pool_size" integer NOT NULL DEFAULT 2
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "pool_instances" (
  "id" text PRIMARY KEY,
  "container_id" text NOT NULL,
  "status" text NOT NULL DEFAULT 'warm',
  "tenant_id" text,
  "name" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "claimed_at" timestamp
);
--> statement-breakpoint

-- Seed default pool config
INSERT INTO "pool_config" ("id", "pool_size") VALUES (1, 2)
  ON CONFLICT ("id") DO NOTHING;
