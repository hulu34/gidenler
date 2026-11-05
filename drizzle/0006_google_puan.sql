CREATE TABLE "google_rating_files" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"run" text,
	"sha256" text NOT NULL,
	"size" integer NOT NULL,
	"rows" integer NOT NULL,
	"data" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "google_rating_history" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"rating" double precision NOT NULL,
	"review_count" integer NOT NULL,
	"checked_at" timestamp with time zone NOT NULL,
	"source" text NOT NULL,
	"import_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "google_rating_imports" (
	"id" text PRIMARY KEY NOT NULL,
	"file_id" text NOT NULL,
	"actor" text NOT NULL,
	"status" text NOT NULL,
	"detail" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "google_rating_lock" (
	"name" text PRIMARY KEY NOT NULL,
	"holder" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "google_ratings" (
	"slug" text PRIMARY KEY NOT NULL,
	"place_id" text NOT NULL,
	"rating" double precision NOT NULL,
	"review_count" integer NOT NULL,
	"maps_url" text,
	"checked_at" timestamp with time zone NOT NULL,
	"source" text NOT NULL,
	"confidence" text NOT NULL,
	"import_id" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "google_rating_files_created_idx" ON "google_rating_files" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "google_rating_history_slug_idx" ON "google_rating_history" USING btree ("slug","checked_at");