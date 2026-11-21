CREATE TABLE IF NOT EXISTS "gallery_items" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"alt" text NOT NULL,
	"category" text DEFAULT 'photo' NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"image" jsonb NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" integer DEFAULT extract(epoch from now())::int NOT NULL,
	"updated_at" integer DEFAULT extract(epoch from now())::int NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_gallery_items_category" ON "gallery_items" USING btree ("category");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_gallery_items_featured" ON "gallery_items" USING btree ("is_featured");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_gallery_items_position" ON "gallery_items" USING btree ("position");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "activities" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"date" text,
	"description" text NOT NULL,
	"image" jsonb NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" integer DEFAULT extract(epoch from now())::int NOT NULL,
	"updated_at" integer DEFAULT extract(epoch from now())::int NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_activities_position" ON "activities" USING btree ("position");
