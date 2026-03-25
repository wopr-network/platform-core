ALTER TABLE "product_billing_config" ADD COLUMN "smart_router_enabled" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "product_billing_config" ADD COLUMN "smart_router_tiers" jsonb DEFAULT '[]'::jsonb NOT NULL;
