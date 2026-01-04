CREATE TABLE "board_attempts" (
	"board_type" text NOT NULL,
	"id" integer NOT NULL,
	"position" integer,
	"name" text,
	CONSTRAINT "board_attempts_board_type_id_pk" PRIMARY KEY("board_type","id")
);
--> statement-breakpoint
CREATE TABLE "board_beta_links" (
	"board_type" text NOT NULL,
	"climb_uuid" text NOT NULL,
	"link" text NOT NULL,
	"foreign_username" text,
	"angle" integer,
	"thumbnail" text,
	"is_listed" boolean,
	"created_at" text,
	CONSTRAINT "board_beta_links_board_type_climb_uuid_link_pk" PRIMARY KEY("board_type","climb_uuid","link")
);
--> statement-breakpoint
CREATE TABLE "board_circuits" (
	"board_type" text NOT NULL,
	"uuid" text NOT NULL,
	"name" text,
	"description" text,
	"color" text,
	"user_id" integer,
	"is_public" boolean,
	"created_at" text,
	"updated_at" text,
	CONSTRAINT "board_circuits_board_type_uuid_pk" PRIMARY KEY("board_type","uuid")
);
--> statement-breakpoint
CREATE TABLE "board_circuits_climbs" (
	"board_type" text NOT NULL,
	"circuit_uuid" text NOT NULL,
	"climb_uuid" text NOT NULL,
	"position" integer,
	CONSTRAINT "board_circuits_climbs_board_type_circuit_uuid_climb_uuid_pk" PRIMARY KEY("board_type","circuit_uuid","climb_uuid")
);
--> statement-breakpoint
CREATE TABLE "board_climb_holds" (
	"board_type" text NOT NULL,
	"climb_uuid" text NOT NULL,
	"hold_id" integer NOT NULL,
	"frame_number" integer NOT NULL,
	"hold_state" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "board_climb_holds_board_type_climb_uuid_hold_id_pk" PRIMARY KEY("board_type","climb_uuid","hold_id")
);
--> statement-breakpoint
CREATE TABLE "board_climb_stats" (
	"board_type" text NOT NULL,
	"climb_uuid" text NOT NULL,
	"angle" integer NOT NULL,
	"display_difficulty" double precision,
	"benchmark_difficulty" double precision,
	"ascensionist_count" bigint,
	"difficulty_average" double precision,
	"quality_average" double precision,
	"fa_username" text,
	"fa_at" timestamp,
	CONSTRAINT "board_climb_stats_board_type_climb_uuid_angle_pk" PRIMARY KEY("board_type","climb_uuid","angle")
);
--> statement-breakpoint
CREATE TABLE "board_climb_stats_history" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"board_type" text NOT NULL,
	"climb_uuid" text NOT NULL,
	"angle" integer NOT NULL,
	"display_difficulty" double precision,
	"benchmark_difficulty" double precision,
	"ascensionist_count" bigint,
	"difficulty_average" double precision,
	"quality_average" double precision,
	"fa_username" text,
	"fa_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "board_climbs" (
	"uuid" text PRIMARY KEY NOT NULL,
	"board_type" text NOT NULL,
	"layout_id" integer NOT NULL,
	"setter_id" integer,
	"setter_username" text,
	"name" text,
	"description" text DEFAULT '',
	"hsm" integer,
	"edge_left" integer,
	"edge_right" integer,
	"edge_bottom" integer,
	"edge_top" integer,
	"angle" integer,
	"frames_count" integer DEFAULT 1,
	"frames_pace" integer DEFAULT 0,
	"frames" text,
	"is_draft" boolean DEFAULT false,
	"is_listed" boolean,
	"created_at" text,
	"synced" boolean DEFAULT true NOT NULL,
	"sync_error" text
);
--> statement-breakpoint
CREATE TABLE "board_difficulty_grades" (
	"board_type" text NOT NULL,
	"difficulty" integer NOT NULL,
	"boulder_name" text,
	"route_name" text,
	"is_listed" boolean,
	CONSTRAINT "board_difficulty_grades_board_type_difficulty_pk" PRIMARY KEY("board_type","difficulty")
);
--> statement-breakpoint
CREATE TABLE "board_holes" (
	"board_type" text NOT NULL,
	"id" integer NOT NULL,
	"product_id" integer,
	"name" text,
	"x" integer,
	"y" integer,
	"mirrored_hole_id" integer,
	"mirror_group" integer DEFAULT 0,
	CONSTRAINT "board_holes_board_type_id_pk" PRIMARY KEY("board_type","id")
);
--> statement-breakpoint
CREATE TABLE "board_layouts" (
	"board_type" text NOT NULL,
	"id" integer NOT NULL,
	"product_id" integer,
	"name" text,
	"instagram_caption" text,
	"is_mirrored" boolean,
	"is_listed" boolean,
	"password" text,
	"created_at" text,
	CONSTRAINT "board_layouts_board_type_id_pk" PRIMARY KEY("board_type","id")
);
--> statement-breakpoint
CREATE TABLE "board_leds" (
	"board_type" text NOT NULL,
	"id" integer NOT NULL,
	"product_size_id" integer,
	"hole_id" integer,
	"position" integer,
	CONSTRAINT "board_leds_board_type_id_pk" PRIMARY KEY("board_type","id")
);
--> statement-breakpoint
CREATE TABLE "board_placement_roles" (
	"board_type" text NOT NULL,
	"id" integer NOT NULL,
	"product_id" integer,
	"position" integer,
	"name" text,
	"full_name" text,
	"led_color" text,
	"screen_color" text,
	CONSTRAINT "board_placement_roles_board_type_id_pk" PRIMARY KEY("board_type","id")
);
--> statement-breakpoint
CREATE TABLE "board_placements" (
	"board_type" text NOT NULL,
	"id" integer NOT NULL,
	"layout_id" integer,
	"hole_id" integer,
	"set_id" integer,
	"default_placement_role_id" integer,
	CONSTRAINT "board_placements_board_type_id_pk" PRIMARY KEY("board_type","id")
);
--> statement-breakpoint
CREATE TABLE "board_product_sizes" (
	"board_type" text NOT NULL,
	"id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"edge_left" integer,
	"edge_right" integer,
	"edge_bottom" integer,
	"edge_top" integer,
	"name" text,
	"description" text,
	"image_filename" text,
	"position" integer,
	"is_listed" boolean,
	CONSTRAINT "board_product_sizes_board_type_id_pk" PRIMARY KEY("board_type","id")
);
--> statement-breakpoint
CREATE TABLE "board_product_sizes_layouts_sets" (
	"board_type" text NOT NULL,
	"id" integer NOT NULL,
	"product_size_id" integer,
	"layout_id" integer,
	"set_id" integer,
	"image_filename" text,
	"is_listed" boolean,
	CONSTRAINT "board_product_sizes_layouts_sets_board_type_id_pk" PRIMARY KEY("board_type","id")
);
--> statement-breakpoint
CREATE TABLE "board_products" (
	"board_type" text NOT NULL,
	"id" integer NOT NULL,
	"name" text,
	"is_listed" boolean,
	"password" text,
	"min_count_in_frame" integer,
	"max_count_in_frame" integer,
	CONSTRAINT "board_products_board_type_id_pk" PRIMARY KEY("board_type","id")
);
--> statement-breakpoint
CREATE TABLE "board_sets" (
	"board_type" text NOT NULL,
	"id" integer NOT NULL,
	"name" text,
	"hsm" integer,
	CONSTRAINT "board_sets_board_type_id_pk" PRIMARY KEY("board_type","id")
);
--> statement-breakpoint
CREATE TABLE "board_shared_syncs" (
	"board_type" text NOT NULL,
	"table_name" text NOT NULL,
	"last_synchronized_at" text,
	CONSTRAINT "board_shared_syncs_board_type_table_name_pk" PRIMARY KEY("board_type","table_name")
);
--> statement-breakpoint
CREATE TABLE "board_tags" (
	"board_type" text NOT NULL,
	"entity_uuid" text NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"is_listed" boolean,
	CONSTRAINT "board_tags_board_type_entity_uuid_user_id_name_pk" PRIMARY KEY("board_type","entity_uuid","user_id","name")
);
--> statement-breakpoint
CREATE TABLE "board_user_syncs" (
	"board_type" text NOT NULL,
	"user_id" integer NOT NULL,
	"table_name" text NOT NULL,
	"last_synchronized_at" text,
	CONSTRAINT "board_user_syncs_board_type_user_id_table_name_pk" PRIMARY KEY("board_type","user_id","table_name")
);
--> statement-breakpoint
CREATE TABLE "board_users" (
	"board_type" text NOT NULL,
	"id" integer NOT NULL,
	"username" text,
	"created_at" text,
	CONSTRAINT "board_users_board_type_id_pk" PRIMARY KEY("board_type","id")
);
--> statement-breakpoint
CREATE TABLE "board_walls" (
	"board_type" text NOT NULL,
	"uuid" text NOT NULL,
	"user_id" integer,
	"name" text,
	"product_id" integer,
	"is_adjustable" boolean,
	"angle" integer,
	"layout_id" integer,
	"product_size_id" integer,
	"hsm" integer,
	"serial_number" text,
	"created_at" text,
	CONSTRAINT "board_walls_board_type_uuid_pk" PRIMARY KEY("board_type","uuid")
);
--> statement-breakpoint
-- =============================================================================
-- DATA MIGRATION: Migrate data from board-specific tables to unified tables
-- =============================================================================

