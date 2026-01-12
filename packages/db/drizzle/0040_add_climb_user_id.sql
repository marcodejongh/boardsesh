-- Add user_id column to board_climbs table for tracking local climb creators
ALTER TABLE "board_climbs" ADD COLUMN "user_id" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "board_climbs" ADD CONSTRAINT "board_climbs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
