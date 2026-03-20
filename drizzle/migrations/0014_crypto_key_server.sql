-- Crypto Key Server schema additions.
-- Adds atomic derivation counter + path registry + address log.

-- 1. Add network column to payment_methods (parallel to chain)
ALTER TABLE "payment_methods" ADD COLUMN "network" text NOT NULL DEFAULT 'mainnet';
--> statement-breakpoint

-- 2. Add next_index atomic counter to payment_methods
ALTER TABLE "payment_methods" ADD COLUMN "next_index" integer NOT NULL DEFAULT 0;
--> statement-breakpoint

-- 3. BIP-44 path allocation registry
CREATE TABLE IF NOT EXISTS "path_allocations" (
  "coin_type" integer NOT NULL,
  "account_index" integer NOT NULL,
  "chain_id" text REFERENCES "payment_methods"("id"),
  "xpub" text NOT NULL,
  "allocated_at" text NOT NULL DEFAULT (now()),
  CONSTRAINT "path_allocations_pkey" PRIMARY KEY("coin_type","account_index")
);
--> statement-breakpoint

-- 4. Immutable derived address log
CREATE TABLE IF NOT EXISTS "derived_addresses" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "chain_id" text NOT NULL REFERENCES "payment_methods"("id"),
  "derivation_index" integer NOT NULL,
  "address" text NOT NULL UNIQUE,
  "tenant_id" text,
  "created_at" text NOT NULL DEFAULT (now())
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_derived_addresses_chain" ON "derived_addresses" ("chain_id");
