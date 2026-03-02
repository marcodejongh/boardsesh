CREATE TABLE "board_session_participants" (
	"session_id" text NOT NULL,
	"user_id" text NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "board_session_participants" ADD CONSTRAINT "board_session_participants_session_id_board_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."board_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_session_participants" ADD CONSTRAINT "board_session_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "board_session_participants_session_user_idx" ON "board_session_participants" USING btree ("session_id","user_id");--> statement-breakpoint
CREATE INDEX "board_session_participants_session_idx" ON "board_session_participants" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "board_session_participants_user_idx" ON "board_session_participants" USING btree ("user_id");