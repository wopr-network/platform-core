-- Replace payram_charges with crypto_charges (BTCPay Server)
--> statement-breakpoint
DROP TABLE IF EXISTS "payram_charges";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crypto_charges" (
	"reference_id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"amount_usd_cents" integer NOT NULL,
	"status" text DEFAULT 'New' NOT NULL,
	"currency" text,
	"filled_amount" text,
	"created_at" text DEFAULT (now()) NOT NULL,
	"updated_at" text DEFAULT (now()) NOT NULL,
	"credited_at" text
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_crypto_charges_tenant" ON "crypto_charges" USING btree ("tenant_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_crypto_charges_status" ON "crypto_charges" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_crypto_charges_created" ON "crypto_charges" USING btree ("created_at");