-- Level 0: Tables with no foreign key dependencies
-- -----------------------------------------------------------------------------

-- Migrate attempts data
INSERT INTO board_attempts (board_type, id, position, name)
SELECT 'kilter', id, position, name FROM kilter_attempts;--> statement-breakpoint

INSERT INTO board_attempts (board_type, id, position, name)
SELECT 'tension', id, position, name FROM tension_attempts;--> statement-breakpoint

-- Seed MoonBoard attempts
INSERT INTO board_attempts (board_type, id, position, name) VALUES
  ('moonboard', 1, 1, 'Flash'),
  ('moonboard', 2, 2, 'Send');--> statement-breakpoint

-- Migrate difficulty grades data
INSERT INTO board_difficulty_grades (board_type, difficulty, boulder_name, route_name, is_listed)
SELECT 'kilter', difficulty, boulder_name, route_name, is_listed FROM kilter_difficulty_grades;--> statement-breakpoint

INSERT INTO board_difficulty_grades (board_type, difficulty, boulder_name, route_name, is_listed)
SELECT 'tension', difficulty, boulder_name, route_name, is_listed FROM tension_difficulty_grades;--> statement-breakpoint

-- Seed MoonBoard difficulty grades (Font scale)
INSERT INTO board_difficulty_grades (board_type, difficulty, boulder_name, is_listed) VALUES
  ('moonboard', 10, '6A', true),
  ('moonboard', 11, '6A+', true),
  ('moonboard', 12, '6B', true),
  ('moonboard', 13, '6B+', true),
  ('moonboard', 14, '6C', true),
  ('moonboard', 15, '6C+', true),
  ('moonboard', 16, '7A', true),
  ('moonboard', 17, '7A+', true),
  ('moonboard', 18, '7B', true),
  ('moonboard', 19, '7B+', true),
  ('moonboard', 20, '7C', true),
  ('moonboard', 21, '7C+', true),
  ('moonboard', 22, '8A', true),
  ('moonboard', 23, '8A+', true),
  ('moonboard', 24, '8B', true),
  ('moonboard', 25, '8B+', true);--> statement-breakpoint

