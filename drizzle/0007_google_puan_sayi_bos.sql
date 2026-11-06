ALTER TABLE "google_rating_history" ALTER COLUMN "review_count" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "google_ratings" ALTER COLUMN "review_count" DROP NOT NULL;