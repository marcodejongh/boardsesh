DROP INDEX IF EXISTS "community_roles_user_role_board_idx";--> statement-breakpoint
ALTER TABLE "community_roles" ADD CONSTRAINT "community_roles_user_role_board_idx" UNIQUE NULLS NOT DISTINCT ("user_id", "role", "board_type");
