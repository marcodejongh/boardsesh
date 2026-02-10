-- Replace ASC indexes with DESC ordering for optimal keyset pagination
-- Pagination uses ORDER BY created_at DESC, id DESC

DROP INDEX IF EXISTS "feed_items_recipient_created_at_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "feed_items_recipient_board_created_at_idx";
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feed_items_recipient_created_at_idx" ON "feed_items" USING btree ("recipient_id", "created_at" DESC, "id" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feed_items_recipient_board_created_at_idx" ON "feed_items" USING btree ("recipient_id", "board_uuid", "created_at" DESC, "id" DESC);
