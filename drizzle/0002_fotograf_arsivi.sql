CREATE TABLE "media_blobs" (
	"key" text PRIMARY KEY NOT NULL,
	"data" text NOT NULL,
	"content_type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "photo_assets" (
	"media_id" text PRIMARY KEY NOT NULL,
	"place_id" text NOT NULL,
	"review_id" text,
	"uploader_id" text,
	"sha256" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"bytes" integer NOT NULL,
	"storage_provider" text NOT NULL,
	"variants" jsonb NOT NULL,
	"rights_type" text NOT NULL,
	"rights_statement" text NOT NULL,
	"source_url" text,
	"reject_reason" text,
	"approved_at" timestamp with time zone,
	"approved_by" text,
	"cover_candidate" boolean DEFAULT false NOT NULL,
	"is_cover" boolean DEFAULT false NOT NULL,
	"focus" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_roles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"role" text NOT NULL,
	"granted_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "photo_assets" ADD CONSTRAINT "photo_assets_media_id_media_items_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photo_assets" ADD CONSTRAINT "photo_assets_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photo_assets" ADD CONSTRAINT "photo_assets_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photo_assets" ADD CONSTRAINT "photo_assets_uploader_id_user_id_fk" FOREIGN KEY ("uploader_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_roles" ADD CONSTRAINT "staff_roles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "photo_assets_place_sha_uq" ON "photo_assets" USING btree ("place_id","sha256");--> statement-breakpoint
CREATE INDEX "photo_assets_review_idx" ON "photo_assets" USING btree ("review_id");--> statement-breakpoint
CREATE INDEX "photo_assets_uploader_idx" ON "photo_assets" USING btree ("uploader_id");--> statement-breakpoint
CREATE INDEX "photo_assets_place_idx" ON "photo_assets" USING btree ("place_id");--> statement-breakpoint
CREATE UNIQUE INDEX "photo_assets_one_cover_uq" ON "photo_assets" USING btree ("place_id") WHERE "photo_assets"."is_cover";