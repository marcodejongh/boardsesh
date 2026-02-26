CREATE TABLE "session_member_overrides" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"user_id" text NOT NULL,
	"added_by_user_id" text NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "session_member_overrides_session_user_unique" UNIQUE("session_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "inferred_sessions" ADD COLUMN "name" text;--> statement-breakpoint
ALTER TABLE "inferred_sessions" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "boardsesh_ticks" ADD COLUMN "previous_inferred_session_id" text;--> statement-breakpoint
ALTER TABLE "session_member_overrides" ADD CONSTRAINT "session_member_overrides_session_id_inferred_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."inferred_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_member_overrides" ADD CONSTRAINT "session_member_overrides_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_member_overrides" ADD CONSTRAINT "session_member_overrides_added_by_user_id_users_id_fk" FOREIGN KEY ("added_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "session_member_overrides_session_idx" ON "session_member_overrides" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "session_member_overrides_user_idx" ON "session_member_overrides" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "boardsesh_ticks" ADD CONSTRAINT "boardsesh_ticks_previous_inferred_session_id_inferred_sessions_id_fk" FOREIGN KEY ("previous_inferred_session_id") REFERENCES "public"."inferred_sessions"("id") ON DELETE set null ON UPDATE no action;