CREATE TABLE "kilter_climb_holds" (
    "climb_uuid" text NOT NULL,
    "frame_number" integer NOT NULL DEFAULT 0,
    "hold_id" integer NOT NULL,
    "hold_state" text NOT NULL,
    "created_at" timestamp DEFAULT now(),
    CONSTRAINT "kilter_climb_holds_climb_uuid_frame_number_hold_id_pk" PRIMARY KEY("climb_uuid", "frame_number", "hold_id")
);
--> statement-breakpoint
CREATE TABLE "tension_climb_holds" (
    "climb_uuid" text NOT NULL,
    "frame_number" integer NOT NULL DEFAULT 0,
    "hold_id" integer NOT NULL,
    "hold_state" text NOT NULL,
    "created_at" timestamp DEFAULT now(),
    CONSTRAINT "tension_climb_holds_climb_uuid_frame_number_hold_id_pk" PRIMARY KEY("climb_uuid", "frame_number", "hold_id")
);
--> statement-breakpoint
ALTER TABLE "kilter_climb_holds" ADD CONSTRAINT "kilter_climb_holds_climb_uuid_fkey" FOREIGN KEY ("climb_uuid") REFERENCES "public"."kilter_climbs"("uuid") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
ALTER TABLE "tension_climb_holds" ADD CONSTRAINT "tension_climb_holds_climb_uuid_fkey" FOREIGN KEY ("climb_uuid") REFERENCES "public"."tension_climbs"("uuid") ON DELETE cascade ON UPDATE cascade;
--> statement-breakpoint
CREATE INDEX "kilter_climb_holds_search_idx" ON "kilter_climb_holds" USING btree ("hold_id", "hold_state");
--> statement-breakpoint
CREATE INDEX "tension_climb_holds_search_idx" ON "tension_climb_holds" USING btree ("hold_id", "hold_state");
--> statement-breakpoint
INSERT INTO "kilter_climb_holds" ("climb_uuid", "frame_number", "hold_id", "hold_state")
WITH parsed_holds AS (
    SELECT 
        "uuid" as "climb_uuid",
        CASE WHEN "frames_count" = 1 THEN 0
             ELSE (array_position(regexp_split_to_array("frames", ','), frame_part) - 1)
        END as "frame_number",
        SUBSTRING(hold_data, '(\d+)[rx]')::INTEGER as "hold_id",
        CASE 
            WHEN hold_data ~ 'x\d+$' THEN 'OFF'
            ELSE 
                CASE SUBSTRING(hold_data, 'r(\d+)')::INTEGER
                    WHEN 12 THEN 'STARTING'
                    WHEN 13 THEN 'HAND'
                    WHEN 14 THEN 'FINISH'
                    WHEN 15 THEN 'FOOT'
                    WHEN 42 THEN 'STARTING'
                    WHEN 43 THEN 'HAND'
                    WHEN 44 THEN 'FINISH'
                    WHEN 45 THEN 'FOOT'
                END
        END as "hold_state",
        -- Add priority (r patterns take precedence over x)
        CASE WHEN hold_data ~ 'r\d+$' THEN 0 ELSE 1 END as priority
    FROM kilter_climbs,
        regexp_split_to_table("frames", ',') WITH ORDINALITY as f(frame_part, frame_ord),
        regexp_split_to_table(frame_part, 'p') WITH ORDINALITY as t(hold_data, ord)
    WHERE hold_data != ''
    AND hold_data != '""'
    AND (
        hold_data ~ '^\d+r(12|13|14|15|42|43|44|45)$'
        OR hold_data ~ '^\d+x\d+$'
    )
    AND layout_id IN (1, 8)
)
SELECT DISTINCT ON (climb_uuid, frame_number, hold_id)
    climb_uuid,
    frame_number,
    hold_id,
    hold_state
FROM parsed_holds
ORDER BY climb_uuid, frame_number, hold_id, priority;


--> statement-breakpoint
INSERT INTO "tension_climb_holds" ("climb_uuid", "frame_number", "hold_id", "hold_state")
WITH parsed_holds AS (
    SELECT 
        "uuid" as "climb_uuid",
        CASE 
            WHEN "frames_count" = 1 THEN 0
            ELSE (array_position(regexp_split_to_array("frames", ','), frame_part) - 1)
        END as "frame_number",
        SUBSTRING(hold_data, '^(\d+)r')::INTEGER as "hold_id",
        CASE 
            WHEN hold_data ~ 'r\d+$' THEN 
                CASE SUBSTRING(hold_data, 'r(\d+)$')::INTEGER
                    WHEN 1 THEN 'STARTING'
                    WHEN 2 THEN 'HAND'
                    WHEN 3 THEN 'FINISH'
                    WHEN 4 THEN 'FOOT'
                    WHEN 5 THEN 'STARTING'
                    WHEN 6 THEN 'HAND'     
                    WHEN 7 THEN 'FINISH'   
                    WHEN 8 THEN 'FOOT'     
                    ELSE 'UNKNOWN'
                END
            ELSE 'UNKNOWN'
        END as "hold_state",
        CASE WHEN hold_data ~ 'r\d+$' THEN 0 ELSE 1 END as priority
    FROM tension_climbs,
        regexp_split_to_table("frames", ',') WITH ORDINALITY as f(frame_part, frame_ord),
        regexp_split_to_table(frame_part, 'p') as t(hold_data)
    WHERE hold_data != ''
    AND hold_data != '""'
)
SELECT DISTINCT ON (climb_uuid, frame_number, hold_id)
    climb_uuid,
    frame_number,
    hold_id,
    hold_state
FROM parsed_holds
WHERE hold_id IS NOT NULL
ORDER BY climb_uuid, frame_number, hold_id, priority;


