ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "category" text;
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "track" text;
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "unlocks" jsonb;
