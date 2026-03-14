ALTER TABLE "organization_invites" ADD COLUMN "accepted_at" bigint;--> statement-breakpoint
ALTER TABLE "organization_invites" ADD COLUMN "revoked_at" bigint;