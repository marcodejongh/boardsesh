ALTER TABLE "user_boards" ADD COLUMN "angle" bigint DEFAULT 40 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_boards" ADD COLUMN "is_angle_adjustable" boolean DEFAULT true NOT NULL;