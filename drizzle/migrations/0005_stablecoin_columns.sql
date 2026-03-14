ALTER TABLE "crypto_charges" ADD COLUMN "chain" text;--> statement-breakpoint
ALTER TABLE "crypto_charges" ADD COLUMN "token" text;--> statement-breakpoint
ALTER TABLE "crypto_charges" ADD COLUMN "deposit_address" text;--> statement-breakpoint
ALTER TABLE "crypto_charges" ADD COLUMN "derivation_index" integer;--> statement-breakpoint
CREATE INDEX "idx_crypto_charges_deposit_address" ON "crypto_charges" USING btree ("deposit_address");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_crypto_charges_deposit_address" ON "crypto_charges" ("deposit_address") WHERE "deposit_address" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_crypto_charges_derivation_index" ON "crypto_charges" ("derivation_index") WHERE "derivation_index" IS NOT NULL;
