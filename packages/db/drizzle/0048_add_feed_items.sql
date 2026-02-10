DO $$ BEGIN
  CREATE TYPE "public"."feed_item_type" AS ENUM('ascent', 'new_climb', 'comment', 'proposal_approved');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "feed_items" (
  "id" bigserial PRIMARY KEY NOT NULL,
  "recipient_id" text NOT NULL,
  "actor_id" text,
  "type" "feed_item_type" NOT NULL,
  "entity_type" "social_entity_type" NOT NULL,
  "entity_id" text NOT NULL,
  "board_uuid" text,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "feed_items" ADD CONSTRAINT "feed_items_recipient_id_user_fkey" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "feed_items" ADD CONSTRAINT "feed_items_actor_id_user_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feed_items_recipient_created_at_idx" ON "feed_items" USING btree ("recipient_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feed_items_recipient_board_created_at_idx" ON "feed_items" USING btree ("recipient_id", "board_uuid", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feed_items_actor_created_at_idx" ON "feed_items" USING btree ("actor_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feed_items_created_at_idx" ON "feed_items" USING btree ("created_at");