-- Migrate products data
INSERT INTO board_products (board_type, id, name, is_listed, password, min_count_in_frame, max_count_in_frame)
SELECT 'kilter', id, name, is_listed, password, min_count_in_frame, max_count_in_frame FROM kilter_products;--> statement-breakpoint

INSERT INTO board_products (board_type, id, name, is_listed, password, min_count_in_frame, max_count_in_frame)
SELECT 'tension', id, name, is_listed, password, min_count_in_frame, max_count_in_frame FROM tension_products;--> statement-breakpoint

-- Migrate sets data
INSERT INTO board_sets (board_type, id, name, hsm)
SELECT 'kilter', id, name, hsm FROM kilter_sets;--> statement-breakpoint

INSERT INTO board_sets (board_type, id, name, hsm)
SELECT 'tension', id, name, hsm FROM tension_sets;--> statement-breakpoint

-- Migrate users data
INSERT INTO board_users (board_type, id, username, created_at)
SELECT 'kilter', id, username, created_at FROM kilter_users;--> statement-breakpoint

INSERT INTO board_users (board_type, id, username, created_at)
SELECT 'tension', id, username, created_at FROM tension_users;--> statement-breakpoint

-- Level 1: Tables that depend on Level 0
-- -----------------------------------------------------------------------------

