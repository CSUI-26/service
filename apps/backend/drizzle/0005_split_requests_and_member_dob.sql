ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "date_of_birth" date;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "content_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"author_npm" text NOT NULL,
	"content_type" text DEFAULT 'achievement' NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"image" jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" integer DEFAULT extract(epoch from now())::int NOT NULL,
	"updated_at" integer DEFAULT extract(epoch from now())::int NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "content_request_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" integer NOT NULL,
	"author_npm" text NOT NULL,
	"author_role" text DEFAULT 'user' NOT NULL,
	"body" text NOT NULL,
	"image" jsonb,
	"created_at" integer DEFAULT extract(epoch from now())::int NOT NULL,
	"updated_at" integer DEFAULT extract(epoch from now())::int NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "feedback_threads" (
	"id" serial PRIMARY KEY NOT NULL,
	"author_npm" text NOT NULL,
	"category" text DEFAULT 'feedback' NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"image" jsonb,
	"external_url" text,
	"created_at" integer DEFAULT extract(epoch from now())::int NOT NULL,
	"updated_at" integer DEFAULT extract(epoch from now())::int NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "feedback_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"thread_id" integer NOT NULL,
	"author_npm" text NOT NULL,
	"author_role" text DEFAULT 'user' NOT NULL,
	"body" text NOT NULL,
	"image" jsonb,
	"created_at" integer DEFAULT extract(epoch from now())::int NOT NULL,
	"updated_at" integer DEFAULT extract(epoch from now())::int NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "content_requests" ADD CONSTRAINT "content_requests_author_npm_members_npm_fk" FOREIGN KEY ("author_npm") REFERENCES "public"."members"("npm") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "content_request_messages" ADD CONSTRAINT "content_request_messages_request_id_content_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."content_requests"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "content_request_messages" ADD CONSTRAINT "content_request_messages_author_npm_members_npm_fk" FOREIGN KEY ("author_npm") REFERENCES "public"."members"("npm") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "feedback_threads" ADD CONSTRAINT "feedback_threads_author_npm_members_npm_fk" FOREIGN KEY ("author_npm") REFERENCES "public"."members"("npm") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "feedback_messages" ADD CONSTRAINT "feedback_messages_thread_id_feedback_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."feedback_threads"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "feedback_messages" ADD CONSTRAINT "feedback_messages_author_npm_members_npm_fk" FOREIGN KEY ("author_npm") REFERENCES "public"."members"("npm") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_content_requests_author" ON "content_requests" USING btree ("author_npm");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_content_requests_status" ON "content_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_content_requests_type" ON "content_requests" USING btree ("content_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_content_requests_updated_at" ON "content_requests" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_content_request_messages_request" ON "content_request_messages" USING btree ("request_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_content_request_messages_author" ON "content_request_messages" USING btree ("author_npm");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_feedback_threads_author" ON "feedback_threads" USING btree ("author_npm");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_feedback_threads_status" ON "feedback_threads" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_feedback_threads_category" ON "feedback_threads" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_feedback_threads_updated_at" ON "feedback_threads" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_feedback_messages_thread" ON "feedback_messages" USING btree ("thread_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_feedback_messages_author" ON "feedback_messages" USING btree ("author_npm");
--> statement-breakpoint
DO $$ BEGIN
 IF to_regclass('public.request_threads') IS NOT NULL THEN
  INSERT INTO "content_requests" ("id", "author_npm", "content_type", "title", "description", "status", "image", "metadata", "created_at", "updated_at")
  SELECT
   rt."id",
   rt."author_npm",
   CASE
    WHEN rt."metadata"->>'contentType' IN ('achievement', 'gallery', 'activity', 'other')
     THEN rt."metadata"->>'contentType'
    ELSE 'other'
   END,
   rt."title",
   rt."description",
   rt."status",
   rt."image",
   COALESCE(rt."metadata", '{}'::jsonb) - 'contentType',
   rt."created_at",
   rt."updated_at"
  FROM "request_threads" rt
  WHERE rt."category" = 'content'
  ON CONFLICT ("id") DO NOTHING;

  INSERT INTO "feedback_threads" ("id", "author_npm", "category", "title", "description", "status", "image", "external_url", "created_at", "updated_at")
  SELECT
   rt."id",
   rt."author_npm",
   CASE
    WHEN rt."category" IN ('feedback', 'help', 'other') THEN rt."category"
    ELSE 'other'
   END,
   rt."title",
   rt."description",
   rt."status",
   rt."image",
   NULLIF(rt."metadata"->>'externalUrl', ''),
   rt."created_at",
   rt."updated_at"
  FROM "request_threads" rt
  WHERE rt."category" <> 'content'
  ON CONFLICT ("id") DO NOTHING;

  IF to_regclass('public.request_messages') IS NOT NULL THEN
   INSERT INTO "content_request_messages" ("id", "request_id", "author_npm", "author_role", "body", "image", "created_at", "updated_at")
   SELECT rm."id", rm."thread_id", rm."author_npm", rm."author_role", rm."body", rm."image", rm."created_at", rm."updated_at"
   FROM "request_messages" rm
   INNER JOIN "content_requests" cr ON cr."id" = rm."thread_id"
   ON CONFLICT ("id") DO NOTHING;

   INSERT INTO "feedback_messages" ("id", "thread_id", "author_npm", "author_role", "body", "image", "created_at", "updated_at")
   SELECT rm."id", rm."thread_id", rm."author_npm", rm."author_role", rm."body", rm."image", rm."created_at", rm."updated_at"
   FROM "request_messages" rm
   INNER JOIN "feedback_threads" ft ON ft."id" = rm."thread_id"
   ON CONFLICT ("id") DO NOTHING;
  END IF;
 END IF;

 PERFORM setval(pg_get_serial_sequence('content_requests', 'id'), COALESCE((SELECT MAX("id") FROM "content_requests"), 1), COALESCE((SELECT MAX("id") IS NOT NULL FROM "content_requests"), false));
 PERFORM setval(pg_get_serial_sequence('content_request_messages', 'id'), COALESCE((SELECT MAX("id") FROM "content_request_messages"), 1), COALESCE((SELECT MAX("id") IS NOT NULL FROM "content_request_messages"), false));
 PERFORM setval(pg_get_serial_sequence('feedback_threads', 'id'), COALESCE((SELECT MAX("id") FROM "feedback_threads"), 1), COALESCE((SELECT MAX("id") IS NOT NULL FROM "feedback_threads"), false));
 PERFORM setval(pg_get_serial_sequence('feedback_messages', 'id'), COALESCE((SELECT MAX("id") FROM "feedback_messages"), 1), COALESCE((SELECT MAX("id") IS NOT NULL FROM "feedback_messages"), false));
END $$;
--> statement-breakpoint
DROP TABLE IF EXISTS "request_messages";
--> statement-breakpoint
DROP TABLE IF EXISTS "request_threads";
