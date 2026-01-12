CREATE TYPE "public"."hold_type" AS ENUM('edge', 'sloper', 'pinch', 'sidepull', 'undercling', 'jug', 'crimp', 'pocket');--> statement-breakpoint
CREATE TABLE "user_hold_classifications" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"board_type" text NOT NULL,
	"layout_id" integer NOT NULL,
	"size_id" integer NOT NULL,
	"hold_id" integer NOT NULL,
	"hold_type" "hold_type",
	"difficulty_rating" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "user_hold_classifications" ADD CONSTRAINT "user_hold_classifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_hold_classifications_user_board_idx" ON "user_hold_classifications" USING btree ("user_id","board_type","layout_id","size_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_hold_classifications_unique_idx" ON "user_hold_classifications" USING btree ("user_id","board_type","layout_id","size_id","hold_id");--> statement-breakpoint
CREATE INDEX "user_hold_classifications_hold_idx" ON "user_hold_classifications" USING btree ("board_type","hold_id");