-- Migrate layouts data
INSERT INTO board_layouts (board_type, id, product_id, name, instagram_caption, is_mirrored, is_listed, password, created_at)
SELECT 'kilter', id, product_id, name, instagram_caption, is_mirrored, is_listed, password, created_at FROM kilter_layouts;--> statement-breakpoint

INSERT INTO board_layouts (board_type, id, product_id, name, instagram_caption, is_mirrored, is_listed, password, created_at)
SELECT 'tension', id, product_id, name, instagram_caption, is_mirrored, is_listed, password, created_at FROM tension_layouts;--> statement-breakpoint

-- Migrate product sizes data
INSERT INTO board_product_sizes (board_type, id, product_id, edge_left, edge_right, edge_bottom, edge_top, name, description, image_filename, position, is_listed)
SELECT 'kilter', id, product_id, edge_left, edge_right, edge_bottom, edge_top, name, description, image_filename, position, is_listed FROM kilter_product_sizes;--> statement-breakpoint

INSERT INTO board_product_sizes (board_type, id, product_id, edge_left, edge_right, edge_bottom, edge_top, name, description, image_filename, position, is_listed)
SELECT 'tension', id, product_id, edge_left, edge_right, edge_bottom, edge_top, name, description, image_filename, position, is_listed FROM tension_product_sizes;--> statement-breakpoint

-- Migrate holes data
INSERT INTO board_holes (board_type, id, product_id, name, x, y, mirrored_hole_id, mirror_group)
SELECT 'kilter', id, product_id, name, x, y, mirrored_hole_id, mirror_group FROM kilter_holes;--> statement-breakpoint

INSERT INTO board_holes (board_type, id, product_id, name, x, y, mirrored_hole_id, mirror_group)
SELECT 'tension', id, product_id, name, x, y, mirrored_hole_id, mirror_group FROM tension_holes;--> statement-breakpoint

-- Migrate placement roles data
INSERT INTO board_placement_roles (board_type, id, product_id, position, name, full_name, led_color, screen_color)
SELECT 'kilter', id, product_id, position, name, full_name, led_color, screen_color FROM kilter_placement_roles;--> statement-breakpoint

INSERT INTO board_placement_roles (board_type, id, product_id, position, name, full_name, led_color, screen_color)
SELECT 'tension', id, product_id, position, name, full_name, led_color, screen_color FROM tension_placement_roles;--> statement-breakpoint

-- Migrate shared syncs data
INSERT INTO board_shared_syncs (board_type, table_name, last_synchronized_at)
SELECT 'kilter', table_name, last_synchronized_at FROM kilter_shared_syncs;--> statement-breakpoint

