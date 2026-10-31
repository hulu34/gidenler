CREATE TABLE "media_cleanup" (
	"key" text PRIMARY KEY NOT NULL,
	"media_id" text,
	"reason" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"done_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ops_counters" (
	"day" text NOT NULL,
	"key" text NOT NULL,
	"n" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "ops_counters_day_key_pk" PRIMARY KEY("day","key")
);
--> statement-breakpoint
CREATE INDEX "media_cleanup_open_idx" ON "media_cleanup" USING btree ("done_at","next_attempt_at");