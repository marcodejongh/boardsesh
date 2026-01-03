CREATE TYPE "public"."hold_type" AS ENUM('edge', 'sloper', 'pinch', 'sidepull', 'undercling', 'jug', 'crimp', 'pocket');--> statement-breakpoint
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
);
--> statement-breakpoint
ALTER TABLE "playlist_climbs" ALTER COLUMN "angle" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "playlists" ALTER COLUMN "layout_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "playlists" ADD COLUMN "aurora_type" text;--> statement-breakpoint
ALTER TABLE "playlists" ADD COLUMN "aurora_id" text;--> statement-breakpoint
ALTER TABLE "playlists" ADD COLUMN "aurora_synced_at" timestamp;--> statement-breakpoint
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
ALTER TABLE "user_hold_classifications" ADD CONSTRAINT "user_hold_classifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "board_climb_holds_search_idx" ON "board_climb_holds" USING btree ("board_type","hold_id","hold_state");--> statement-breakpoint
CREATE INDEX "board_climb_stats_history_lookup_idx" ON "board_climb_stats_history" USING btree ("board_type","climb_uuid","angle");--> statement-breakpoint
CREATE INDEX "board_climbs_board_type_idx" ON "board_climbs" USING btree ("board_type");--> statement-breakpoint
CREATE INDEX "board_climbs_layout_filter_idx" ON "board_climbs" USING btree ("board_type","layout_id","is_listed","is_draft","frames_count");--> statement-breakpoint
CREATE INDEX "board_climbs_edges_idx" ON "board_climbs" USING btree ("board_type","edge_left","edge_right","edge_bottom","edge_top");--> statement-breakpoint
CREATE INDEX "user_hold_classifications_user_board_idx" ON "user_hold_classifications" USING btree ("user_id","board_type","layout_id","size_id");--> statement-breakpoint
CREATE INDEX "user_hold_classifications_unique_idx" ON "user_hold_classifications" USING btree ("user_id","board_type","layout_id","size_id","hold_id");--> statement-breakpoint
CREATE INDEX "user_hold_classifications_hold_idx" ON "user_hold_classifications" USING btree ("board_type","hold_id");--> statement-breakpoint
CREATE UNIQUE INDEX "boardsesh_ticks_aurora_id_unique" ON "boardsesh_ticks" USING btree ("aurora_id");--> statement-breakpoint
CREATE UNIQUE INDEX "playlists_aurora_id_idx" ON "playlists" USING btree ("aurora_id");