INSERT INTO board_shared_syncs (board_type, table_name, last_synchronized_at)
SELECT 'tension', table_name, last_synchronized_at FROM tension_shared_syncs;--> statement-breakpoint

-- Level 2: Tables that depend on Level 1
-- -----------------------------------------------------------------------------

-- Migrate LEDs data
INSERT INTO board_leds (board_type, id, product_size_id, hole_id, position)
SELECT 'kilter', id, product_size_id, hole_id, position FROM kilter_leds;--> statement-breakpoint

INSERT INTO board_leds (board_type, id, product_size_id, hole_id, position)
SELECT 'tension', id, product_size_id, hole_id, position FROM tension_leds;--> statement-breakpoint

-- Migrate placements data
INSERT INTO board_placements (board_type, id, layout_id, hole_id, set_id, default_placement_role_id)
SELECT 'kilter', id, layout_id, hole_id, set_id, default_placement_role_id FROM kilter_placements;--> statement-breakpoint

INSERT INTO board_placements (board_type, id, layout_id, hole_id, set_id, default_placement_role_id)
SELECT 'tension', id, layout_id, hole_id, set_id, default_placement_role_id FROM tension_placements;--> statement-breakpoint

-- Migrate product_sizes_layouts_sets data
INSERT INTO board_product_sizes_layouts_sets (board_type, id, product_size_id, layout_id, set_id, image_filename, is_listed)
SELECT 'kilter', id, product_size_id, layout_id, set_id, image_filename, is_listed FROM kilter_product_sizes_layouts_sets;--> statement-breakpoint

INSERT INTO board_product_sizes_layouts_sets (board_type, id, product_size_id, layout_id, set_id, image_filename, is_listed)
SELECT 'tension', id, product_size_id, layout_id, set_id, image_filename, is_listed FROM tension_product_sizes_layouts_sets;--> statement-breakpoint

-- Migrate climbs data
INSERT INTO board_climbs (uuid, board_type, layout_id, setter_id, setter_username, name, description, hsm, edge_left, edge_right, edge_bottom, edge_top, angle, frames_count, frames_pace, frames, is_draft, is_listed, created_at, synced, sync_error)
SELECT uuid, 'kilter', layout_id, setter_id, setter_username, name, description, hsm, edge_left, edge_right, edge_bottom, edge_top, angle, frames_count, frames_pace, frames, is_draft, is_listed, created_at, synced, sync_error FROM kilter_climbs;--> statement-breakpoint

INSERT INTO board_climbs (uuid, board_type, layout_id, setter_id, setter_username, name, description, hsm, edge_left, edge_right, edge_bottom, edge_top, angle, frames_count, frames_pace, frames, is_draft, is_listed, created_at, synced, sync_error)
SELECT uuid, 'tension', layout_id, setter_id, setter_username, name, description, hsm, edge_left, edge_right, edge_bottom, edge_top, angle, frames_count, frames_pace, frames, is_draft, is_listed, created_at, synced, sync_error FROM tension_climbs;--> statement-breakpoint

-- Migrate circuits data
INSERT INTO board_circuits (board_type, uuid, name, description, color, user_id, is_public, created_at, updated_at)
SELECT 'kilter', uuid, name, description, color, user_id, is_public, created_at, updated_at FROM kilter_circuits;--> statement-breakpoint

INSERT INTO board_circuits (board_type, uuid, name, description, color, user_id, is_public, created_at, updated_at)
SELECT 'tension', uuid, name, description, color, user_id, is_public, created_at, updated_at FROM tension_circuits;--> statement-breakpoint

-- Migrate walls data
INSERT INTO board_walls (board_type, uuid, user_id, name, product_id, is_adjustable, angle, layout_id, product_size_id, hsm, serial_number, created_at)
SELECT 'kilter', uuid, user_id, name, product_id, is_adjustable, angle, layout_id, product_size_id, hsm, serial_number, created_at FROM kilter_walls;--> statement-breakpoint

