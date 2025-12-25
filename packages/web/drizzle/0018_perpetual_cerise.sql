CREATE TABLE "user_favorites" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"board_name" text NOT NULL,
	"climb_uuid" text NOT NULL,
	"angle" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_user_favorite" ON "user_favorites" USING btree ("user_id","board_name","climb_uuid","angle");--> statement-breakpoint
CREATE INDEX "user_favorites_user_idx" ON "user_favorites" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_favorites_climb_idx" ON "user_favorites" USING btree ("board_name","climb_uuid","angle");