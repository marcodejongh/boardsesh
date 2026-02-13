CREATE TABLE IF NOT EXISTS "esp32_controllers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"api_key" varchar(64) NOT NULL,
	"name" varchar(100),
	"board_name" varchar(20) NOT NULL,
	"layout_id" integer NOT NULL,
	"size_id" integer NOT NULL,
	"set_ids" varchar(100) NOT NULL,
	"authorized_session_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_seen_at" timestamp,
	CONSTRAINT "esp32_controllers_api_key_unique" UNIQUE("api_key")
);
--> statement-breakpoint
DROP INDEX IF EXISTS "board_climbs_holds_hash_idx";--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'esp32_controllers'::regclass AND contype = 'f'
  ) THEN
    ALTER TABLE "esp32_controllers" ADD CONSTRAINT "esp32_controllers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "esp32_controllers_user_idx" ON "esp32_controllers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "esp32_controllers_api_key_idx" ON "esp32_controllers" USING btree ("api_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "esp32_controllers_session_idx" ON "esp32_controllers" USING btree ("authorized_session_id");--> statement-breakpoint
ALTER TABLE "board_climbs" DROP COLUMN IF EXISTS "holds_hash";