INSERT INTO board_walls (board_type, uuid, user_id, name, product_id, is_adjustable, angle, layout_id, product_size_id, hsm, serial_number, created_at)
SELECT 'tension', uuid, user_id, name, product_id, is_adjustable, angle, layout_id, product_size_id, hsm, serial_number, created_at FROM tension_walls;--> statement-breakpoint

-- Migrate user syncs data
INSERT INTO board_user_syncs (board_type, user_id, table_name, last_synchronized_at)
SELECT 'kilter', user_id, table_name, last_synchronized_at FROM kilter_user_syncs;--> statement-breakpoint

INSERT INTO board_user_syncs (board_type, user_id, table_name, last_synchronized_at)
SELECT 'tension', user_id, table_name, last_synchronized_at FROM tension_user_syncs;--> statement-breakpoint

-- Level 3: Tables that depend on Level 2
-- -----------------------------------------------------------------------------

-- Migrate climb stats data
INSERT INTO board_climb_stats (board_type, climb_uuid, angle, display_difficulty, benchmark_difficulty, ascensionist_count, difficulty_average, quality_average, fa_username, fa_at)
SELECT 'kilter', climb_uuid, angle, display_difficulty, benchmark_difficulty, ascensionist_count, difficulty_average, quality_average, fa_username, fa_at FROM kilter_climb_stats;--> statement-breakpoint

INSERT INTO board_climb_stats (board_type, climb_uuid, angle, display_difficulty, benchmark_difficulty, ascensionist_count, difficulty_average, quality_average, fa_username, fa_at)
SELECT 'tension', climb_uuid, angle, display_difficulty, benchmark_difficulty, ascensionist_count, difficulty_average, quality_average, fa_username, fa_at FROM tension_climb_stats;--> statement-breakpoint

-- Migrate climb holds data (using DISTINCT ON to handle duplicates in source data)
INSERT INTO board_climb_holds (board_type, climb_uuid, hold_id, frame_number, hold_state)
SELECT DISTINCT ON (climb_uuid, hold_id) 'kilter', climb_uuid, hold_id, frame_number, hold_state
FROM kilter_climb_holds
ORDER BY climb_uuid, hold_id, created_at DESC NULLS LAST;--> statement-breakpoint

INSERT INTO board_climb_holds (board_type, climb_uuid, hold_id, frame_number, hold_state)
SELECT DISTINCT ON (climb_uuid, hold_id) 'tension', climb_uuid, hold_id, frame_number, hold_state
FROM tension_climb_holds
ORDER BY climb_uuid, hold_id, created_at DESC NULLS LAST;--> statement-breakpoint

-- Migrate climb stats history data
INSERT INTO board_climb_stats_history (board_type, climb_uuid, angle, display_difficulty, benchmark_difficulty, ascensionist_count, difficulty_average, quality_average, fa_username, fa_at, created_at)
SELECT 'kilter', climb_uuid, angle, display_difficulty, benchmark_difficulty, ascensionist_count, difficulty_average, quality_average, fa_username, fa_at, created_at FROM kilter_climb_stats_history;--> statement-breakpoint

INSERT INTO board_climb_stats_history (board_type, climb_uuid, angle, display_difficulty, benchmark_difficulty, ascensionist_count, difficulty_average, quality_average, fa_username, fa_at, created_at)
SELECT 'tension', climb_uuid, angle, display_difficulty, benchmark_difficulty, ascensionist_count, difficulty_average, quality_average, fa_username, fa_at, created_at FROM tension_climb_stats_history;--> statement-breakpoint

-- Migrate beta links data
INSERT INTO board_beta_links (board_type, climb_uuid, link, foreign_username, angle, thumbnail, is_listed, created_at)
SELECT 'kilter', climb_uuid, link, foreign_username, angle, thumbnail, is_listed, created_at FROM kilter_beta_links;--> statement-breakpoint

