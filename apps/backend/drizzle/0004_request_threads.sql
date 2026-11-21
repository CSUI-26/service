CREATE TABLE IF NOT EXISTS "request_threads" (
	"id" serial PRIMARY KEY NOT NULL,
	"author_npm" text NOT NULL,
	"category" text DEFAULT 'content' NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"image" jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" integer DEFAULT extract(epoch from now())::int NOT NULL,
	"updated_at" integer DEFAULT extract(epoch from now())::int NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "request_messages" (
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
 ALTER TABLE "request_threads" ADD CONSTRAINT "request_threads_author_npm_members_npm_fk" FOREIGN KEY ("author_npm") REFERENCES "public"."members"("npm") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "request_messages" ADD CONSTRAINT "request_messages_thread_id_request_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."request_threads"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "request_messages" ADD CONSTRAINT "request_messages_author_npm_members_npm_fk" FOREIGN KEY ("author_npm") REFERENCES "public"."members"("npm") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_request_threads_author" ON "request_threads" USING btree ("author_npm");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_request_threads_status" ON "request_threads" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_request_threads_category" ON "request_threads" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_request_threads_updated_at" ON "request_threads" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_request_messages_thread" ON "request_messages" USING btree ("thread_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_request_messages_author" ON "request_messages" USING btree ("author_npm");
