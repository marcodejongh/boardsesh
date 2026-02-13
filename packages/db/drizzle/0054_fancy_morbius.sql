CREATE TYPE "public"."gym_member_role" AS ENUM('admin', 'member');--> statement-breakpoint
ALTER TYPE "public"."social_entity_type" ADD VALUE 'gym';--> statement-breakpoint
CREATE TABLE "gym_follows" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"gym_id" bigint NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gym_members" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"gym_id" bigint NOT NULL,
	"user_id" text NOT NULL,
	"role" "gym_member_role" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gyms" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"uuid" text NOT NULL,
	"name" text NOT NULL,
	"slug" text,
	"owner_id" text NOT NULL,
	"address" text,
	"contact_email" text,
	"contact_phone" text,
	"latitude" double precision,
	"longitude" double precision,
	"is_public" boolean DEFAULT true NOT NULL,
	"description" text,
	"image_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "gyms_uuid_unique" UNIQUE("uuid")
);
--> statement-breakpoint
ALTER TABLE "user_boards" ADD COLUMN "gym_id" bigint;--> statement-breakpoint
ALTER TABLE "gym_follows" ADD CONSTRAINT "gym_follows_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gym_follows" ADD CONSTRAINT "gym_follows_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gym_members" ADD CONSTRAINT "gym_members_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gym_members" ADD CONSTRAINT "gym_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gyms" ADD CONSTRAINT "gyms_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "gym_follows_unique_gym_user" ON "gym_follows" USING btree ("gym_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "gym_members_unique_gym_user" ON "gym_members" USING btree ("gym_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "gyms_unique_slug" ON "gyms" USING btree ("slug") WHERE "gyms"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "gyms_uuid_idx" ON "gyms" USING btree ("uuid");--> statement-breakpoint
CREATE INDEX "gyms_owner_idx" ON "gyms" USING btree ("owner_id") WHERE "gyms"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "gyms_public_idx" ON "gyms" USING btree ("is_public") WHERE "gyms"."deleted_at" IS NULL;--> statement-breakpoint
ALTER TABLE "user_boards" ADD CONSTRAINT "user_boards_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_boards_gym_idx" ON "user_boards" USING btree ("gym_id");--> statement-breakpoint
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS location geography(Point, 4326);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS gyms_location_idx ON gyms USING GIST (location) WHERE deleted_at IS NULL AND is_public = true;