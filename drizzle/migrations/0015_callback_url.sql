-- Add callback_url to crypto_charges for webhook delivery.
ALTER TABLE "crypto_charges" ADD COLUMN "callback_url" text;