INSERT INTO board_beta_links (board_type, climb_uuid, link, foreign_username, angle, thumbnail, is_listed, created_at)
SELECT 'tension', climb_uuid, link, foreign_username, angle, thumbnail, is_listed, created_at FROM tension_beta_links;--> statement-breakpoint

-- Migrate circuits_climbs data
INSERT INTO board_circuits_climbs (board_type, circuit_uuid, climb_uuid, position)
SELECT 'kilter', circuit_uuid, climb_uuid, position FROM kilter_circuits_climbs;--> statement-breakpoint

INSERT INTO board_circuits_climbs (board_type, circuit_uuid, climb_uuid, position)
SELECT 'tension', circuit_uuid, climb_uuid, position FROM tension_circuits_climbs;--> statement-breakpoint

-- Migrate tags data
INSERT INTO board_tags (board_type, entity_uuid, user_id, name, is_listed)
SELECT 'kilter', entity_uuid, user_id, name, is_listed FROM kilter_tags;--> statement-breakpoint

INSERT INTO board_tags (board_type, entity_uuid, user_id, name, is_listed)
SELECT 'tension', entity_uuid, user_id, name, is_listed FROM tension_tags;--> statement-breakpoint

-- =============================================================================
-- END DATA MIGRATION
-- =============================================================================

-- Note: playlist column changes are handled by migration 0024_old_zombie.sql

-- Clean up orphaned data before adding foreign key constraints
DELETE FROM board_beta_links WHERE climb_uuid NOT IN (SELECT uuid FROM board_climbs);--> statement-breakpoint
DELETE FROM board_circuits_climbs WHERE climb_uuid NOT IN (SELECT uuid FROM board_climbs);--> statement-breakpoint
DELETE FROM board_climb_holds WHERE climb_uuid NOT IN (SELECT uuid FROM board_climbs);--> statement-breakpoint
DELETE FROM board_climb_stats WHERE climb_uuid NOT IN (SELECT uuid FROM board_climbs);--> statement-breakpoint

