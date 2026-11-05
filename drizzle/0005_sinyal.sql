CREATE TABLE "signal_events" (
	"day" text NOT NULL,
	"slug" text NOT NULL,
	"kind" text NOT NULL,
	"visitor" text NOT NULL,
	CONSTRAINT "signal_events_day_slug_kind_visitor_pk" PRIMARY KEY("day","slug","kind","visitor")
);
--> statement-breakpoint
CREATE INDEX "signal_events_day_idx" ON "signal_events" USING btree ("day");