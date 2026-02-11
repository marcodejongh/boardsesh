-- Safe migration for new climb subscriptions

CREATE TABLE IF NOT EXISTS "new_climb_subscriptions" (
    "id" bigserial PRIMARY KEY,
    "user_id" text NOT NULL,
    "board_type" text NOT NULL,
    "layout_id" integer NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "new_climb_subscriptions_user_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "new_climb_subscriptions_unique_user_board_layout"
    ON "new_climb_subscriptions" ("user_id", "board_type", "layout_id");

CREATE INDEX IF NOT EXISTS "new_climb_subscriptions_user_idx"
    ON "new_climb_subscriptions" ("user_id");

CREATE INDEX IF NOT EXISTS "new_climb_subscriptions_board_layout_idx"
    ON "new_climb_subscriptions" ("board_type", "layout_id");
