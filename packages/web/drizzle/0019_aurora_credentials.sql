CREATE TABLE "aurora_credentials" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"board_type" text NOT NULL,
	"encrypted_username" text NOT NULL,
	"encrypted_password" text NOT NULL,
	"aurora_user_id" integer,
	"aurora_token" text,
	"last_sync_at" timestamp,
	"sync_status" text DEFAULT 'pending' NOT NULL,
	"sync_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "aurora_credentials" ADD CONSTRAINT "aurora_credentials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_user_board_credential" ON "aurora_credentials" USING btree ("user_id","board_type");--> statement-breakpoint
CREATE INDEX "aurora_credentials_user_idx" ON "aurora_credentials" USING btree ("user_id");