ALTER TABLE "board_beta_links" ADD CONSTRAINT "board_beta_links_climb_fk" FOREIGN KEY ("climb_uuid") REFERENCES "public"."board_climbs"("uuid") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "board_circuits" ADD CONSTRAINT "board_circuits_user_fk" FOREIGN KEY ("board_type","user_id") REFERENCES "public"."board_users"("board_type","id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "board_circuits_climbs" ADD CONSTRAINT "board_circuits_climbs_circuit_fk" FOREIGN KEY ("board_type","circuit_uuid") REFERENCES "public"."board_circuits"("board_type","uuid") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "board_circuits_climbs" ADD CONSTRAINT "board_circuits_climbs_climb_fk" FOREIGN KEY ("climb_uuid") REFERENCES "public"."board_climbs"("uuid") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "board_climb_holds" ADD CONSTRAINT "board_climb_holds_climb_fk" FOREIGN KEY ("climb_uuid") REFERENCES "public"."board_climbs"("uuid") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "board_climb_stats" ADD CONSTRAINT "board_climb_stats_climb_fk" FOREIGN KEY ("climb_uuid") REFERENCES "public"."board_climbs"("uuid") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "board_climbs" ADD CONSTRAINT "board_climbs_layout_fk" FOREIGN KEY ("board_type","layout_id") REFERENCES "public"."board_layouts"("board_type","id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "board_holes" ADD CONSTRAINT "board_holes_product_fk" FOREIGN KEY ("board_type","product_id") REFERENCES "public"."board_products"("board_type","id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "board_layouts" ADD CONSTRAINT "board_layouts_product_fk" FOREIGN KEY ("board_type","product_id") REFERENCES "public"."board_products"("board_type","id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "board_leds" ADD CONSTRAINT "board_leds_product_size_fk" FOREIGN KEY ("board_type","product_size_id") REFERENCES "public"."board_product_sizes"("board_type","id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "board_leds" ADD CONSTRAINT "board_leds_hole_fk" FOREIGN KEY ("board_type","hole_id") REFERENCES "public"."board_holes"("board_type","id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "board_placement_roles" ADD CONSTRAINT "board_placement_roles_product_fk" FOREIGN KEY ("board_type","product_id") REFERENCES "public"."board_products"("board_type","id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "board_placements" ADD CONSTRAINT "board_placements_layout_fk" FOREIGN KEY ("board_type","layout_id") REFERENCES "public"."board_layouts"("board_type","id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "board_placements" ADD CONSTRAINT "board_placements_hole_fk" FOREIGN KEY ("board_type","hole_id") REFERENCES "public"."board_holes"("board_type","id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "board_placements" ADD CONSTRAINT "board_placements_set_fk" FOREIGN KEY ("board_type","set_id") REFERENCES "public"."board_sets"("board_type","id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "board_placements" ADD CONSTRAINT "board_placements_role_fk" FOREIGN KEY ("board_type","default_placement_role_id") REFERENCES "public"."board_placement_roles"("board_type","id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "board_product_sizes" ADD CONSTRAINT "board_product_sizes_product_fk" FOREIGN KEY ("board_type","product_id") REFERENCES "public"."board_products"("board_type","id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "board_product_sizes_layouts_sets" ADD CONSTRAINT "board_psls_product_size_fk" FOREIGN KEY ("board_type","product_size_id") REFERENCES "public"."board_product_sizes"("board_type","id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "board_product_sizes_layouts_sets" ADD CONSTRAINT "board_psls_layout_fk" FOREIGN KEY ("board_type","layout_id") REFERENCES "public"."board_layouts"("board_type","id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "board_product_sizes_layouts_sets" ADD CONSTRAINT "board_psls_set_fk" FOREIGN KEY ("board_type","set_id") REFERENCES "public"."board_sets"("board_type","id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "board_user_syncs" ADD CONSTRAINT "board_user_syncs_user_fk" FOREIGN KEY ("board_type","user_id") REFERENCES "public"."board_users"("board_type","id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "board_walls" ADD CONSTRAINT "board_walls_user_fk" FOREIGN KEY ("board_type","user_id") REFERENCES "public"."board_users"("board_type","id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "board_walls" ADD CONSTRAINT "board_walls_product_fk" FOREIGN KEY ("board_type","product_id") REFERENCES "public"."board_products"("board_type","id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "board_walls" ADD CONSTRAINT "board_walls_layout_fk" FOREIGN KEY ("board_type","layout_id") REFERENCES "public"."board_layouts"("board_type","id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "board_walls" ADD CONSTRAINT "board_walls_product_size_fk" FOREIGN KEY ("board_type","product_size_id") REFERENCES "public"."board_product_sizes"("board_type","id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "board_climb_holds_search_idx" ON "board_climb_holds" USING btree ("board_type","hold_id","hold_state");--> statement-breakpoint
CREATE INDEX "board_climb_stats_history_lookup_idx" ON "board_climb_stats_history" USING btree ("board_type","climb_uuid","angle");--> statement-breakpoint
CREATE INDEX "board_climbs_board_type_idx" ON "board_climbs" USING btree ("board_type");--> statement-breakpoint
CREATE INDEX "board_climbs_layout_filter_idx" ON "board_climbs" USING btree ("board_type","layout_id","is_listed","is_draft","frames_count");--> statement-breakpoint
CREATE INDEX "board_climbs_edges_idx" ON "board_climbs" USING btree ("board_type","edge_left","edge_right","edge_bottom","edge_top");
-- Note: boardsesh_ticks_aurora_id_unique and playlists_aurora_id_idx are created by migration 0024_old_zombie.sql