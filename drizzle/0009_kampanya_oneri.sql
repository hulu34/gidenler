CREATE TABLE "campaign_events" (
	"day" text NOT NULL,
	"code" text NOT NULL,
	"step" text NOT NULL,
	"visitor" text NOT NULL,
	CONSTRAINT "campaign_events_day_code_step_visitor_pk" PRIMARY KEY("day","code","step","visitor")
);
--> statement-breakpoint
CREATE TABLE "venue_suggestions" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"name_key" text NOT NULL,
	"district" text NOT NULL,
	"location_note" text,
	"user_id" text,
	"requests" integer DEFAULT 1 NOT NULL,
	"candidates" jsonb NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"matched_slug" text,
	"decided_by" text,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "campaign_events_day_idx" ON "campaign_events" USING btree ("day");--> statement-breakpoint
CREATE INDEX "venue_suggestions_status_idx" ON "venue_suggestions" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "venue_suggestions_key_idx" ON "venue_suggestions" USING btree ("name_key","district");