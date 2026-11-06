CREATE TABLE "google_rating_decisions" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"place_id" text NOT NULL,
	"decision" text NOT NULL,
	"note" text NOT NULL,
	"evidence" jsonb,
	"actor" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "google_ratings" ADD COLUMN "hidden_reason" text;--> statement-breakpoint
CREATE INDEX "google_rating_decisions_slug_idx" ON "google_rating_decisions" USING btree ("slug","created_at");