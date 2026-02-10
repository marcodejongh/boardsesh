DO $$ BEGIN
  CREATE TYPE "public"."notification_type" AS ENUM('new_follower', 'comment_reply', 'comment_on_tick', 'comment_on_climb', 'vote_on_tick', 'vote_on_comment', 'new_climb', 'new_climb_global', 'proposal_approved', 'proposal_rejected', 'proposal_vote');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" bigserial PRIMARY KEY NOT NULL,
  "uuid" text NOT NULL UNIQUE,
  "recipient_id" text NOT NULL,
  "actor_id" text,
  "type" "notification_type" NOT NULL,
  "entity_type" "social_entity_type",
  "entity_id" text,
  "comment_id" bigint,
  "read_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "notifications" ADD CONSTRAINT "notifications_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_recipient_unread_idx" ON "notifications" USING btree ("recipient_id","read_at","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_recipient_created_at_idx" ON "notifications" USING btree ("recipient_id","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_dedup_idx" ON "notifications" USING btree ("actor_id","recipient_id","type","entity_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_created_at_idx" ON "notifications" USING btree ("created_at");
