-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "kilter_climb_cache_fields" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"climb_uuid" text,
	"ascensionist_count" integer,
	"display_difficulty" double precision,
	"quality_average" double precision
);
--> statement-breakpoint
CREATE TABLE "kilter_attempts" (
	"id" integer PRIMARY KEY NOT NULL,
	"position" integer,
	"name" text
);
--> statement-breakpoint
CREATE TABLE "kilter_climb_random_positions" (
	"climb_uuid" text PRIMARY KEY NOT NULL,
	"position" integer
);
--> statement-breakpoint
CREATE TABLE "kilter_layouts" (
	"id" integer PRIMARY KEY NOT NULL,
	"product_id" integer,
	"name" text,
	"instagram_caption" text,
	"is_mirrored" boolean,
	"is_listed" boolean,
	"password" text,
	"created_at" text
);
--> statement-breakpoint
CREATE TABLE "kilter_android_metadata" (
	"locale" text
);
--> statement-breakpoint
CREATE TABLE "kilter_circuits" (
	"uuid" text PRIMARY KEY NOT NULL,
	"name" text,
	"description" text,
	"color" text,
	"user_id" integer,
	"is_public" boolean,
	"created_at" text,
	"updated_at" text
);
--> statement-breakpoint
CREATE TABLE "tension_climb_stats" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"climb_uuid" text,
	"angle" bigint,
	"display_difficulty" double precision,
	"benchmark_difficulty" double precision,
	"ascensionist_count" bigint,
	"difficulty_average" double precision,
	"quality_average" double precision,
	"fa_username" text,
	"fa_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "tension_climb_cache_fields" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"climb_uuid" text,
	"ascensionist_count" integer,
	"display_difficulty" double precision,
	"quality_average" double precision
);
--> statement-breakpoint
CREATE TABLE "kilter_leds" (
	"id" integer PRIMARY KEY NOT NULL,
	"product_size_id" integer,
	"hole_id" integer,
	"position" integer
);
--> statement-breakpoint
CREATE TABLE "kilter_climb_stats" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"climb_uuid" text,
	"angle" bigint,
	"display_difficulty" double precision,
	"benchmark_difficulty" double precision,
	"ascensionist_count" bigint,
	"difficulty_average" double precision,
	"quality_average" double precision,
	"fa_username" text,
	"fa_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "kilter_product_sizes" (
	"id" integer PRIMARY KEY NOT NULL,
	"product_id" integer,
	"edge_left" integer,
	"edge_right" integer,
	"edge_bottom" integer,
	"edge_top" integer,
	"name" text,
	"description" text,
	"image_filename" text,
	"position" integer,
	"is_listed" boolean
);
--> statement-breakpoint
CREATE TABLE "kilter_kits" (
	"serial_number" text PRIMARY KEY NOT NULL,
	"name" text,
	"is_autoconnect" boolean,
	"is_listed" boolean,
	"created_at" text,
	"updated_at" text
);
--> statement-breakpoint
CREATE TABLE "kilter_bids" (
	"uuid" text PRIMARY KEY NOT NULL,
	"user_id" integer,
	"climb_uuid" text,
	"angle" integer,
	"is_mirror" boolean,
	"bid_count" integer DEFAULT 1,
	"comment" text DEFAULT '',
	"climbed_at" text,
	"created_at" text
);
--> statement-breakpoint
CREATE TABLE "kilter_holes" (
	"id" integer PRIMARY KEY NOT NULL,
	"product_id" integer,
	"name" text,
	"x" integer,
	"y" integer,
	"mirrored_hole_id" integer,
	"mirror_group" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "kilter_placement_roles" (
	"id" integer PRIMARY KEY NOT NULL,
	"product_id" integer,
	"position" integer,
	"name" text,
	"full_name" text,
	"led_color" text,
	"screen_color" text
);
--> statement-breakpoint
CREATE TABLE "kilter_difficulty_grades" (
	"difficulty" integer PRIMARY KEY NOT NULL,
	"boulder_name" text,
	"route_name" text,
	"is_listed" boolean
);
--> statement-breakpoint
CREATE TABLE "kilter_placements" (
	"id" integer PRIMARY KEY NOT NULL,
	"layout_id" integer,
	"hole_id" integer,
	"set_id" integer,
	"default_placement_role_id" integer
);
--> statement-breakpoint
CREATE TABLE "kilter_climbs" (
	"uuid" text PRIMARY KEY NOT NULL,
	"layout_id" integer,
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
	"created_at" text
);
--> statement-breakpoint
CREATE TABLE "kilter_product_sizes_layouts_sets" (
	"id" integer PRIMARY KEY NOT NULL,
	"product_size_id" integer,
	"layout_id" integer,
	"set_id" integer,
	"image_filename" text,
	"is_listed" boolean
);
--> statement-breakpoint
CREATE TABLE "kilter_shared_syncs" (
	"table_name" text PRIMARY KEY NOT NULL,
	"last_synchronized_at" text
);
--> statement-breakpoint
CREATE TABLE "kilter_users" (
	"id" integer PRIMARY KEY NOT NULL,
	"username" text,
	"created_at" text
);
--> statement-breakpoint
CREATE TABLE "kilter_products" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text,
	"is_listed" boolean,
	"password" text,
	"min_count_in_frame" integer,
	"max_count_in_frame" integer
);
--> statement-breakpoint
CREATE TABLE "kilter_sets" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text,
	"hsm" integer
);
--> statement-breakpoint
CREATE TABLE "kilter_walls" (
	"uuid" text PRIMARY KEY NOT NULL,
	"user_id" integer,
	"name" text,
	"product_id" integer,
	"is_adjustable" boolean,
	"angle" integer,
	"layout_id" integer,
	"product_size_id" integer,
	"hsm" integer,
	"serial_number" text,
	"created_at" text
);
--> statement-breakpoint
CREATE TABLE "tension_android_metadata" (
	"locale" text
);
--> statement-breakpoint
CREATE TABLE "tension_attempts" (
	"id" integer PRIMARY KEY NOT NULL,
	"position" integer,
	"name" text
);
--> statement-breakpoint
CREATE TABLE "tension_bids" (
	"uuid" text PRIMARY KEY NOT NULL,
	"user_id" integer,
	"climb_uuid" text,
	"angle" integer,
	"is_mirror" boolean,
	"bid_count" integer DEFAULT 1,
	"comment" text DEFAULT '',
	"climbed_at" text,
	"created_at" text
);
--> statement-breakpoint
CREATE TABLE "tension_holes" (
	"id" integer PRIMARY KEY NOT NULL,
	"product_id" integer,
	"name" text,
	"x" integer,
	"y" integer,
	"mirrored_hole_id" integer,
	"mirror_group" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "tension_circuits" (
	"uuid" text PRIMARY KEY NOT NULL,
	"name" text,
	"description" text,
	"color" text,
	"user_id" integer,
	"is_public" boolean,
	"created_at" text,
	"updated_at" text
);
--> statement-breakpoint
CREATE TABLE "tension_kits" (
	"serial_number" text PRIMARY KEY NOT NULL,
	"name" text,
	"is_autoconnect" boolean,
	"is_listed" boolean,
	"created_at" text,
	"updated_at" text
);
--> statement-breakpoint
CREATE TABLE "tension_climb_random_positions" (
	"climb_uuid" text PRIMARY KEY NOT NULL,
	"position" integer
);
--> statement-breakpoint
CREATE TABLE "tension_climbs" (
	"uuid" text PRIMARY KEY NOT NULL,
	"layout_id" integer,
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
	"created_at" text
);
--> statement-breakpoint
CREATE TABLE "tension_sets" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text,
	"hsm" integer
);
--> statement-breakpoint
CREATE TABLE "tension_placements" (
	"id" integer PRIMARY KEY NOT NULL,
	"layout_id" integer,
	"hole_id" integer,
	"set_id" integer,
	"default_placement_role_id" integer
);
--> statement-breakpoint
CREATE TABLE "tension_placement_roles" (
	"id" integer PRIMARY KEY NOT NULL,
	"product_id" integer,
	"position" integer,
	"name" text,
	"full_name" text,
	"led_color" text,
	"screen_color" text
);
--> statement-breakpoint
CREATE TABLE "tension_leds" (
	"id" integer PRIMARY KEY NOT NULL,
	"product_size_id" integer,
	"hole_id" integer,
	"position" integer
);
--> statement-breakpoint
CREATE TABLE "tension_layouts" (
	"id" integer PRIMARY KEY NOT NULL,
	"product_id" integer,
	"name" text,
	"instagram_caption" text,
	"is_mirrored" boolean,
	"is_listed" boolean,
	"password" text,
	"created_at" text
);
--> statement-breakpoint
CREATE TABLE "tension_shared_syncs" (
	"table_name" text PRIMARY KEY NOT NULL,
	"last_synchronized_at" text
);
--> statement-breakpoint
CREATE TABLE "tension_product_sizes_layouts_sets" (
	"id" integer PRIMARY KEY NOT NULL,
	"product_size_id" integer,
	"layout_id" integer,
	"set_id" integer,
	"image_filename" text,
	"is_listed" boolean
);
--> statement-breakpoint
CREATE TABLE "tension_product_sizes" (
	"id" integer PRIMARY KEY NOT NULL,
	"product_id" integer,
	"edge_left" integer,
	"edge_right" integer,
	"edge_bottom" integer,
	"edge_top" integer,
	"name" text,
	"description" text,
	"image_filename" text,
	"position" integer,
	"is_listed" boolean
);
--> statement-breakpoint
CREATE TABLE "kilter_ascents" (
	"uuid" text PRIMARY KEY NOT NULL,
	"climb_uuid" text,
	"angle" integer,
	"is_mirror" boolean,
	"user_id" integer,
	"attempt_id" integer,
	"bid_count" integer DEFAULT 1,
	"quality" integer,
	"difficulty" integer,
	"is_benchmark" integer DEFAULT 0,
	"comment" text DEFAULT '',
	"climbed_at" text,
	"created_at" text
);
--> statement-breakpoint
CREATE TABLE "tension_walls" (
	"uuid" text PRIMARY KEY NOT NULL,
	"user_id" integer,
	"name" text,
	"product_id" integer,
	"is_adjustable" boolean,
	"angle" integer,
	"layout_id" integer,
	"product_size_id" integer,
	"hsm" integer,
	"serial_number" text,
	"created_at" text
);
--> statement-breakpoint
CREATE TABLE "tension_products" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text,
	"is_listed" boolean,
	"password" text,
	"min_count_in_frame" integer,
	"max_count_in_frame" integer
);
--> statement-breakpoint
CREATE TABLE "tension_difficulty_grades" (
	"difficulty" integer PRIMARY KEY NOT NULL,
	"boulder_name" text,
	"route_name" text,
	"is_listed" boolean
);
--> statement-breakpoint
CREATE TABLE "tension_ascents" (
	"uuid" text PRIMARY KEY NOT NULL,
	"climb_uuid" text,
	"angle" integer,
	"is_mirror" boolean,
	"user_id" integer,
	"attempt_id" integer,
	"bid_count" integer DEFAULT 1,
	"quality" integer,
	"difficulty" integer,
	"is_benchmark" integer DEFAULT 0,
	"comment" text DEFAULT '',
	"climbed_at" text,
	"created_at" text
);
--> statement-breakpoint
CREATE TABLE "tension_users" (
	"id" integer PRIMARY KEY NOT NULL,
	"username" text,
	"created_at" text
);
--> statement-breakpoint
CREATE TABLE "kilter_products_angles" (
	"product_id" integer NOT NULL,
	"angle" integer NOT NULL,
	CONSTRAINT "idx_16800_sqlite_autoindex_products_angles_1" PRIMARY KEY("product_id","angle")
);
--> statement-breakpoint
CREATE TABLE "kilter_walls_sets" (
	"wall_uuid" text NOT NULL,
	"set_id" integer NOT NULL,
	CONSTRAINT "idx_16838_sqlite_autoindex_walls_sets_1" PRIMARY KEY("wall_uuid","set_id")
);
--> statement-breakpoint
CREATE TABLE "kilter_user_permissions" (
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "idx_16828_sqlite_autoindex_user_permissions_1" PRIMARY KEY("user_id","name")
);
--> statement-breakpoint
CREATE TABLE "tension_user_permissions" (
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "idx_16447_sqlite_autoindex_user_permissions_1" PRIMARY KEY("user_id","name")
);
--> statement-breakpoint
CREATE TABLE "tension_walls_sets" (
	"wall_uuid" text NOT NULL,
	"set_id" integer NOT NULL,
	CONSTRAINT "idx_16457_sqlite_autoindex_walls_sets_1" PRIMARY KEY("wall_uuid","set_id")
);
--> statement-breakpoint
CREATE TABLE "kilter_circuits_climbs" (
	"circuit_uuid" text NOT NULL,
	"climb_uuid" text NOT NULL,
	"position" integer,
	CONSTRAINT "idx_16868_sqlite_autoindex_circuits_climbs_1" PRIMARY KEY("circuit_uuid","climb_uuid")
);
--> statement-breakpoint
CREATE TABLE "tension_products_angles" (
	"product_id" integer NOT NULL,
	"angle" integer NOT NULL,
	CONSTRAINT "idx_16414_sqlite_autoindex_products_angles_1" PRIMARY KEY("product_id","angle")
);
--> statement-breakpoint
CREATE TABLE "kilter_user_syncs" (
	"user_id" integer NOT NULL,
	"table_name" text NOT NULL,
	"last_synchronized_at" text,
	CONSTRAINT "idx_16833_sqlite_autoindex_user_syncs_1" PRIMARY KEY("user_id","table_name")
);
--> statement-breakpoint
CREATE TABLE "tension_circuits_climbs" (
	"circuit_uuid" text NOT NULL,
	"climb_uuid" text NOT NULL,
	"position" integer,
	CONSTRAINT "idx_16482_sqlite_autoindex_circuits_climbs_1" PRIMARY KEY("circuit_uuid","climb_uuid")
);
--> statement-breakpoint
CREATE TABLE "tension_user_syncs" (
	"user_id" integer NOT NULL,
	"table_name" text NOT NULL,
	"last_synchronized_at" text,
	CONSTRAINT "idx_16452_sqlite_autoindex_user_syncs_1" PRIMARY KEY("user_id","table_name")
);
--> statement-breakpoint
CREATE TABLE "kilter_tags" (
	"entity_uuid" text NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"is_listed" boolean,
	CONSTRAINT "idx_16853_sqlite_autoindex_tags_1" PRIMARY KEY("entity_uuid","user_id","name")
);
--> statement-breakpoint
CREATE TABLE "tension_tags" (
	"entity_uuid" text NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"is_listed" boolean,
	CONSTRAINT "idx_16472_sqlite_autoindex_tags_1" PRIMARY KEY("entity_uuid","user_id","name")
);
--> statement-breakpoint
CREATE TABLE "kilter_beta_links" (
	"climb_uuid" text NOT NULL,
	"link" text NOT NULL,
	"foreign_username" text,
	"angle" integer,
	"thumbnail" text,
	"is_listed" boolean,
	"created_at" text,
	CONSTRAINT "idx_16883_sqlite_autoindex_beta_links_1" PRIMARY KEY("climb_uuid","link")
);
--> statement-breakpoint
CREATE TABLE "tension_beta_links" (
	"climb_uuid" text NOT NULL,
	"link" text NOT NULL,
	"foreign_username" text,
	"angle" integer,
	"thumbnail" text,
	"is_listed" boolean,
	"created_at" text,
	CONSTRAINT "idx_16497_sqlite_autoindex_beta_links_1" PRIMARY KEY("climb_uuid","link")
);
--> statement-breakpoint
ALTER TABLE "kilter_climb_cache_fields" ADD CONSTRAINT "climb_cache_fields_climb_uuid_fkey1" FOREIGN KEY ("climb_uuid") REFERENCES "public"."kilter_climbs"("uuid") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "kilter_layouts" ADD CONSTRAINT "layouts_product_id_fkey1" FOREIGN KEY ("product_id") REFERENCES "public"."kilter_products"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tension_climb_cache_fields" ADD CONSTRAINT "climb_cache_fields_climb_uuid_fkey" FOREIGN KEY ("climb_uuid") REFERENCES "public"."tension_climbs"("uuid") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "kilter_leds" ADD CONSTRAINT "leds_hole_id_fkey1" FOREIGN KEY ("hole_id") REFERENCES "public"."kilter_holes"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "kilter_leds" ADD CONSTRAINT "leds_product_size_id_fkey1" FOREIGN KEY ("product_size_id") REFERENCES "public"."kilter_product_sizes"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "kilter_product_sizes" ADD CONSTRAINT "product_sizes_product_id_fkey1" FOREIGN KEY ("product_id") REFERENCES "public"."kilter_products"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "kilter_bids" ADD CONSTRAINT "bids_climb_uuid_fkey1" FOREIGN KEY ("climb_uuid") REFERENCES "public"."kilter_climbs"("uuid") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "kilter_bids" ADD CONSTRAINT "bids_user_id_fkey1" FOREIGN KEY ("user_id") REFERENCES "public"."kilter_users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "kilter_holes" ADD CONSTRAINT "holes_product_id_fkey1" FOREIGN KEY ("product_id") REFERENCES "public"."kilter_products"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "kilter_placement_roles" ADD CONSTRAINT "placement_roles_product_id_fkey1" FOREIGN KEY ("product_id") REFERENCES "public"."kilter_products"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "kilter_placements" ADD CONSTRAINT "placements_default_placement_role_id_fkey1" FOREIGN KEY ("default_placement_role_id") REFERENCES "public"."kilter_placement_roles"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "kilter_placements" ADD CONSTRAINT "placements_hole_id_fkey1" FOREIGN KEY ("hole_id") REFERENCES "public"."kilter_holes"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "kilter_placements" ADD CONSTRAINT "placements_layout_id_fkey1" FOREIGN KEY ("layout_id") REFERENCES "public"."kilter_layouts"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "kilter_placements" ADD CONSTRAINT "placements_set_id_fkey1" FOREIGN KEY ("set_id") REFERENCES "public"."kilter_sets"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "kilter_climbs" ADD CONSTRAINT "climbs_layout_id_fkey1" FOREIGN KEY ("layout_id") REFERENCES "public"."kilter_layouts"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "kilter_product_sizes_layouts_sets" ADD CONSTRAINT "product_sizes_layouts_sets_layout_id_fkey1" FOREIGN KEY ("layout_id") REFERENCES "public"."kilter_layouts"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "kilter_product_sizes_layouts_sets" ADD CONSTRAINT "product_sizes_layouts_sets_product_size_id_fkey1" FOREIGN KEY ("product_size_id") REFERENCES "public"."kilter_product_sizes"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "kilter_product_sizes_layouts_sets" ADD CONSTRAINT "product_sizes_layouts_sets_set_id_fkey1" FOREIGN KEY ("set_id") REFERENCES "public"."kilter_sets"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "kilter_walls" ADD CONSTRAINT "walls_layout_id_fkey1" FOREIGN KEY ("layout_id") REFERENCES "public"."kilter_layouts"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "kilter_walls" ADD CONSTRAINT "walls_product_id_fkey1" FOREIGN KEY ("product_id") REFERENCES "public"."kilter_products"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "kilter_walls" ADD CONSTRAINT "walls_product_size_id_fkey1" FOREIGN KEY ("product_size_id") REFERENCES "public"."kilter_product_sizes"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "kilter_walls" ADD CONSTRAINT "walls_user_id_fkey1" FOREIGN KEY ("user_id") REFERENCES "public"."kilter_users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tension_bids" ADD CONSTRAINT "bids_climb_uuid_fkey" FOREIGN KEY ("climb_uuid") REFERENCES "public"."tension_climbs"("uuid") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tension_bids" ADD CONSTRAINT "bids_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."tension_users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tension_holes" ADD CONSTRAINT "holes_mirrored_hole_id_fkey" FOREIGN KEY ("mirrored_hole_id") REFERENCES "public"."tension_holes"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tension_holes" ADD CONSTRAINT "holes_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."tension_products"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tension_climbs" ADD CONSTRAINT "climbs_layout_id_fkey" FOREIGN KEY ("layout_id") REFERENCES "public"."tension_layouts"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tension_placements" ADD CONSTRAINT "placements_default_placement_role_id_fkey" FOREIGN KEY ("default_placement_role_id") REFERENCES "public"."tension_placement_roles"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tension_placements" ADD CONSTRAINT "placements_hole_id_fkey" FOREIGN KEY ("hole_id") REFERENCES "public"."tension_holes"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tension_placements" ADD CONSTRAINT "placements_layout_id_fkey" FOREIGN KEY ("layout_id") REFERENCES "public"."tension_layouts"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tension_placements" ADD CONSTRAINT "placements_set_id_fkey" FOREIGN KEY ("set_id") REFERENCES "public"."tension_sets"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tension_placement_roles" ADD CONSTRAINT "placement_roles_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."tension_products"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tension_leds" ADD CONSTRAINT "leds_hole_id_fkey" FOREIGN KEY ("hole_id") REFERENCES "public"."tension_holes"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tension_leds" ADD CONSTRAINT "leds_product_size_id_fkey" FOREIGN KEY ("product_size_id") REFERENCES "public"."tension_product_sizes"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tension_layouts" ADD CONSTRAINT "layouts_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."tension_products"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tension_product_sizes_layouts_sets" ADD CONSTRAINT "product_sizes_layouts_sets_layout_id_fkey" FOREIGN KEY ("layout_id") REFERENCES "public"."tension_layouts"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tension_product_sizes_layouts_sets" ADD CONSTRAINT "product_sizes_layouts_sets_product_size_id_fkey" FOREIGN KEY ("product_size_id") REFERENCES "public"."tension_product_sizes"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tension_product_sizes_layouts_sets" ADD CONSTRAINT "product_sizes_layouts_sets_set_id_fkey" FOREIGN KEY ("set_id") REFERENCES "public"."tension_sets"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tension_product_sizes" ADD CONSTRAINT "product_sizes_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."tension_products"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "kilter_ascents" ADD CONSTRAINT "ascents_attempt_id_fkey1" FOREIGN KEY ("attempt_id") REFERENCES "public"."kilter_attempts"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "kilter_ascents" ADD CONSTRAINT "ascents_climb_uuid_fkey1" FOREIGN KEY ("climb_uuid") REFERENCES "public"."kilter_climbs"("uuid") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "kilter_ascents" ADD CONSTRAINT "ascents_difficulty_fkey1" FOREIGN KEY ("difficulty") REFERENCES "public"."kilter_difficulty_grades"("difficulty") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "kilter_ascents" ADD CONSTRAINT "ascents_user_id_fkey1" FOREIGN KEY ("user_id") REFERENCES "public"."kilter_users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tension_walls" ADD CONSTRAINT "walls_layout_id_fkey" FOREIGN KEY ("layout_id") REFERENCES "public"."tension_layouts"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tension_walls" ADD CONSTRAINT "walls_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."tension_products"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tension_walls" ADD CONSTRAINT "walls_product_size_id_fkey" FOREIGN KEY ("product_size_id") REFERENCES "public"."tension_product_sizes"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tension_walls" ADD CONSTRAINT "walls_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."tension_users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tension_ascents" ADD CONSTRAINT "ascents_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "public"."tension_attempts"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tension_ascents" ADD CONSTRAINT "ascents_climb_uuid_fkey" FOREIGN KEY ("climb_uuid") REFERENCES "public"."tension_climbs"("uuid") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tension_ascents" ADD CONSTRAINT "ascents_difficulty_fkey" FOREIGN KEY ("difficulty") REFERENCES "public"."tension_difficulty_grades"("difficulty") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tension_ascents" ADD CONSTRAINT "ascents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."tension_users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "kilter_products_angles" ADD CONSTRAINT "products_angles_product_id_fkey1" FOREIGN KEY ("product_id") REFERENCES "public"."kilter_products"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "kilter_walls_sets" ADD CONSTRAINT "walls_sets_set_id_fkey1" FOREIGN KEY ("set_id") REFERENCES "public"."kilter_sets"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "kilter_walls_sets" ADD CONSTRAINT "walls_sets_wall_uuid_fkey1" FOREIGN KEY ("wall_uuid") REFERENCES "public"."kilter_walls"("uuid") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tension_walls_sets" ADD CONSTRAINT "walls_sets_set_id_fkey" FOREIGN KEY ("set_id") REFERENCES "public"."tension_sets"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tension_walls_sets" ADD CONSTRAINT "walls_sets_wall_uuid_fkey" FOREIGN KEY ("wall_uuid") REFERENCES "public"."tension_walls"("uuid") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tension_products_angles" ADD CONSTRAINT "products_angles_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."tension_products"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "kilter_user_syncs" ADD CONSTRAINT "user_syncs_user_id_fkey1" FOREIGN KEY ("user_id") REFERENCES "public"."kilter_users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tension_user_syncs" ADD CONSTRAINT "user_syncs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."tension_users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "kilter_beta_links" ADD CONSTRAINT "beta_links_climb_uuid_fkey1" FOREIGN KEY ("climb_uuid") REFERENCES "public"."kilter_climbs"("uuid") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "tension_beta_links" ADD CONSTRAINT "beta_links_climb_uuid_fkey" FOREIGN KEY ("climb_uuid") REFERENCES "public"."tension_climbs"("uuid") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_16797_sqlite_autoindex_leds_2" ON "kilter_leds" USING btree ("product_size_id" int4_ops,"position" int4_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_16791_sqlite_autoindex_holes_2" ON "kilter_holes" USING btree ("product_id" text_ops,"name" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_16791_sqlite_autoindex_holes_3" ON "kilter_holes" USING btree ("product_id" int4_ops,"x" int4_ops,"y" int4_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_16904_sqlite_autoindex_placements_2" ON "kilter_placements" USING btree ("layout_id" int4_ops,"hole_id" int4_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_16813_sqlite_autoindex_product_sizes_layouts_sets_2" ON "kilter_product_sizes_layouts_sets" USING btree ("product_size_id" int4_ops,"layout_id" int4_ops,"set_id" int4_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_16405_sqlite_autoindex_holes_2" ON "tension_holes" USING btree ("product_id" text_ops,"name" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_16405_sqlite_autoindex_holes_3" ON "tension_holes" USING btree ("product_id" int4_ops,"x" int4_ops,"y" int4_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_16518_sqlite_autoindex_placements_2" ON "tension_placements" USING btree ("layout_id" int4_ops,"hole_id" int4_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_16411_sqlite_autoindex_leds_2" ON "tension_leds" USING btree ("product_size_id" int4_ops,"position" int4_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_16427_sqlite_autoindex_product_sizes_layouts_sets_2" ON "tension_product_sizes_layouts_sets" USING btree ("product_size_id" int4_ops,"layout_id" int4_ops,"set_id" int4_ops);
*/