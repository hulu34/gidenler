CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"actor" text NOT NULL,
	"action" text NOT NULL,
	"ref_table" text,
	"ref_id" text,
	"detail" jsonb,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_accounts" (
	"place_id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text,
	"claimed_at" timestamp with time zone,
	"subscription" text DEFAULT 'none' NOT NULL,
	"reservation_partner" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creator_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"creator_id" text NOT NULL,
	"platform" text NOT NULL,
	"handle" text NOT NULL,
	"verified_method" text,
	"verified_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "creators" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"display_name" text NOT NULL,
	"bio" text,
	"status" text DEFAULT 'unclaimed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dish_media" (
	"media_id" text NOT NULL,
	"dish_id" text NOT NULL,
	"place_id" text,
	CONSTRAINT "dish_media_media_id_dish_id_pk" PRIMARY KEY("media_id","dish_id")
);
--> statement-breakpoint
CREATE TABLE "dishes" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"aliases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"cuisine" text,
	"parent_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dishes_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "field_provenance" (
	"id" text PRIMARY KEY NOT NULL,
	"place_id" text NOT NULL,
	"field" text NOT NULL,
	"value" text,
	"provider" text NOT NULL,
	"license" text,
	"fetched_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone,
	"confidence" double precision
);
--> statement-breakpoint
CREATE TABLE "follows" (
	"follower_id" text NOT NULL,
	"followee_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "follows_follower_id_followee_id_pk" PRIMARY KEY("follower_id","followee_id")
);
--> statement-breakpoint
CREATE TABLE "list_items" (
	"id" text PRIMARY KEY NOT NULL,
	"list_id" text NOT NULL,
	"place_id" text,
	"dish_id" text,
	"position" integer DEFAULT 0 NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lists" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text,
	"title" text NOT NULL,
	"description" text,
	"kind" text DEFAULT 'user' NOT NULL,
	"visibility" text DEFAULT 'private' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_items" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"platform" text NOT NULL,
	"url" text NOT NULL,
	"external_id" text,
	"storage_class" text NOT NULL,
	"category" text,
	"creator_id" text,
	"credit" text,
	"license" text,
	"sponsored" boolean DEFAULT false NOT NULL,
	"source" text NOT NULL,
	"submitted_by" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"last_checked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_places" (
	"media_id" text NOT NULL,
	"place_id" text NOT NULL,
	"at_second" integer,
	CONSTRAINT "media_places_media_id_place_id_pk" PRIMARY KEY("media_id","place_id")
);
--> statement-breakpoint
CREATE TABLE "menu_items" (
	"id" text PRIMARY KEY NOT NULL,
	"place_id" text NOT NULL,
	"dish_id" text,
	"raw_name" text NOT NULL,
	"description" text,
	"price_minor" integer,
	"currency" text DEFAULT 'TRY',
	"section" text,
	"source" text NOT NULL,
	"source_url" text,
	"valid_at" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moderation_queue" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"ref_table" text NOT NULL,
	"ref_id" text NOT NULL,
	"reason" text,
	"status" text DEFAULT 'open' NOT NULL,
	"decided_by" text,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "place_dishes" (
	"place_id" text NOT NULL,
	"dish_id" text NOT NULL,
	"signature" boolean DEFAULT false NOT NULL,
	"mention_count" integer DEFAULT 0 NOT NULL,
	"dish_score" double precision,
	"source" text NOT NULL,
	"source_url" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "place_dishes_place_id_dish_id_pk" PRIMARY KEY("place_id","dish_id")
);
--> statement-breakpoint
CREATE TABLE "place_identifiers" (
	"id" text PRIMARY KEY NOT NULL,
	"place_id" text NOT NULL,
	"provider" text NOT NULL,
	"external_id" text NOT NULL,
	"match_score" double precision,
	"match_method" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"verified_by" text,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "places" (
	"id" text PRIMARY KEY NOT NULL,
	"legacy_id" text,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"vertical" text NOT NULL,
	"category_id" text NOT NULL,
	"subcategory" text,
	"city" text NOT NULL,
	"district" text,
	"neighborhood" text,
	"lat" double precision,
	"lng" double precision,
	"address" text,
	"phone" text,
	"website" text,
	"instagram" text,
	"opening_hours" text,
	"status" text DEFAULT 'active' NOT NULL,
	"is_pilot" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "places_legacy_id_unique" UNIQUE("legacy_id"),
	CONSTRAINT "places_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "ranking_entries" (
	"ranking_id" text NOT NULL,
	"place_id" text NOT NULL,
	"rank" integer NOT NULL,
	"score_snapshot" double precision,
	CONSTRAINT "ranking_entries_ranking_id_place_id_pk" PRIMARY KEY("ranking_id","place_id")
);
--> statement-breakpoint
CREATE TABLE "rankings" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"scope" jsonb NOT NULL,
	"algorithm_version" text NOT NULL,
	"min_eligible" jsonb NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rankings_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "rating_history" (
	"id" text PRIMARY KEY NOT NULL,
	"place_id" text NOT NULL,
	"computed_at" timestamp with time zone NOT NULL,
	"algorithm_version" text NOT NULL,
	"score" double precision,
	"review_count" integer NOT NULL,
	"verified_count" integer NOT NULL,
	"confidence" text NOT NULL,
	"components" jsonb
);
--> statement-breakpoint
CREATE TABLE "review_dishes" (
	"review_id" text NOT NULL,
	"dish_id" text NOT NULL,
	"rating" smallint,
	CONSTRAINT "review_dishes_review_id_dish_id_pk" PRIMARY KEY("review_id","dish_id")
);
--> statement-breakpoint
CREATE TABLE "reviewer_expertise" (
	"user_id" text NOT NULL,
	"scope_type" text NOT NULL,
	"scope_id" text NOT NULL,
	"level" smallint DEFAULT 0 NOT NULL,
	"weight" double precision DEFAULT 1 NOT NULL,
	"review_count" integer DEFAULT 0 NOT NULL,
	"algorithm_version" text NOT NULL,
	"computed_at" timestamp with time zone NOT NULL,
	CONSTRAINT "reviewer_expertise_user_id_scope_type_scope_id_pk" PRIMARY KEY("user_id","scope_type","scope_id")
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"place_id" text NOT NULL,
	"user_id" text NOT NULL,
	"visited_on" date NOT NULL,
	"visit_no" integer DEFAULT 1 NOT NULL,
	"meal" text,
	"price_per_person" integer,
	"overall" double precision NOT NULL,
	"ratings" jsonb NOT NULL,
	"body" text NOT NULL,
	"return_intent" text,
	"disclosure" text DEFAULT 'none' NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	"trust" text DEFAULT 'recommended' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "sponsored_placements" (
	"id" text PRIMARY KEY NOT NULL,
	"place_id" text NOT NULL,
	"surface" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"handle" text,
	"kind" text DEFAULT 'user' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_handle_unique" UNIQUE("handle")
);
--> statement-breakpoint
CREATE TABLE "user_place_status" (
	"user_id" text NOT NULL,
	"place_id" text NOT NULL,
	"want_to_go" boolean DEFAULT false NOT NULL,
	"visited" boolean DEFAULT false NOT NULL,
	"favorite" boolean DEFAULT false NOT NULL,
	"visit_count" integer DEFAULT 0 NOT NULL,
	"last_visited_on" date,
	"verification_id" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_place_status_user_id_place_id_pk" PRIMARY KEY("user_id","place_id")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vertical_restaurant" (
	"place_id" text PRIMARY KEY NOT NULL,
	"lunch_min" integer,
	"lunch_max" integer,
	"dinner_min" integer,
	"dinner_max" integer,
	"price_basis" text,
	"amenities" jsonb,
	"reservation_mode" text DEFAULT 'contact' NOT NULL,
	"reservation_config" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visit_verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"place_id" text NOT NULL,
	"review_id" text,
	"signals" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"level" text DEFAULT 'none' NOT NULL,
	"confidence" double precision DEFAULT 0 NOT NULL,
	"flags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_accounts" ADD CONSTRAINT "business_accounts_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_accounts" ADD CONSTRAINT "business_accounts_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_accounts" ADD CONSTRAINT "creator_accounts_creator_id_creators_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creators"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creators" ADD CONSTRAINT "creators_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dish_media" ADD CONSTRAINT "dish_media_media_id_media_items_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dish_media" ADD CONSTRAINT "dish_media_dish_id_dishes_id_fk" FOREIGN KEY ("dish_id") REFERENCES "public"."dishes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dish_media" ADD CONSTRAINT "dish_media_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_provenance" ADD CONSTRAINT "field_provenance_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_user_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_followee_id_user_id_fk" FOREIGN KEY ("followee_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "list_items" ADD CONSTRAINT "list_items_list_id_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "list_items" ADD CONSTRAINT "list_items_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "list_items" ADD CONSTRAINT "list_items_dish_id_dishes_id_fk" FOREIGN KEY ("dish_id") REFERENCES "public"."dishes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lists" ADD CONSTRAINT "lists_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_items" ADD CONSTRAINT "media_items_creator_id_creators_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creators"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_items" ADD CONSTRAINT "media_items_submitted_by_user_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_places" ADD CONSTRAINT "media_places_media_id_media_items_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_places" ADD CONSTRAINT "media_places_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_dish_id_dishes_id_fk" FOREIGN KEY ("dish_id") REFERENCES "public"."dishes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "place_dishes" ADD CONSTRAINT "place_dishes_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "place_dishes" ADD CONSTRAINT "place_dishes_dish_id_dishes_id_fk" FOREIGN KEY ("dish_id") REFERENCES "public"."dishes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "place_identifiers" ADD CONSTRAINT "place_identifiers_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ranking_entries" ADD CONSTRAINT "ranking_entries_ranking_id_rankings_id_fk" FOREIGN KEY ("ranking_id") REFERENCES "public"."rankings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ranking_entries" ADD CONSTRAINT "ranking_entries_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating_history" ADD CONSTRAINT "rating_history_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_dishes" ADD CONSTRAINT "review_dishes_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_dishes" ADD CONSTRAINT "review_dishes_dish_id_dishes_id_fk" FOREIGN KEY ("dish_id") REFERENCES "public"."dishes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviewer_expertise" ADD CONSTRAINT "reviewer_expertise_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsored_placements" ADD CONSTRAINT "sponsored_placements_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_place_status" ADD CONSTRAINT "user_place_status_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_place_status" ADD CONSTRAINT "user_place_status_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vertical_restaurant" ADD CONSTRAINT "vertical_restaurant_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_verifications" ADD CONSTRAINT "visit_verifications_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_verifications" ADD CONSTRAINT "visit_verifications_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_verifications" ADD CONSTRAINT "visit_verifications_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "creator_accounts_platform_handle_uq" ON "creator_accounts" USING btree ("platform","handle");--> statement-breakpoint
CREATE INDEX "dish_media_dish_idx" ON "dish_media" USING btree ("dish_id");--> statement-breakpoint
CREATE INDEX "field_provenance_place_idx" ON "field_provenance" USING btree ("place_id","field");--> statement-breakpoint
CREATE INDEX "follows_followee_idx" ON "follows" USING btree ("followee_id");--> statement-breakpoint
CREATE INDEX "list_items_list_idx" ON "list_items" USING btree ("list_id");--> statement-breakpoint
CREATE INDEX "list_items_place_idx" ON "list_items" USING btree ("place_id");--> statement-breakpoint
CREATE INDEX "lists_owner_idx" ON "lists" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "media_items_url_uq" ON "media_items" USING btree ("url");--> statement-breakpoint
CREATE INDEX "media_items_creator_idx" ON "media_items" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "media_places_place_idx" ON "media_places" USING btree ("place_id");--> statement-breakpoint
CREATE INDEX "menu_items_place_idx" ON "menu_items" USING btree ("place_id");--> statement-breakpoint
CREATE INDEX "menu_items_dish_idx" ON "menu_items" USING btree ("dish_id");--> statement-breakpoint
CREATE INDEX "moderation_queue_status_idx" ON "moderation_queue" USING btree ("status","kind");--> statement-breakpoint
CREATE INDEX "place_dishes_dish_idx" ON "place_dishes" USING btree ("dish_id");--> statement-breakpoint
CREATE UNIQUE INDEX "place_identifiers_place_provider_ext_uq" ON "place_identifiers" USING btree ("place_id","provider","external_id");--> statement-breakpoint
CREATE INDEX "place_identifiers_provider_ext_idx" ON "place_identifiers" USING btree ("provider","external_id");--> statement-breakpoint
CREATE INDEX "places_city_district_idx" ON "places" USING btree ("city","district");--> statement-breakpoint
CREATE INDEX "places_category_idx" ON "places" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "rating_history_place_time_idx" ON "rating_history" USING btree ("place_id","computed_at");--> statement-breakpoint
CREATE INDEX "review_dishes_dish_idx" ON "review_dishes" USING btree ("dish_id");--> statement-breakpoint
CREATE INDEX "reviews_place_idx" ON "reviews" USING btree ("place_id","status");--> statement-breakpoint
CREATE INDEX "reviews_user_idx" ON "reviews" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_user_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_place_status_place_idx" ON "user_place_status" USING btree ("place_id");--> statement-breakpoint
CREATE INDEX "visit_verifications_user_place_idx" ON "visit_verifications" USING btree ("user_id","place_id");